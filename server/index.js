const express = require("express");
const app = express();
const cors = require("cors");
const http = require("http");

app.use(cors());

const server = http.createServer(app);

const { Server } = require("socket.io");

const port = 3000;

// Store the list of editors
let editorsList = [
    { id: 1, name: 'main.js', language: 'javascript' }
];
let nextEditorId = 2;

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
})


io.on("connection", (socket) => {
    console.log(`[${new Date().toISOString()}] User connected: ${socket.id}`);
    socket.emit("connected", socket.id);
    
    // Send current editors list to new client
    socket.emit("editors_list", editorsList);
    
    // Add new editor
    socket.on("add_editor", (editor) => {
        const newEditor = {
            id: nextEditorId++,
            name: editor.name,
            language: editor.language
        };
        editorsList.push(newEditor);
        console.log(`[${new Date().toISOString()}] Added editor:`, newEditor.id);
        io.emit("editor_added", newEditor);
    });
    
    // Remove editor
    socket.on("remove_editor", (editorId) => {
        const index = editorsList.findIndex(e => e.id === editorId);
        console.log(`[${new Date().toISOString()}] remove editor:`, editorId);
        if (index !== -1 && editorsList.length > 1) {
            editorsList.splice(index, 1);
            socket.emit("editor_removed", editorId);
        }
    });
    
    // Join a specific editor room
    socket.on("join_editor", (editorId) => {

        const room = `editor-${editorId}`;

        socket.join(room);

        const clients = Array.from(io.sockets.adapter.rooms.get(room) || []);

        socket.emit("room_users", clients);

        socket.to(room).emit("user_joined", socket.id);
    });
    
    // Leave a specific editor room
    socket.on("leave_editor", (editorId) => {
        const room = `editor-${editorId}`;
        // Broadcast to others in the room that this user left
        socket.to(room).emit("user_left", { socketId: socket.id });
        socket.leave(room);
    });

    socket.on("disconnect", () => {
        console.log(`[${new Date().toISOString()}] User disconnected: ${socket.id}`);
        // Broadcast to all rooms that this user disconnected
        socket.broadcast.emit("user_left", { socketId: socket.id });
    })
    
    // Track message count per socket
    let sendCodeCount = 0;
    let cursorPositionCount = 0;
    
    socket.on("send_code", (data) => {
        sendCodeCount++;
        const room = `editor-${data.editorId}`;
        
        // Warning if too many messages
        if (sendCodeCount > 100) {
            console.warn(`[${socket.id}] ⚠️  WARNING: High message count (${sendCodeCount})`);
        }
        
        // Broadcast only to users in the same editor room
        socket.to(room).emit("receive_code", data);
    })
    
    socket.on("send_cursor_position", (cursorData) => {
        cursorPositionCount++;
        const room = `editor-${cursorData.editorId}`;
        
        // Only log every 10th cursor update to avoid spam
        if (cursorPositionCount % 10 === 0) {
        }
        // Broadcast only to users in the same editor room
        socket.to(room).emit("receive_cursor_position", {position: cursorData.position, socketId: socket.id});    
    })
})


server.listen(3000, () => {
    console.log(`Server is running on port ${port}`);
});