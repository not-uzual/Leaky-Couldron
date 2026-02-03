let socket = null;

function initializeSocket() {
    if (!socket) {
        socket = io("https://leaky-couldron.onrender.com/");
        // socket = io("http://localhost:3000");
        setupSocketListeners();
    }
    return socket;
}

function createChatRoom(name){
    const socket = initializeSocket();
    return new Promise((res, rej) => {
        socket.emit('create-room', { name: name }, (response) => {
            if (response.success) {
                localStorage.setItem('chatSession', JSON.stringify({
                    roomCode: response.roomCode,
                    userName: name,
                    isHost: true
                }));
                res(response);
            }
        });
    });
}

function joinChatRoom(name, roomCode){
    const socket = initializeSocket();
    return new Promise((res, rej) => {
        socket.emit('join-chat', { name: name, roomCode: roomCode }, (response) => {
            if (response.success) {
                localStorage.setItem('chatSession', JSON.stringify({
                    roomCode: roomCode,
                    userName: name,
                    isHost: false
                }));
                res(response);
            }
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

    socket.on('user-reconnected', (data) => {
        const { name } = data;
        addSystemMessage(`${name} rejoined the chat`);
    });

    socket.on('user-left', (data) => {
        const { userCount } = data;
        updateUserCount(userCount);
        addSystemMessage(`${data.name} left the chat`);
    });

    socket.on('host-disconnected', (data) => {
        addSystemMessage(`${data.name}[Host] has left the chat.`);
    });

    socket.on('host-reconnected', (data) => {
        const { hostName } = data;
        addSystemMessage(`${hostName}[Host] rejoined the chat`);
    });

    socket.on('chat-started', (data) => {
        const { userCount } = data;
        updateUserCount(userCount);
    });
}

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

window.addEventListener('DOMContentLoaded', () => {
    initializeSocket()
    const session = localStorage.getItem('chatSession');
    
    if (session) {
        const { roomCode, userName, isHost } = JSON.parse(session);
        if (isHost) {
            socket.emit('rejoin-as-host', { roomCode, name: userName }, (response) => {
                if (response.success) {
                    enterChat(userName, roomCode, true);
                    // Add system message after UI is ready
                    setTimeout(() => {
                        addSystemMessage(`You rejoined the chat`);
                    }, 100);
                } else {
                    localStorage.removeItem('chatSession');
                    alert('Room expired or no longer exists');
                }
            });
        } else {
            socket.emit('join-chat', { 
                name: userName, 
                roomCode, 
                isReconnect: true 
            }, (response) => {
                if (response.success) {
                    enterChat(userName, roomCode, false);
                    // Add system message after UI is ready
                    setTimeout(() => {
                        addSystemMessage(`You rejoined the chat`);
                    }, 100);
                } else {
                    localStorage.removeItem('chatSession');
                    alert('Room expired or no longer exists');
                }
            });
        }
    }
});