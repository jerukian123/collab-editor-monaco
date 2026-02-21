# Server-Authoritative Editor with Operational Transform

**Date:** 2026-02-22
**Status:** Approved
**Goal:** Make the server the authoritative source of editor content using Operational Transform (OT) for conflict resolution, with PostgreSQL persistence for crash recovery.

---

## Problem Statement

The current architecture is client-authoritative:
- Clients send full document content via `send_code`
- Server blindly relays content to other clients
- No canonical server-side state
- Late joiners see empty editors (content not persisted)
- Concurrent edits use last-write-wins (no real conflict resolution)
- No crash recovery (content lost on server restart)

## Goals

1. **Late joiner support** — New users joining a room see current document content
2. **Conflict resolution** — Concurrent edits from multiple users merge correctly via OT
3. **Persistence** — Document content survives server restarts
4. **Crash recovery** — PostgreSQL as durable storage

---

## Architecture Overview

### Approach: Operational Transform (OT)

Replace full-document synchronization with **operation-based synchronization**:
- Clients send individual edit operations (insert/delete/retain)
- Server maintains canonical document state and revision counter
- Server transforms concurrent operations to preserve user intent
- PostgreSQL stores the canonical state

---

## Section 1: Data Model

### Server In-Memory (per room, per editor)

```javascript
rooms[roomCode].editorDocs[editorId] = {
  content: string,         // canonical document text
  revision: number,        // monotonically increasing, starts at 0
  history: Operation[][]   // last 100 operations for debugging (optional)
}
```

### PostgreSQL Schema

```sql
CREATE TABLE editor_documents (
  room_code   TEXT NOT NULL,
  editor_id   INTEGER NOT NULL,
  content     TEXT NOT NULL DEFAULT '',
  revision    INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_code, editor_id)
);

CREATE INDEX idx_editor_documents_room ON editor_documents(room_code);
```

### Lifecycle

- **Room creation:** Insert row for each default editor
- **Add editor:** Insert new row
- **Remove editor:** Delete row
- **Server restart:** Load all rows for a room on first `join_room`
- **Room expiry:** Delete all rows for `room_code`

---

## Section 2: Operational Transform Operations

### Operation Format

```typescript
type Operation =
  | { type: 'retain', count: number }  // skip N characters
  | { type: 'insert', text: string }   // insert text at cursor
  | { type: 'delete', count: number }  // delete N characters at cursor
```

An operation is an array of these primitives.

### Examples

**Change "hello" → "hi there":**
```javascript
[
  { type: 'delete', count: 5 },
  { type: 'insert', text: 'hi there' }
]
```

**Change "hello" → "hallo":**
```javascript
[
  { type: 'retain', count: 1 },   // skip 'h'
  { type: 'delete', count: 1 },   // delete 'e'
  { type: 'insert', text: 'a' },  // insert 'a'
  { type: 'retain', count: 3 }    // skip 'llo'
]
```

### Socket Events

**Client → Server:**
```javascript
socket.emit('send_operation', {
  editorId: number,
  operation: Operation[],
  baseRevision: number  // revision this op was created against
})
```

**Server → Client:**
```javascript
socket.emit('receive_operation', {
  editorId: number,
  operation: Operation[],
  revision: number,         // new revision after applying
  authorSocketId: string
})
```

---

## Section 3: OT Transform Algorithm

### Core Function

```javascript
function transform(op1, op2) {
  // Given:
  //   - op1 was created against a document
  //   - op2 was applied to that document first
  // Return: op1' adjusted so it has the same intent

  // Key rules:
  // - If op2 inserts before op1's position → shift op1 forward
  // - If op2 deletes before op1's position → shift op1 backward
  // - If both insert at same position → tie-break (prefer op2)
  // - Retain operations advance cursors
}
```

This is a well-defined ~50-100 line function from OT literature.

### Server Operation Flow

When receiving `send_operation`:

1. Check `baseRevision` against current `revision`
2. If `baseRevision === revision` → apply directly
3. If `baseRevision < revision`:
   - Transform incoming op against all ops from `baseRevision+1` to `revision`
   - Apply transformed op
4. Apply to `content`, increment `revision`
5. `scheduleWrite(roomCode, editorId, content, revision)` (debounced PostgreSQL save)
6. Broadcast `receive_operation` to all clients in editor room

---

## Section 4: Client-Side Integration

### Converting Monaco Changes to Operations

Monaco's `onDidChangeModelContent` provides `IModelContentChangedEvent`:

