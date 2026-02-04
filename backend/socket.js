function generateRoomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function socketConnection(io, chatRooms) {
  io.on("connection", (socket) => {
    // console.log("User connected:", socket.id);

    socket.on("create-room", (hostData, callback) => {
      let roomCode = generateRoomCode();

      while (chatRooms.has(roomCode)) {
        roomCode = generateRoomCode();
      }

      chatRooms.set(roomCode, {
        host: socket.id,
        hostName: hostData.name,
        users: [],
        userCount: 1,
        chatStarted: true,
        createdAt: Date.now(),
      });

      socket.join(roomCode);
    //   console.log(`Chat created with code: ${roomCode} by ${hostData.name}`);

      const room = chatRooms.get(roomCode);
      io.to(roomCode).emit("chat-started", { userCount: room.userCount });

      callback({ success: true, roomCode });
    });

    socket.on("rejoin-as-host", (hostData, callback) => {
      const { roomCode, name } = hostData;
      const room = chatRooms.get(roomCode);

      if (!room) {
        callback({ success: false, message: "Room no longer exists" });
        return;
      }

      room.host = socket.id;
      socket.join(roomCode);

    //   console.log(
    //     `Host ${name} reconnected to room ${roomCode} with new socket: ${socket.id}`,
    //   );

      // Notify others (not self) that host reconnected
      socket.broadcast
        .to(roomCode)
        .emit("host-reconnected", { hostName: name });

      callback({
        success: true,
        roomCode,
        isHost: true,
        userCount: room.userCount,
        hostName: room.hostName,
      });
    });

    socket.on("join-chat", (userRes, callback) => {
      const { name, roomCode, isReconnect } = userRes;

      const room = chatRooms.get(roomCode);

      if (!room) {
        callback({ success: false, message: "Invalid chat code" });
        return;
      }

      const existingUser = room.users.find((u) => u.name === name);

      if (existingUser) {
        // User is reconnecting, update their socket ID
        existingUser.socketId = socket.id;
        // console.log(`User ${name} reconnected to room ${roomCode}`);
      } else {
        // New user joining
        room.users.push({ name, socketId: socket.id });
        room.userCount++;
      }

      socket.join(roomCode);

      // Update user count: 1 (host) + number of users
      room.userCount = 1 + room.users.length;

      // Notify others AFTER joining the room
      if (existingUser && isReconnect) {
        // console.log(`Broadcasting user-reconnected for ${name} to room ${roomCode}`);
        socket.broadcast.to(roomCode).emit("user-reconnected", { name });
      }

      if (!existingUser || !isReconnect) {
        // console.log(`Broadcasting user-joined for ${name} to room ${roomCode}`);
        io.to(roomCode).emit("user-joined", {
          name,
          userCount: room.userCount,
        });
      }

    //   console.log(`User ${name} (${socket.id}) joined chat: ${roomCode}`);
      callback({
        success: true,
        roomCode,
        isHost: false,
        userCount: room.userCount,
        hostName: room.hostName,
      });
    });

    socket.on("send-message", (data) => {
      const { roomCode, message, sender } = data;
      io.to(roomCode).emit("receive-message", {
        message,
        sender,
        timestamp: Date.now(),
      });
    //   console.log(`Message from ${sender} in room ${roomCode}: ${message}`);
    });

    socket.on("send-sticker", (data) => {
      const { roomCode, stickerUrl, stickerName, sender } = data;
      io.to(roomCode).emit("receive-sticker", {
        stickerUrl,
        stickerName,
        sender,
        timestamp: Date.now(),
      });
    //   console.log(`Sticker from ${sender} in room ${roomCode}: ${stickerName}`);
    });

    socket.on("disconnect", () => {
    //   console.log("User disconnected:", socket.id);

      for (const [roomCode, room] of chatRooms.entries()) {
        if (room.host === socket.id) {
          io.to(roomCode).emit("host-disconnected", { 
            name: room.hostName,
            userCount: room.users.length 
          });
          // chatRooms.delete(roomCode);
        } else {
          const userIndex = room.users.findIndex(
            (u) => u.socketId === socket.id,
          );
          if (userIndex !== -1) {
            let username = room.users[userIndex].name;
            room.users.splice(userIndex, 1);
            room.userCount = 1 + room.users.length;
            io.to(roomCode).emit("user-left", {
              socketId: socket.id,
              userCount: room.userCount,
              name: username,
            });
          }
        }
      }
    });
  });
}

module.exports = socketConnection