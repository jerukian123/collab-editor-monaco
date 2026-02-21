const express = require("express");
const app = express();
const cors = require("cors");
const http = require("http");
const { executeCode, getSupportedLanguages } = require('./services/executionService');
const documentService = require('./services/documentService');
const db = require('./database');

app.use(cors());

const server = http.createServer(app);

const { Server } = require("socket.io");

const port = 3000;

// Initialize database on startup
db.initializeDatabase().catch(err => {
  console.error('[Server] Failed to initialize database:', err);
  process.exit(1);
});

const rooms = new Map();
const socketToRoom = new Map();

// TODO: Add generateRoomCode() helper — 6 chars from 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', collision-checked against `rooms`

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
})

function generateRoomCode(){
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    do {
        code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    } while (rooms.has(code));
    return code;
}

io.on("connection", (socket) => {
    console.log(`[${new Date().toISOString()}] User connected: ${socket.id}`);
    socket.emit("connected", socket.id);

    socket.on("create_room", async ({ username, color }) => {
        try {
            const roomCode = generateRoomCode();
            const defaultEditors = [{ id: 1, name: 'main.js', language: 'javascript' }];

            // Initialize editor documents with database persistence
            const editorDocs = await documentService.initializeEditorDocs(roomCode, defaultEditors);

            const roomData = {
                editors: [...defaultEditors],
                nextEditorId: 2,
                users: new Map([[socket.id, { username, color }]]),
                hostId: socket.id,
                expiryTimer: null,
                editorDocs: editorDocs // NEW: server-authoritative state
            };

            const room = rooms.set(roomCode, roomData).get(roomCode);
            socketToRoom.set(socket.id, roomCode);
            socket.join(roomCode);
            socket.emit("room_created", {
                roomCode,
                editors: room.editors,
                users: Array.from(room.users.entries()).map(([id, info]) => ({ socketId: id, ...info })),
                isHost: true
            });
        } catch (error) {
            console.error('[create_room] Error:', error);
            socket.emit("room_error", { message: 'Failed to create room' });
        }
    });

    socket.on("join_room", async ({ username, color, roomCode }) => {
        try {
            if (!rooms.has(roomCode)) {
                socket.emit("room_error", { message: 'Room not found' });
                return;
            }

            const room = rooms.get(roomCode);

            // Load editor documents if not in memory (server restart scenario)
            if (!room.editorDocs) {
                room.editorDocs = await documentService.loadEditorDocs(roomCode);
            }

            room.users.set(socket.id, { username, color });
            socketToRoom.set(socket.id, roomCode);
            socket.join(roomCode);

            socket.emit("room_joined", {
                roomCode,
                editors: room.editors,
                users: Array.from(room.users.entries()).map(([id, info]) => ({ socketId: id, ...info }))
            });
            socket.to(roomCode).emit("user_joined", { socketId: socket.id, username, color });
        } catch (error) {
            console.error('[join_room] Error:', error);
            socket.emit("room_error", { message: 'Failed to join room' });
        }
    });


    // TODO: Add kick_user handler ({ targetSocketId }):
    // - Guard: socket.id must equal room.hostId
    // - Emit kicked { message: 'You were kicked from the room' } to targetSocketId
    // - io.sockets.sockets.get(targetSocketId)?.leave(roomCode)
    // - Remove from room.users and socketToRoom
    // - Broadcast user_left { socketId: targetSocketId } to room

    socket.on("kick_user", ({ targetSocketId }) => {
        const roomCode = socketToRoom.get(socket.id);
        const room = rooms.get(roomCode);
        if(socket.id !== room.hostId){
            socket.emit("room_error", { message: 'Only the host can kick users' });
            return;
        }

        io.to(targetSocketId).emit("kicked", { message: 'You were kicked from the room' });
        io.sockets.sockets.get(targetSocketId)?.leave(roomCode);
        room.users.delete(targetSocketId);
        socketToRoom.delete(targetSocketId);
        io.to(roomCode).emit("user_left", { socketId: targetSocketId });
    });

    // TODO: Add close_room handler (no payload):
    // - Guard: socket.id must equal room.hostId
    // - Broadcast room_closed { message: 'Host closed the room' } to room
    // - clearTimeout(room.expiryTimer); remove all users from socketToRoom; rooms.delete(roomCode)

    socket.on("close_room", () => {
        const roomCode = socketToRoom.get(socket.id);
        const room = rooms.get(roomCode);
        if(socket.id !== room.hostId){
            socket.emit("room_error", { message: 'Only the host can close the room' });
            return;
        }

        io.to(roomCode).emit("room_closed", { message: 'Host closed the room' });
        clearTimeout(room.expiryTimer);
        room.users.forEach((_, socketId) => socketToRoom.delete(socketId));
        rooms.delete(roomCode);
    });

    socket.on("add_editor", async (editor) => {
        const roomCode = socketToRoom.get(socket.id);
        if (!roomCode) {
            socket.emit("room_error", { message: 'You are not in a room' });
            return;
        }

        const room = rooms.get(roomCode);
        const newEditor = {
            id: room.nextEditorId++,
            name: editor.name,
            language: editor.language
        };

        room.editors.push(newEditor);

        // Initialize document state
        room.editorDocs[newEditor.id] = {
            content: '',
            revision: 0,
            history: []
        };

        try {
            await db.addEditorDocument(roomCode, newEditor.id);
        } catch (error) {
            console.error('[add_editor] Database error:', error);
        }

        console.log(`[${new Date().toISOString()}] Added editor:`, newEditor.id);
        io.to(roomCode).emit("editor_added", newEditor);
    });
    
    socket.on("remove_editor", async (editorId) => {
        const roomCode = socketToRoom.get(socket.id);
        if (!roomCode) {
            socket.emit("room_error", { message: 'You are not in a room' });
            return;
        }

        const room = rooms.get(roomCode);
        const index = room.editors.findIndex(e => e.id === editorId);

        if (index !== -1 && room.editors.length > 1) {
            room.editors.splice(index, 1);
            delete room.editorDocs[editorId];

            try {
                await db.removeEditorDocument(roomCode, editorId);
            } catch (error) {
                console.error('[remove_editor] Database error:', error);
            }

            io.to(roomCode).emit("editor_removed", editorId);
        }
    });
    
    socket.on("join_editor", async (editorId) => {
        const roomCode = socketToRoom.get(socket.id);
        if (!roomCode) {
            socket.emit("room_error", { message: 'You are not in a room' });
            return;
        }

        const room = `${roomCode}-editor-${editorId}`;
        socket.join(room);

        // Send current document state to joining client
        const roomData = rooms.get(roomCode);
        if (roomData?.editorDocs[editorId]) {
            const editorDoc = roomData.editorDocs[editorId];
            socket.emit("editor_synced", {
                editorId,
                content: editorDoc.content,
                revision: editorDoc.revision
            });
        }
    });
    
    // Leave a specific editor room
    // TODO: Refactor — get roomCode via socketToRoom.get(socket.id), guard if no room,
    // use scoped editor room key `${roomCode}-editor-${editorId}` for leave and broadcast
    socket.on("leave_editor", (editorId) => {
        const roomCode = socketToRoom.get(socket.id);
        if (!roomCode) {
            socket.emit("room_error", { message: 'You are not in a room' });
            return;
        }
        const room = `${roomCode}-editor-${editorId}`;

        socket.leave(room);
    });

    socket.on("disconnect", () => {
        console.log(`[${new Date().toISOString()}] User disconnected: ${socket.id}`);
        // TODO: Refactor disconnect handler:
        const roomCode = socketToRoom.get(socket.id);
        if (!roomCode) {
            return; // User was not in a room
        }
        const room = rooms.get(roomCode);
        if (!room) {
            socketToRoom.delete(socket.id);
            return; // Room not found (shouldn't happen)
        }

        room.users.delete(socket.id);
        socketToRoom.delete(socket.id);

        if (socket.id === room.hostId) {
            // Host left, transfer host role
            const nextUser = room.users.keys().next().value;
            if (nextUser) {
                room.hostId = nextUser;
                io.to(roomCode).emit("host_transferred", { newHostId: nextUser });
            }
        }

        if (room.users.size === 0) {
            room.expiryTimer = setTimeout(async () => {
                try {
                    await db.cleanupRoom(roomCode);
                    rooms.delete(roomCode);
                    console.log(`[${new Date().toISOString()}] Room ${roomCode} expired and deleted`);
                } catch (error) {
                    console.error('[disconnect] Room cleanup error:', error);
                }
            }, 30 * 60 * 1000);
        }
        io.to(roomCode).emit("user_left", { socketId: socket.id });
    })
    
    // Track message count per socket
    let sendCodeCount = 0;
    let cursorPositionCount = 0;

    // NEW: Operation-based synchronization
    socket.on("send_operation", async (data) => {
        const { editorId, operation, baseRevision } = data;
        const roomCode = socketToRoom.get(socket.id);

        if (!roomCode) return;

        const room = rooms.get(roomCode);
        if (!room || !room.editorDocs[editorId]) {
            socket.emit("operation_error", { message: 'Editor not found' });
            return;
        }

        try {
            const editorDoc = room.editorDocs[editorId];
            const { transformedOp, newRevision } = documentService.applyOperationToDoc(
                editorDoc,
                operation,
                baseRevision
            );

            // Schedule database write
            documentService.scheduleWrite(roomCode, editorId, editorDoc.content, newRevision);

            // Broadcast to all clients in the editor room
            const editorRoom = `${roomCode}-editor-${editorId}`;
            io.to(editorRoom).emit("receive_operation", {
                editorId,
                operation: transformedOp,
                revision: newRevision,
                authorSocketId: socket.id
            });

            console.log(`[${new Date().toISOString()}] Applied operation to ${roomCode}/${editorId} rev ${newRevision}`);
        } catch (error) {
            console.error('[send_operation] Error:', error);
            socket.emit("operation_error", { message: error.message });
        }
    });

    // NEW: Sync editor content for late joiners
    socket.on("request_sync", (editorId) => {
        const roomCode = socketToRoom.get(socket.id);
        if (!roomCode) return;

        const room = rooms.get(roomCode);
        if (!room || !room.editorDocs[editorId]) {
            socket.emit("sync_error", { message: 'Editor not found' });
            return;
        }

        const editorDoc = room.editorDocs[editorId];
        socket.emit("editor_synced", {
            editorId,
            content: editorDoc.content,
            revision: editorDoc.revision
        });
    });

    socket.on("send_code", (data) => {
        sendCodeCount++;
        const roomCode = socketToRoom.get(socket.id);
        if (!roomCode) return;

        // Warning if too many messages
        if (sendCodeCount > 100) {
            console.warn(`[${socket.id}] ⚠️  WARNING: High message count (${sendCodeCount})`);
        }

        // Broadcast only to users in the same editor room
        const editorRoom = `${roomCode}-editor-${data.editorId}`;
        socket.to(editorRoom).emit("receive_code", data);
    })
    
    socket.on("send_cursor_position", (cursorData) => {
        cursorPositionCount++;
        const roomCode = socketToRoom.get(socket.id);
        if (!roomCode) return;

        // Broadcast only to users in the same editor room
        const editorRoom = `${roomCode}-editor-${cursorData.editorId}`;
        socket.to(editorRoom).emit("receive_cursor_position", {position: cursorData.position, socketId: socket.id});
    })

    // Code execution
    socket.on("execute_code", async (data) => {
        const { fileId, code, language } = data;
        const roomCode = socketToRoom.get(socket.id);
        if (!roomCode) return;

        const executionId = `${socket.id}-${Date.now()}`;
        const editorRoom = `${roomCode}-editor-${fileId}`;

        console.log(`[${new Date().toISOString()}] execute_code from ${socket.id}, language: ${language}`);

        try {
            const result = await executeCode(code, language);

            io.to(editorRoom).emit("execution_result", {
                fileId,
                executionId,
                output: result.stdout,
                stderr: result.stderr,
                exitCode: result.exitCode,
                executionTime: result.executionTime,
                language: result.language,
                truncated: result.truncated || false,
                user: {
                    socketId: socket.id
                },
                timestamp: new Date().toISOString()
            });

            console.log(`[${new Date().toISOString()}] execution_result sent to room ${editorRoom}`);
        } catch (error) {
            io.to(editorRoom).emit("execution_error", {
                fileId,
                executionId,
                error: error.message,
                timestamp: new Date().toISOString()
            });

            console.error(`[${new Date().toISOString()}] execution_error:`, error.message);
        }
    });

    // Get supported languages
    socket.on("get_supported_languages", () => {
        socket.emit("supported_languages", getSupportedLanguages());
    });
})


server.listen(3000, () => {
    console.log(`Server is running on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('[Server] SIGTERM received, flushing writes...');
    await documentService.flushPendingWrites();
    process.exit(0);
});