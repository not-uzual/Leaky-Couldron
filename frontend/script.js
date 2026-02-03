// DOM Elements
const menuOptions = document.querySelector('.menu-options');
const formContainer = document.querySelector('.form-container');
const hostForm = document.querySelector('.host-form');
const userForm = document.querySelector('.user-form');
const optionButtons = document.querySelectorAll('.option-button');
const nextButton = document.querySelector('[data-action="next"]');
const userNameInput = document.getElementById('user-name');
const formSteps = document.querySelectorAll('.form-step');
const container = document.querySelector('.container');
const mainChat = document.querySelector('.main-chat');
const closeChatBtn = document.querySelector('.close-chat-btn');
const displayCode = document.getElementById('display-code');
const sendBtn = document.getElementById('send-btn')
const messageInput = document.getElementById('message-input')

// Utility Functions
const toggleVisibility = (hideElements, showElements) => {
    hideElements.forEach(el => el.classList.add('hidden'));
    showElements.forEach(el => el.classList.remove('hidden'));
};

const generateRoomCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString().match(/.{1,3}/g).join(' ');
};

const enterChat = (userName, roomCode, isHost) => {
    displayCode.textContent = roomCode;
    toggleVisibility([container], [mainChat]);
    // Store user info for later use
    window.currentUser = { userName, roomCode, isHost };
};

// Event Handlers
const handleOptionClick = (event) => {
    const button = event.target.closest('.option-button');
    if (!button) return;
    
    const role = button.dataset.role;
    const formToShow = role === 'host' ? hostForm : userForm;
    
    toggleVisibility([menuOptions], [formContainer, formToShow]);
};

const handleNextClick = () => {
    if (!userNameInput.value.trim()) return;
    
    const nameStep = document.querySelector('[data-step="name"]');
    const codeStep = document.querySelector('[data-step="code"]');
    
    toggleVisibility([nameStep], [codeStep]);
};

// Event Listeners
optionButtons.forEach(button => {
    button.addEventListener('click', handleOptionClick);
});

nextButton.addEventListener('click', handleNextClick);

// Form Submissions
hostForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const hostName = document.getElementById('host-name').value.trim();
    if (!hostName) return;
    
    const response = await createChatRoom(hostName);
    if(response.success){
        enterChat(hostName, response.roomCode, true);
    }
});

userForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userName = document.getElementById('user-name').value.trim();
    const roomCode = document.getElementById('room-code').value.trim();
    if (!userName || !roomCode) return;

    const response = await joinChatRoom(userName, roomCode);
    if (response.success) {
        enterChat(userName, roomCode, false);
    } else {
        alert(response.message);
    }
});

messageInput.addEventListener('keydown', (e) => {
    if(e.key === 'Enter'){
        const message = messageInput.value.trim();
        if(message && window.currentUser){
            sendMessage(window.currentUser.roomCode, message, window.currentUser.userName);
            messageInput.value = '';
        }
    }
})

sendBtn.addEventListener('click', (e) => {
    const message = messageInput.value.trim();
    if(message && window.currentUser){
        sendMessage(window.currentUser.roomCode, message, window.currentUser.userName);
        messageInput.value = '';
    }
})


// Close chat handler
closeChatBtn.addEventListener('click', () => {
    toggleVisibility([mainChat], [container]);
    // Reset forms
    hostForm.reset();
    userForm.reset();
    const nameStep = document.querySelector('[data-step="name"]');
    const codeStep = document.querySelector('[data-step="code"]');
    toggleVisibility([formContainer, hostForm, userForm, codeStep], [menuOptions, nameStep]);
});

