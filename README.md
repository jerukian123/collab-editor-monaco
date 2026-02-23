# Collaborative Code Editor with Monaco

A real-time collaborative code editor built with Monaco Editor, Vue 3, Socket.IO, and PostgreSQL.

## Features

- **Real-time Collaboration** - Multiple users can edit the same document simultaneously
- **Operational Transform** - Conflict-free concurrent editing with server-authoritative state
- **Persistent Storage** - Document content persists in PostgreSQL across server restarts
- **Late Joiner Support** - New users joining a room see the current document state
- **Code Execution** - Run code in multiple languages via Piston API
- **Remote Cursors** - See where other users are typing
- **Room System** - Create or join rooms with 6-character codes

## Architecture

This editor uses Operational Transform (OT) for collaborative editing:
- Client sends edit **operations** (insert/delete/retain) instead of full document
- Server maintains canonical state and transforms concurrent operations
- PostgreSQL stores document state for crash recovery
- See `docs/architecture/ot-system.md` for details

## Prerequisites

- Node.js 18+
- PostgreSQL 14+

## Setup

### Database Setup

```bash
# Create database
createdb collab_editor

# Or via psql
psql -U postgres -c "CREATE DATABASE collab_editor;"
```

### Server Setup

```bash
cd server
npm install
npm start
```

Server runs on `http://localhost:3000`

### Client Setup

```bash
cd client_
npm install
npm run dev
```

Client runs on `http://localhost:5173`

## Environment Variables

Create `server/.env`:

```
DB_USER=postgres
DB_HOST=localhost
DB_NAME=collab_editor
DB_PASSWORD=postgres
DB_PORT=5432
```

## Testing

### Unit Tests

```bash
cd server
npm test
```

### Integration Tests

See `docs/testing/ot-integration-test.md` for manual test scenarios.

## Project Structure

```
├── server/
│   ├── database/          # PostgreSQL schema and connection
│   ├── ot/                # Operational Transform implementation
│   ├── services/          # Document and execution services
│   └── index.js           # Socket.IO server
├── client_/
│   ├── src/
│   │   ├── components/    # Vue components
│   │   ├── composables/   # Vue composables (OT, Socket, Editor)
│   │   └── types/         # TypeScript types
│   └── ...
└── docs/
    ├── architecture/      # System architecture docs
    ├── plans/             # Design documents
    └── testing/           # Test plans
```

## Contributing

1. Read the design doc: `docs/plans/2026-02-22-server-authoritative-design.md`
2. Understand OT: `docs/architecture/ot-system.md`
3. Run tests before submitting PR

## License

MIT
