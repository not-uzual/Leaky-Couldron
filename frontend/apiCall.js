let socket = null;

const backend_url = 'https://leaky-couldron.onrender.com/'
// 'http://localhost:3000'
// 'https://leaky-couldron.onrender.com/'

function initializeSocket() {
    if (!socket) {
        
        socket = io(backend_url);
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

function sendSticker(roomCode, stickerUrl, stickerName, sender){
    if (socket) {
        socket.emit('send-sticker', { roomCode, stickerUrl, stickerName, sender });
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
        const { userCount } = data;
        updateUserCount(userCount);
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

    socket.on('receive-sticker', (data) => {
        const { stickerUrl, stickerName, sender, timestamp } = data;
        addStickerToChat(stickerUrl, stickerName, sender, timestamp);
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

function addStickerToChat(stickerUrl, stickerName, sender, timestamp) {
    const chatLog = document.getElementById('chat-log');
    const messageDiv = document.createElement('div');
    const isOwnMessage = window.currentUser && sender === window.currentUser.userName;
    
    messageDiv.className = `chat-message ${isOwnMessage ? 'own' : 'other'}`;
    messageDiv.innerHTML = `
        <div class="message-sender">${sender}</div>
        <div class="message-text">
            <img src="${stickerUrl}" alt="${stickerName}" style="width: 80px; height: 80px; object-fit: contain;" />
        </div>
    `;
    
    chatLog.appendChild(messageDiv);
    chatLog.scrollTop = chatLog.scrollHeight;
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
                        updateUserCount(response.userCount);
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
                        updateUserCount(response.userCount);
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

async function createPaymentOrder(amount){
    try {
        const response = await fetch(`${backend_url}/api/payment/create-order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({amount: amount})
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error creating order:', error);
        throw error;
    }
}

async function verifyPayment(paymentData){
    try {
        const response = await fetch(`${backend_url}/api/payment/verify-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentData)
        });
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error verifying payment:', error);
        throw error;
    }
}

async function handlePayment(amount, emojiName){
    try {
        const orderData = await createPaymentOrder(amount);

        if(!orderData.success){
            alert('Failed to create order');
            return;
        }

        const options = {
            key: orderData.key_id,
            amount: orderData.amount,
            currency: orderData.currency,
            order_id: orderData.order_id,
            name: 'Leaky Couldron',
            description: `Send ${emojiName} emoji`,
            method: {
                netbanking: true,
                card: true,
                wallet: true,
                upi: true,
                paylater: true
            },
            handler: async function(response) {
                const verificationData = {
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature
                };
                
                const verification = await verifyPayment(verificationData);
                
                if (verification.success) {
                    if (window.currentUser) {
                        const emojiBox = document.querySelector(`.emoji-icon[alt="${emojiName}"]`);
                        const stickerUrl = emojiBox ? emojiBox.src : '';
                        sendSticker(window.currentUser.roomCode, stickerUrl, emojiName, window.currentUser.userName);
                    }
                } else {
                    alert('Payment verification failed');
                }
            },
            prefill: {
                name: window.authenticatedUser?.name || window.currentUser?.userName || '',
                email: window.authenticatedUser?.email || ''
            },
            theme: {
                color: '#3399cc'
            },
            modal: {
                ondismiss: function() {
                    console.log('Payment cancelled');
                }
            }
        };

        const razorpay = new Razorpay(options);
        razorpay.open();
    } catch (error) {
        console.error('Payment error:', error);
        alert('Payment failed. Please try again.');
    }
}