-- Server-authoritative editor documents
CREATE TABLE IF NOT EXISTS editor_documents (
  room_code   TEXT NOT NULL,
  editor_id   INTEGER NOT NULL,
  content     TEXT NOT NULL DEFAULT '',
  revision    INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_code, editor_id)
);

-- Index for efficient room cleanup
CREATE INDEX IF NOT EXISTS idx_editor_documents_room
ON editor_documents(room_code);
