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
    console.log("User connected");
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
        io.emit("editor_added", newEditor);
        console.log("Editor added:", newEditor);
    });
    
    // Remove editor
    socket.on("remove_editor", (editorId) => {
        const index = editorsList.findIndex(e => e.id === editorId);
        if (index !== -1 && editorsList.length > 1) {
            editorsList.splice(index, 1);
            io.emit("editor_removed", editorId);
            console.log("Editor removed:", editorId);
        }
    });
    
    // Join a specific editor room
    socket.on("join_editor", (editorId) => {
        const room = `editor-${editorId}`;
        socket.join(room);
        console.log(`Socket ${socket.id} joined room ${room}`);
    });
    
    // Leave a specific editor room
    socket.on("leave_editor", (editorId) => {
        const room = `editor-${editorId}`;
        socket.leave(room);
        console.log(`Socket ${socket.id} left room ${room}`);
    });
    
    socket.on("disconnect", () => {
        console.log("User disconnected");
    })
    
    socket.on("send_code", (data) => {
        const room = `editor-${data.editorId}`;
        console.log(socket.id, "sending code to room:", room);
        // Broadcast only to users in the same editor room
        socket.to(room).emit("receive_code", data);
    })
    
    socket.on("send_cursor_position", (cursorData) => {
        const room = `editor-${cursorData.editorId}`;
        console.log(socket.id, "cursor position:", cursorData, "to room:", room);
        // Broadcast only to users in the same editor room
        socket.to(room).emit("receive_cursor_position", cursorData);
    })
})


server.listen(3000, () => {
    console.log(`Server is running on port ${port}`);
});