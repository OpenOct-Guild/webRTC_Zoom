const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

// Create express app
const app = express();
app.use(cors());

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

// Store active rooms
const rooms = {};

// Socket.IO connection handler
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Create room handler
    socket.on('create-room', (data) => {
        const { userId, userName } = data;
        
        // Generate room ID
        const roomId = generateRoomId();
        
        // Create new room
        rooms[roomId] = {
            id: roomId,
            participants: {
                [userId]: {
                    id: userId,
                    name: userName,
                    socketId: socket.id,
                    isAdmin: true
                }
            },
            createdAt: Date.now()
        };
        
        // Join socket room
        socket.join(roomId);
        
        // Send room created event
        socket.emit('room-created', {
            roomId,
            participants: rooms[roomId].participants,
            isAdmin: true
        });
        
        console.log(`Room created: ${roomId} by user ${userId} (${userName})`);
    });
    
    // Join room handler
    socket.on('join-room', (data) => {
        const { roomId, userId, userName } = data;
        
        // Check if room exists
        if (!rooms[roomId]) {
            socket.emit('room-error', { message: 'Room not found' });
            return;
        }
        
        // Add user to room
        rooms[roomId].participants[userId] = {
            id: userId,
            name: userName,
            socketId: socket.id,
            isAdmin: false
        };
        
        // Join socket room
        socket.join(roomId);
        
        // Send room joined event
        socket.emit('room-joined', {
            roomId,
            participants: rooms[roomId].participants,
            isAdmin: false
        });
        
        // Notify other participants
        socket.to(roomId).emit('user-joined', {
            userId,
            userName
        });
        
        console.log(`User ${userId} (${userName}) joined room ${roomId}`);
    });
    
    // Leave room handler
    socket.on('leave-room', (data) => {
        const { roomId, userId } = data;
        handleUserLeaving(socket, roomId, userId);
    });
    
    // Offer handler
    socket.on('offer', (data) => {
        const { roomId, to, from, fromName, offer } = data;
        
        socket.to(roomId).emit('offer', {
            to,
            from,
            fromName,
            offer
        });
    });
    
    // Answer handler
    socket.on('answer', (data) => {
        const { roomId, to, from, answer } = data;
        
        socket.to(roomId).emit('answer', {
            to,
            from,
            answer
        });
    });
    
    // ICE candidate handler
    socket.on('ice-candidate', (data) => {
        const { roomId, to, from, candidate } = data;
        
        socket.to(roomId).emit('ice-candidate', {
            to,
            from,
            candidate
        });
    });
    
    // Chat message handler
    socket.on('chat-message', (data) => {
        const { roomId, userId, userName, content, time } = data;
        
        socket.to(roomId).emit('chat-message', {
            userId,
            userName,
            content,
            time
        });
    });
    
    // Toggle audio handler
    socket.on('toggle-audio', (data) => {
        const { roomId, userId, enabled } = data;
        
        socket.to(roomId).emit('user-toggle-audio', {
            userId,
            enabled
        });
    });
    
    // Toggle video handler
    socket.on('toggle-video', (data) => {
        const { roomId, userId, enabled } = data;
        
        socket.to(roomId).emit('user-toggle-video', {
            userId,
            enabled
        });
    });
    
    // Screen share started handler
    socket.on('screen-share-started', (data) => {
        const { roomId, userId } = data;
        
        socket.to(roomId).emit('user-screen-share-started', {
            userId
        });
    });
    
    // Screen share stopped handler
    socket.on('screen-share-stopped', (data) => {
        const { roomId, userId } = data;
        
        socket.to(roomId).emit('user-screen-share-stopped', {
            userId
        });
    });
    
    // Disconnect handler
    socket.on('disconnect', () => {
        handleSocketDisconnect(socket);
    });
    
    // Admin remove user handler
    socket.on('admin-remove-user', (data) => {
        const { roomId, userId } = data;
        
        // Check if user is admin
        const room = rooms[roomId];
        const socketId = socket.id;
        
        if (room) {
            const admin = Object.values(room.participants).find(
                participant => participant.socketId === socketId && participant.isAdmin
            );
            
            if (admin) {
                // Notify user being removed
                const userToRemove = room.participants[userId];
                
                if (userToRemove) {
                    io.to(userToRemove.socketId).emit('admin-removed');
                    
                    // Remove user from room
                    delete room.participants[userId];
                    
                    // Notify remaining users
                    socket.to(roomId).emit('user-left', {
                        userId,
                        userName: userToRemove.name
                    });
                }
            }
        }
    });
});

// Helper Functions
function generateRoomId() {
    return Math.random().toString(36).substring(2, 10);
}

function handleUserLeaving(socket, roomId, userId) {
    // Check if room exists
    if (!rooms[roomId]) return;
    
    // Get user details before removing
    const user = rooms[roomId].participants[userId];
    
    if (user) {
        // Remove user from room
        delete rooms[roomId].participants[userId];
        
        // Leave socket room
        socket.leave(roomId);
        
        // Notify other participants
        socket.to(roomId).emit('user-left', {
            userId,
            userName: user.name
        });
        
        console.log(`User ${userId} (${user.name}) left room ${roomId}`);
        
        // Clean up empty rooms
        if (Object.keys(rooms[roomId].participants).length === 0) {
            delete rooms[roomId];
            console.log(`Room ${roomId} deleted (empty)`);
        }
    }
}

function handleSocketDisconnect(socket) {
    console.log(`User disconnected: ${socket.id}`);
    
    // Find rooms where this socket is a participant
    for (const roomId in rooms) {
        const room = rooms[roomId];
        
        // Find user with this socket ID
        const userId = Object.keys(room.participants).find(
            id => room.participants[id].socketId === socket.id
        );
        
        if (userId) {
            // Handle user leaving
            handleUserLeaving(socket, roomId, userId);
            break;
        }
    }
}

// Clean up old rooms periodically (every hour)
setInterval(() => {
    const now = Date.now();
    const MAX_ROOM_AGE = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const roomId in rooms) {
        if (now - rooms[roomId].createdAt > MAX_ROOM_AGE) {
            console.log(`Room ${roomId} deleted (expired)`);
            delete rooms[roomId];
        }
    }
}, 60 * 60 * 1000);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});