const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'collab_editor',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Initialize schema
async function initializeDatabase() {
  const fs = require('fs');
  const path = require('path');
  const schemaSQL = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

  try {
    await pool.query(schemaSQL);
    console.log('[Database] Schema initialized successfully');
  } catch (error) {
    console.error('[Database] Schema initialization failed:', error);
    throw error;
  }
}

// Editor document operations
async function initializeRoomEditors(roomCode, editors) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const editor of editors) {
      await client.query(
        'INSERT INTO editor_documents (room_code, editor_id, content, revision) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
        [roomCode, editor.id, '', 0]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function loadRoomEditors(roomCode) {
  const result = await pool.query(
    'SELECT editor_id, content, revision FROM editor_documents WHERE room_code = $1',
    [roomCode]
  );
  return result.rows;
}

async function saveEditorState(roomCode, editorId, content, revision) {
  await pool.query(
    'UPDATE editor_documents SET content = $1, revision = $2, updated_at = NOW() WHERE room_code = $3 AND editor_id = $4',
    [content, revision, roomCode, editorId]
  );
}

async function addEditorDocument(roomCode, editorId) {
  await pool.query(
    'INSERT INTO editor_documents (room_code, editor_id, content, revision) VALUES ($1, $2, $3, $4)',
    [roomCode, editorId, '', 0]
  );
}

async function removeEditorDocument(roomCode, editorId) {
  await pool.query(
    'DELETE FROM editor_documents WHERE room_code = $1 AND editor_id = $2',
    [roomCode, editorId]
  );
}

async function cleanupRoom(roomCode) {
  await pool.query(
    'DELETE FROM editor_documents WHERE room_code = $1',
    [roomCode]
  );
}

module.exports = {
  pool,
  initializeDatabase,
  initializeRoomEditors,
  loadRoomEditors,
  saveEditorState,
  addEditorDocument,
  removeEditorDocument,
  cleanupRoom
};