```javascript
function monacoChangesToOp(changes, documentLength) {
  const ops = []
  let cursor = 0

  for (const change of changes) {
    const offset = change.rangeOffset

    // Retain up to change position
    if (offset > cursor) {
      ops.push({ type: 'retain', count: offset - cursor })
      cursor = offset
    }

    // Delete old content
    if (change.rangeLength > 0) {
      ops.push({ type: 'delete', count: change.rangeLength })
    }

    // Insert new content
    if (change.text) {
      ops.push({ type: 'insert', text: change.text })
      cursor += change.text.length
    }
  }

  // Retain rest of document
  if (cursor < documentLength) {
    ops.push({ type: 'retain', count: documentLength - cursor })
  }

  return ops
}
```

### Client State Tracking

```javascript
{
  currentRevision: number,      // last acknowledged revision
  pendingOps: Operation[][],    // sent but not acknowledged
  bufferedOps: Operation[][]    // created while waiting for ack
}
```

When acknowledgment arrives, shift `pendingOps` and send `bufferedOps`.

### Applying Remote Operations to Monaco

```javascript
function applyOpToMonaco(operation, editor) {
  let cursor = 0
  const edits = []

  for (const op of operation) {
    if (op.type === 'retain') {
      cursor += op.count
    } else if (op.type === 'insert') {
      const position = editor.getModel().getPositionAt(cursor)
      edits.push({
        range: new monaco.Range(position.lineNumber, position.column,
                                position.lineNumber, position.column),
        text: op.text
      })
      cursor += op.text.length
    } else if (op.type === 'delete') {
      const startPos = editor.getModel().getPositionAt(cursor)
      const endPos = editor.getModel().getPositionAt(cursor + op.count)
      edits.push({
        range: new monaco.Range(startPos.lineNumber, startPos.column,
                                endPos.lineNumber, endPos.column),
        text: ''
      })
    }
  }

  editor.executeEdits('remote-operation', edits)
}
```

---

## Section 5: PostgreSQL Integration

### Database Operations

**Initialize room editors:**
```javascript
async function initializeRoomEditors(roomCode, editors) {
  for (const editor of editors) {
    await db.query(
      'INSERT INTO editor_documents (room_code, editor_id, content, revision) VALUES ($1, $2, $3, $4)',
      [roomCode, editor.id, '', 0]
    )
  }
}
```

**Save editor state (debounced):**
```javascript
async function saveEditorState(roomCode, editorId, content, revision) {
  await db.query(
    'UPDATE editor_documents SET content = $1, revision = $2, updated_at = NOW() WHERE room_code = $3 AND editor_id = $4',
    [content, revision, roomCode, editorId]
  )
}
```

**Load room editors (on join or server restart):**
```javascript
async function loadRoomEditors(roomCode) {
  const result = await db.query(
    'SELECT editor_id, content, revision FROM editor_documents WHERE room_code = $1',
    [roomCode]
  )
  return result.rows
}
```

**Add/remove editor:**
```javascript
async function addEditorDocument(roomCode, editorId) {
  await db.query(
    'INSERT INTO editor_documents (room_code, editor_id, content, revision) VALUES ($1, $2, $3, $4)',
    [roomCode, editorId, '', 0]
  )
}

async function removeEditorDocument(roomCode, editorId) {
  await db.query(
    'DELETE FROM editor_documents WHERE room_code = $1 AND editor_id = $2',
    [roomCode, editorId]
  )
}
```

**Room cleanup:**
```javascript
async function cleanupRoom(roomCode) {
  await db.query(
    'DELETE FROM editor_documents WHERE room_code = $1',
    [roomCode]
  )
}
```

### Debounced Writes

```javascript
const pendingWrites = new Map() // key: `${roomCode}-${editorId}`

function scheduleWrite(roomCode, editorId, content, revision) {
  const key = `${roomCode}-${editorId}`

  if (pendingWrites.has(key)) {
    clearTimeout(pendingWrites.get(key).timer)
  }

  const timer = setTimeout(async () => {
    await saveEditorState(roomCode, editorId, content, revision)
    pendingWrites.delete(key)
  }, 2000)

  pendingWrites.set(key, { timer, content, revision })
}
```

---

## Section 6: Error Handling & Edge Cases

### Revision Mismatch

- If `baseRevision` too far behind (> 100 revisions), reject and force full sync
- Client emits `request_sync` → server responds with `editor_synced { content, revision }`

