# Operational Transform System Architecture

## Overview

This collaborative editor uses Operational Transform (OT) to enable real-time collaborative editing with server-authoritative content and conflict resolution.

## Components

### Server Components

**`server/database/`**
- `schema.sql` - PostgreSQL schema for editor_documents table
- `index.js` - Database connection pool and CRUD operations

**`server/ot/`**
- `operations.js` - Operation types and utility functions
- `transform.js` - Core OT transform algorithm
- `__tests__/transform.test.js` - Transform test suite

**`server/services/documentService.js`**
- In-memory document state management
- Operation application and transformation
- Debounced database writes

### Client Components

**`client_/src/composables/useOperationalTransform.ts`**
- Monaco-to-OT operation conversion
- Remote operation application to Monaco
- Revision tracking

**`client_/src/components/MonacoEditor.vue`**
- Socket event handlers for operations
- Integration with OT composable

## Data Flow

### Normal Operation
```
Client types → Monaco event → Convert to OT op → emit(send_operation)
  ↓
Server receives → Transform against concurrent ops → Apply to canonical doc
  ↓
Increment revision → Schedule DB write → Broadcast to all clients
  ↓
Clients receive → Apply via executeEdits → Update revision
```

### Late Joiner
```
Client joins room → emit(join_editor)
  ↓
Server sends editor_synced { content, revision }
  ↓
Client sets editor value and revision
```

## Operation Format

Operations are arrays of:
- `{ type: 'retain', count: N }` - Skip N characters
- `{ type: 'insert', text: 'xyz' }` - Insert text
- `{ type: 'delete', count: N }` - Delete N characters

Example: Change "hello" to "hi there"
```javascript
[
  { type: 'delete', count: 5 },
  { type: 'insert', text: 'hi there' }
]
```

## Transform Algorithm

`transform(op1, op2)` adjusts op1 assuming op2 was applied first:

- **Insert vs Insert** - Tie-break by side preference
- **Insert vs Delete** - Adjust insert position if delete is before it
- **Delete vs Delete** - Reduce delete count if ranges overlap
- **Retain vs any** - Advance cursors

See `server/ot/transform.js` for full implementation.

## Database Schema

```sql
CREATE TABLE editor_documents (
  room_code   TEXT NOT NULL,
  editor_id   INTEGER NOT NULL,
  content     TEXT NOT NULL DEFAULT '',
  revision    INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_code, editor_id)
);
```

## Performance Optimizations

1. **Debounced Writes** - Database writes occur 2 seconds after last operation
2. **Operation History** - Only last 100 operations kept in memory
3. **Forced Sync** - Clients >100 revisions behind request full sync
4. **Compaction** - Consecutive operations of same type are merged

## Error Handling

- **Revision mismatch** - Transform or force sync
- **Database failure** - Log error, retry async, keep in-memory state
- **Network interruption** - Clients request sync on reconnect
- **Room expiry** - PostgreSQL cleanup after 30 minutes of inactivity

## Testing

**Unit tests:** `server/ot/__tests__/transform.test.js`
**Integration tests:** `docs/testing/ot-integration-test.md`

## Future Improvements

- [ ] Compress large operations with gzip
- [ ] Add operation acknowledgment IDs for deduplication
- [ ] Implement multi-server support with Redis pub/sub
- [ ] Add full operation history for time-travel debugging
