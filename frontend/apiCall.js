let socket = null;

function initializeSocket() {
    if (!socket) {
        socket = io("http://localhost:3000");
        setupSocketListeners();
    }
    return socket;
}

function createChatRoom(name){
    const socket = initializeSocket();
    return new Promise((res, rej) => {
        if(name){
            socket.emit('create-room', {name}, (resp) => {
                res(resp);
            });
        };
    });
}

function joinChatRoom(name, roomCode){
    const socket = initializeSocket();
    return new Promise((res, rej) => {
        socket.emit('join-chat', { name, roomCode }, (resp) => {
            res(resp);
        });
    })
}

function sendMessage(roomCode, message, sender){
    if (socket) {
        socket.emit('send-message', { roomCode, message, sender });
    }
}

function setupSocketListeners() {
    // Socket Event Listeners
    socket.on('receive-message', (data) => {
        const { message, sender, timestamp } = data;
        addMessageToChat(message, sender, timestamp);
    });

    socket.on('user-joined', (data) => {
        const { name, userCount } = data;
        updateUserCount(userCount);
        addSystemMessage(`${name} joined the chat`);
    });

    socket.on('user-left', (data) => {
        const { userCount } = data;
        updateUserCount(userCount);
        addSystemMessage('A user left the chat');
    });

    socket.on('host-disconnected', () => {
        addSystemMessage('Host has left. Chat ended.');
        // Optionally: close chat after a delay
    });
}

// Helper functions to update UI
function addMessageToChat(message, sender, timestamp) {
    const chatLog = document.getElementById('chat-log');
    const messageDiv = document.createElement('div');
    const isOwnMessage = window.currentUser && sender === window.currentUser.userName;
    
    messageDiv.className = `chat-message ${isOwnMessage ? 'own' : 'other'}`;
    messageDiv.innerHTML = `
        <div class="message-sender">${sender}</div>
        <div class="message-text">${message}</div>
    `;
    
    chatLog.appendChild(messageDiv);
    chatLog.scrollTop = chatLog.scrollHeight;
}

function addSystemMessage(text) {
    const chatLog = document.getElementById('chat-log');
    const messageDiv = document.createElement('div');
    messageDiv.style.textAlign = 'center';
    messageDiv.style.fontSize = '12px';
    messageDiv.style.color = '#666';
    messageDiv.style.margin = '10px 0';
    messageDiv.textContent = text;
    
    chatLog.appendChild(messageDiv);
    chatLog.scrollTop = chatLog.scrollHeight;
}

function updateUserCount(count) {
    const userCountEl = document.getElementById('user-count');
    if (userCountEl) {
        userCountEl.textContent = count;
    }
}

