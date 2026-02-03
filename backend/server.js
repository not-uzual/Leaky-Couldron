const http = require('node:http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');


const app = express();

const allowedOrigins = [
    'https://leaky-couldron.vercel.app',
    'http://localhost:5500',
];

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors : {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true
    }
});

const chatRooms = new Map();

function generateRoomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}


io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('create-room', (hostData, callback) => {
        let roomCode = generateRoomCode()

        while (chatRooms.has(roomCode)) {
            roomCode = generateRoomCode();
        }

        chatRooms.set(roomCode, {
            host: socket.id,
            hostName: hostData.name,
            users: [],
            userCount: 1,
            chatStarted: true,
            createdAt: Date.now()
        });

        socket.join(roomCode);
        console.log(`Chat created with code: ${roomCode} by ${hostData.name}`);

        const room = chatRooms.get(roomCode);
        io.to(roomCode).emit('chat-started', { userCount: room.userCount });
    
        callback({ success: true, roomCode });
    })

    socket.on('join-chat', (userRes, callback) => {
        const {name, roomCode} = userRes;

        const room = chatRooms.get(roomCode);

        if (!room) {
            callback({ success: false, message: 'Invalid chat code' });
            return;
        }

        const userExists = room.users.find(u => u.name === name);
        
        if (!userExists) {
            room.users.push({ name, socketId: socket.id });
            room.userCount++;
        }

        socket.join(roomCode);
        io.to(roomCode).emit('user-joined', { 
            name, 
            userCount: room.userCount 
        });

        console.log(`User ${name} (${socket.id}) joined chat: ${roomCode}`);
        callback({ 
            success: true, 
            roomCode, 
            isHost: false, 
            userCount: room.userCount,
            hostName: room.hostName
        });
    });

    socket.on('send-message', (data) => {
        const { roomCode, message, sender } = data;
        io.to(roomCode).emit('receive-message', {
            message,
            sender,
            timestamp: Date.now()
        });
        console.log(`Message from ${sender} in room ${roomCode}: ${message}`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        for (const [roomCode, room] of chatRooms.entries()) {
            if (room.host === socket.id) {
                io.to(roomCode).emit('host-disconnected');
                chatRooms.delete(roomCode);
            } else {
                const userIndex = room.users.findIndex(u => u.socketId === socket.id);
                if (userIndex !== -1) {
                    room.users.splice(userIndex, 1);
                    room.userCount = room.users.length;
                    io.to(roomCode).emit('user-left', { 
                        socketId: socket.id,
                        userCount: room.userCount
                    });
                }
            }
        }
    });
});

setInterval(() => {
  const now = Date.now();
  for (const [roomCode, room] of chatRooms.entries()) {
    if (now - room.createdAt > 24 * 60 * 60 * 1000) {
      chatRooms.delete(roomCode);
      console.log(`Cleaned up old game room: ${roomCode}`);
    }
  }
}, 60 * 60 * 1000);

app.get('/', (req, res) => {
    res.json({
        status: 'ok', 
        activeRooms: chatRooms.size,
        timestamp: new Date().toISOString()
    })
})

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});


