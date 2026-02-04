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
const authSection = document.querySelector('.auth-section');
const emojiSection = document.querySelector('.emoji-main')
const emojiSectionArrow = document.querySelector('.arrow')
const emojiLis = document.querySelector('.emoji-lis');
let emojiExpanded = false;

emojiSection.addEventListener('click', () => {
    if (!emojiExpanded) {
        emojiSection.style.height = '250px';
        emojiSectionArrow.src = './media/arrow-down.png';
        emojiLis.classList.remove('hidden')
        emojiExpanded = true;
    } else {
        emojiSection.style.height = '';
        emojiSectionArrow.src = './media/arrow-up.png';
        emojiLis.classList.add('hidden')
        emojiExpanded = false;
    }
})

window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'success') {
        window.history.replaceState({}, document.title, '/');
        
        fetch('https://leaky-couldron.onrender.com/auth/user', { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
                if (data.user) {
                    window.authenticatedUser = {
                        name: data.user.displayName,
                        email: data.user.emails[0].value,
                        photo: data.user.photos[0].value
                    };
                    
                    authSection.classList.add('hidden');
                    document.querySelector('.welcome').innerText=`Hello, ${window.authenticatedUser.name}`
                    document.querySelector('.welcome').classList.remove('hidden')
                }
            })
            .catch(err => console.error('Failed to fetch user:', err)
        );
    }
});

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
    window.currentUser = { userName, roomCode, isHost };
    saveToLocalStorage()
};

const handleOptionClick = (event) => {
    const button = event.target.closest('.option-button');
    if (!button) return;
    
    const role = button.dataset.role;
    const formToShow = role === 'host' ? hostForm : userForm;
    
    if (window.authenticatedUser) {
        if (role === 'host') {
            document.getElementById('host-name').value = window.authenticatedUser.name;
        } else {
            document.getElementById('user-name').value = window.authenticatedUser.name;
        }
    }
    
    toggleVisibility([menuOptions], [formContainer, formToShow]);
};

const handleNextClick = () => {
    if (!userNameInput.value.trim()) return;
    
    const nameStep = document.querySelector('[data-step="name"]');
    const codeStep = document.querySelector('[data-step="code"]');
    
    toggleVisibility([nameStep], [codeStep]);
};

optionButtons.forEach(button => {
    button.addEventListener('click', handleOptionClick);
});

nextButton.addEventListener('click', handleNextClick);

hostForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const hostName = window.authenticatedUser?.name || document.getElementById('host-name').value.trim();
    if (!hostName) return;
    
    const response = await createChatRoom(hostName);
    if(response.success){     
        enterChat(hostName, response.roomCode, true);
    }
});

userForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userName = window.authenticatedUser?.name || document.getElementById('user-name').value.trim();
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

closeChatBtn.addEventListener('click', () => {
    localStorage.removeItem('chatSession');
    
    if (socket) {
        socket.disconnect();
    }
    
    toggleVisibility([mainChat], [container]);

    hostForm.reset();
    userForm.reset();
    const nameStep = document.querySelector('[data-step="name"]');
    const codeStep = document.querySelector('[data-step="code"]');
    toggleVisibility([formContainer, hostForm, userForm, codeStep], [menuOptions, nameStep]);
    
    window.currentUser = null;
});

function saveToLocalStorage(){
    localStorage.setItem('chatSession', JSON.stringify(window.currentUser));
    console.log(JSON.parse(localStorage.getItem('chatSession')));
}

const emojiBoxes = document.querySelectorAll('.emoji-box');

emojiBoxes.forEach((box, index) => {
    box.addEventListener('click', async (e) => {
        e.stopPropagation()
        const priceText = box.querySelector('p').textContent;
        const amount = parseInt(priceText.replace('₹', '').trim());
        const emojiImg = box.querySelector('.emoji-icon');
        const emojiName = emojiImg.alt || `Emoji ${index + 1}`;
        
        if (!window.currentUser) {
            alert('Please join a chat room first!');
            return;
        }
        
        await handlePayment(amount, emojiName);
    });
});