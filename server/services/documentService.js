const { transform } = require('../ot/transform');
const { applyOperation } = require('../ot/operations');
const db = require('../database');

// In-memory document state per room
// rooms[roomCode].editorDocs[editorId] = { content, revision, history }
const pendingWrites = new Map(); // key: `${roomCode}-${editorId}`

/**
 * Initialize editor documents for a room
 */
async function initializeEditorDocs(roomCode, editors) {
  const editorDocs = {};

  for (const editor of editors) {
    editorDocs[editor.id] = {
      content: '',
      revision: 0,
      history: [] // Store last 100 operations
    };
  }

  // Persist to database
  await db.initializeRoomEditors(roomCode, editors);

  return editorDocs;
}

/**
 * Load editor documents from database (for reconnection/server restart)
 */
async function loadEditorDocs(roomCode) {
  const rows = await db.loadRoomEditors(roomCode);
  const editorDocs = {};

  for (const row of rows) {
    editorDocs[row.editor_id] = {
      content: row.content,
      revision: row.revision,
      history: []
    };
  }

  return editorDocs;
}

/**
 * Apply an operation to a document
 */
function applyOperationToDoc(editorDoc, operation, baseRevision) {
  // If operation is at current revision, apply directly
  if (baseRevision === editorDoc.revision) {
    const newContent = applyOperation(editorDoc.content, operation);
    editorDoc.content = newContent;
    editorDoc.revision++;

    // Store in history (keep last 100)
    editorDoc.history.push(operation);
    if (editorDoc.history.length > 100) {
      editorDoc.history.shift();
    }

    return { transformedOp: operation, newRevision: editorDoc.revision };
  }

  // If operation is behind, need to transform against newer operations
  if (baseRevision < editorDoc.revision) {
    const opsToTransformAgainst = editorDoc.history.slice(
      baseRevision - (editorDoc.revision - editorDoc.history.length),
      editorDoc.history.length
    );

    let transformedOp = operation;
    for (const historicalOp of opsToTransformAgainst) {
      transformedOp = transform(transformedOp, historicalOp, 'left');
    }

    const newContent = applyOperation(editorDoc.content, transformedOp);
    editorDoc.content = newContent;
    editorDoc.revision++;

    editorDoc.history.push(transformedOp);
    if (editorDoc.history.length > 100) {
      editorDoc.history.shift();
    }

    return { transformedOp, newRevision: editorDoc.revision };
  }

  // Operation is from the future - should not happen
  throw new Error(`Operation from future: baseRevision ${baseRevision} > current ${editorDoc.revision}`);
}

/**
 * Schedule a debounced write to database
 */
function scheduleWrite(roomCode, editorId, content, revision) {
  const key = `${roomCode}-${editorId}`;

  if (pendingWrites.has(key)) {
    clearTimeout(pendingWrites.get(key).timer);
  }

  const timer = setTimeout(async () => {
    try {
      await db.saveEditorState(roomCode, editorId, content, revision);
      console.log(`[DocumentService] Saved ${roomCode}/${editorId} rev ${revision}`);
    } catch (error) {
      console.error(`[DocumentService] Failed to save ${roomCode}/${editorId}:`, error);
    } finally {
      pendingWrites.delete(key);
    }
  }, 2000); // 2 second debounce

  pendingWrites.set(key, { timer, content, revision });
}

/**
 * Force flush all pending writes (for shutdown)
 */
async function flushPendingWrites() {
  const writes = [];
  for (const [key, value] of pendingWrites.entries()) {
    const [roomCode, editorId] = key.split('-');
    writes.push({ roomCode, editorId, ...value });
  }
  pendingWrites.clear();

  for (const write of writes) {
    clearTimeout(write.timer);
  }

  await Promise.all(writes.map(w =>
    db.saveEditorState(w.roomCode, w.editorId, w.content, w.revision)
  ));
}

module.exports = {
  initializeEditorDocs,
  loadEditorDocs,
  applyOperationToDoc,
  scheduleWrite,
  flushPendingWrites
};