### Network Interruptions

- Client tracks `pendingOps` and retransmits on reconnect
- Server deduplicates using operation IDs: `${socketId}-${timestamp}`
- On reconnect, client compares `currentRevision` with server

### Concurrent Operations from Same Client

- Client buffers operations while waiting for acknowledgment
- Send next operation only after receiving acknowledgment

### Race Conditions

- PostgreSQL insert must complete before broadcasting `room_created`
- Use `await` on database operations during room creation/join

### PostgreSQL Failures

- If write fails, still apply in-memory and broadcast
- Log error and retry asynchronously
- On server restart, load state from database

### Late Joiner Flow

1. Client emits `join_editor(editorId)`
2. Server checks if `editorDocs[editorId]` exists in memory
3. If not, load from PostgreSQL
4. Emit `editor_synced { editorId, content, revision }`
5. Client initializes Monaco with this content and revision

---

## Section 7: Data Flow Examples

### Normal Operation

```
Client A types "hello"
  ↓
Monaco onDidChangeModelContent fires
  ↓
Convert to operation: [{ type: 'insert', text: 'hello' }]
  ↓
emit('send_operation', { editorId, operation, baseRevision: 5 })
  ↓
Server receives (baseRevision 5 === currentRevision 5)
  ↓
Apply op to content, increment revision to 6
  ↓
scheduleWrite(roomCode, editorId, content, 6)
  ↓
Broadcast: emit('receive_operation', { operation, revision: 6, authorSocketId })
  ↓
Client B receives and applies via executeEdits
  ↓
Update currentRevision to 6
```

### Concurrent Edits

```
Initial: "abc" at revision 10

Client A: insert "x" at position 0 → baseRevision: 10
Client B: insert "y" at position 3 → baseRevision: 10

Server receives A first:
  - Apply: "xabc", revision: 11
  - Broadcast to B

Server receives B (baseRevision: 10, current: 11):
  - Transform B against A
  - B's insert at position 3 → adjusted to position 4
  - Apply: "xabcy", revision: 12
  - Broadcast to A

Converged state: "xabcy"
```

### Late Joiner

```
User joins room with existing content
  ↓
emit('join_room', { username, color, roomCode })
  ↓
Server: room.users.set(socket.id, ...)
  ↓
emit('room_joined', { editors, users })
  ↓
Client creates MonacoEditor components
  ↓
emit('join_editor', editorId)
  ↓
Server: load from PostgreSQL if not in memory
  ↓
emit('editor_synced', { editorId, content, revision })
  ↓
Client sets Monaco value and currentRevision
```

---

## Section 8: Migration Path

### Implementation Steps

1. **Database migration** — Create `editor_documents` table
2. **Extend server data model** — Add `editorDocs` map to rooms
3. **Implement OT transform** — Unit test in isolation
4. **Add operation handlers** — `send_operation` / `receive_operation` events
5. **Update client** — Convert Monaco changes to operations
6. **Add sync mechanism** — `request_sync` / `editor_synced` events
7. **Backward compatibility** — Keep `send_code` temporarily, deprecate after migration

### Testing Strategy

**Unit tests:**
- OT transform with known input/output pairs
  - Insert vs insert at same position
  - Insert vs delete overlapping
  - Delete vs delete same range
  - Complex multi-operation scenarios

**Integration tests:**
- Two clients typing simultaneously → converged state
- Client disconnect/reconnect → correct sync
- Late joiner receives current content
- Server restart → state restored from PostgreSQL

**Manual testing:**
- Create room, add content, refresh browser → content persists
- Two users typing same line simultaneously → no overwrites
- User joins 5 minutes late → sees current content

---

## Section 9: Performance Considerations

### Database Write Optimization

- Debounce writes: 2 seconds of inactivity or every N operations
- Async writes don't block operation broadcasting
- Batch multiple editor updates in single transaction

### Memory Bounds

- Store only last 100 operations in history
- Force full sync for clients > 100 revisions behind

### Socket.IO Optimization

- Operations are smaller than full documents
- Consider gzip compression for large insert operations
- Limit single operation size (e.g., 1MB)

### Indexing

- Index on `room_code` for efficient cleanup queries

---

## Conclusion

This design transforms the collaborative editor from client-authoritative to server-authoritative using Operational Transform for correct concurrent editing, with PostgreSQL persistence for durability. The migration path preserves existing Socket.IO infrastructure while adding robust conflict resolution and crash recovery.
