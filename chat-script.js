const socket = io("https://ad2cc5b6-aaa5-4113-a048-07589b3b2d41-00-2xs93kcxr2v2s.spock.replit.dev", {
    transports: ['websocket'],
    secure: true
});

// Configuration
const CONFIG = {
    STORAGE_KEY: 'chat_user_session',
    DEFAULT_ROOM: 'General',
    MAX_MESSAGE_LENGTH: 800,
    MAX_MESSAGES_DISPLAY: 600,
    ALLOWED_FILE_TYPES: ['image/', 'video/', 'application/pdf', 'application/msword', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
};



// Friends Data Structure
const friends = {
    list: [],
    requests: [],
    pending: []
};

// Utility Functions
const sanitizeHTML = (text) => {
    const temp = document.createElement('div');
    temp.textContent = text;
    return temp.innerHTML;
};

// Elements
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatBox = document.getElementById('chat-box');
const roomName = document.getElementById('room-name');
const rooms = document.querySelectorAll('.room-btn');
const usernameDisplay = document.getElementById('username-display');
const replyContainer = document.getElementById('reply-container');
const replyCancelBtn = document.getElementById('reply-cancel');
const leaveRoomBtn = document.getElementById('leave-room');
const uploadBtn = document.getElementById('upload-btn');
const fileInput = document.getElementById('file-upload');
const onlineUsersDisplay = document.getElementById('online-users');
const createLinkBtn = document.getElementById('create-link-btn');
const addFriendBtn = document.getElementById('add-friend-btn');
const friendUsernameInput = document.getElementById('friend-username');

// Session Management
function createOrGetSession() {
    try {
        let sessionData = sessionStorage.getItem(CONFIG.STORAGE_KEY);
        if (sessionData) return JSON.parse(sessionData);

        const localStorageUser = localStorage.getItem('user');
        if (localStorageUser) {
            const userData = JSON.parse(localStorageUser);
            const sessionInfo = {
                username: userData.name.trim(),
                room: CONFIG.DEFAULT_ROOM,
                loginTimestamp: Date.now(),
            };
            sessionStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(sessionInfo));
            return sessionInfo;
        }

        const guestUsername = `Guest_${Math.random().toString(36).substr(2, 9)}`;
        const guestSession = {
            username: guestUsername,
            room: CONFIG.DEFAULT_ROOM,
            loginTimestamp: Date.now(),
        };
        sessionStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(guestSession));
        return guestSession;
    } catch (error) {
        console.error('Session creation error:', error);
        return null;
    }
}

// Initialize Session
const session = createOrGetSession();
const urlParams = new URLSearchParams(window.location.search);
const urlRoom = urlParams.get('room');

if (urlRoom) {
    session.room = urlRoom;
    currentRoom = urlRoom;
    sessionStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(session));
}
if (!session) {
    alert('Unable to create session. Please try refreshing the page.');
    throw new Error('Session creation failed');
}

let username = session.username;
let currentRoom = session.room;
let currentReplyMessage = null;

// Update UI
usernameDisplay.textContent = username;
roomName.textContent = currentRoom;

// Smooth Scrolling
function smoothScroll() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Display Message Function
function displayMessage(msg) {
    try {
        if (!msg || !msg.username) return;

        const messageElement = document.createElement('div');
        messageElement.classList.add(
            'message',
            msg.username === username ? 'sent' : 'received'
        );
        messageElement.dataset.messageId = msg.id || Date.now();

        // Parse replyTo if it's a string
        if (msg.replyTo && typeof msg.replyTo === 'string') {
            try {
                msg.replyTo = JSON.parse(msg.replyTo);
            } catch (error) {
                msg.replyTo = null;
            }
        }

        const safeUsername = sanitizeHTML(msg.username);
        const safeText = msg.text ? sanitizeHTML(msg.text) : '';
        const timestamp = new Date(msg.timestamp || Date.now()).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });

        // Media display
        let mediaContent = '';
        if (msg.mediaUrl) {
            if (msg.mediaType.startsWith('image/')) {
                mediaContent = `<img src="${msg.mediaUrl}" class="message-image" alt="Uploaded image">`;
            } else if (msg.mediaType.startsWith('video/')) {
                mediaContent = `
                    <video controls class="message-video">
                        <source src="${msg.mediaUrl}" type="${msg.mediaType}">
                        Your browser doesn't support video
                    </video>
                `;
            } else if (msg.mediaType === 'application/pdf') {
                mediaContent = `
                    <div class="file-message">
                        <a href="${msg.mediaUrl}" download="${msg.fileName || 'file.pdf'}" class="file-link">
                            <i class="fas fa-file-pdf"></i> ${msg.fileName || 'PDF File'}
                        </a>
                    </div>
                `;
            }
        }

        messageElement.innerHTML = `
            <div class="message-header">
                <span class="username">${safeUsername}</span>
                <span class="timestamp">${timestamp}</span>
            </div>
            ${msg.replyTo ? `
                <div class="replied-message">
                    <span class="replied-username">${msg.replyTo.username}</span>
                    <span class="replied-text">${sanitizeHTML(msg.replyTo.text)}</span>
                </div>
            ` : ''}
            <div class="message-content">
                ${mediaContent}
                ${safeText ? `<div class="message-text">${safeText}</div>` : ''}
                <div class="reply-overlay">
                    <span class="reply-text">↩</span>
                </div>
            </div>
        `;

        // Reply overlay listener
        const replyOverlay = messageElement.querySelector('.reply-overlay');
        replyOverlay.addEventListener('click', () => {
            currentReplyMessage = {
                username: safeUsername,
                text: safeText
            };
            
            replyContainer.innerHTML = `
                <div class="reply-preview">
                    <strong>Replying to ${safeUsername}</strong>
                    <span>${safeText}</span>
                </div>
            `;
            replyContainer.style.display = 'flex';
            chatInput.focus();
        });

        chatBox.appendChild(messageElement);

        if (chatBox.children.length > CONFIG.MAX_MESSAGES_DISPLAY) {
            chatBox.removeChild(chatBox.firstChild);
        }

        smoothScroll();
    } catch (error) {
        console.error('Error displaying message:', error);
    }
}

// Join Room
function joinRoom(newRoom) {
    socket.emit('joinRoom', { username, room: newRoom });
}

// Leave Room
function leaveRoom() {
    socket.emit('leaveRoom', currentRoom);
}

socket.on('roomUserCount', ({ room, count }) => {
    if (room === currentRoom) {
        onlineUsersDisplay.innerHTML = `<i class="fas fa-user-friends"></i> <span>${count} Online</span>`;
    }
});

// Handle Room Switch
function handleRoomSwitch(newRoom) {
    if (newRoom === currentRoom) return;

    leaveRoom();
    chatBox.innerHTML = ''; // Clear chat messages
    currentRoom = newRoom;
    roomName.textContent = newRoom;

    joinRoom(newRoom); // Join the new room
    session.room = newRoom;
    sessionStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(session));
}

// Handle File Upload
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Show upload indicator
    const originalHtml = uploadBtn.innerHTML;
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    uploadBtn.disabled = true;

    const reader = new FileReader();
    
    reader.onload = function(e) {
        const messageData = {
            room: currentRoom,
            username,
            mediaType: file.type,
            mediaUrl: e.target.result,
            fileName: file.name,
            fileSize: file.size
        };

        socket.emit('uploadFile', messageData, (response) => {
            uploadBtn.innerHTML = originalHtml;
            uploadBtn.disabled = false;
            fileInput.value = '';
            
            if (response && response.error) {
                alert('File upload failed: ' + response.error);
            }
        });
    };

    reader.onerror = function() {
        uploadBtn.innerHTML = originalHtml;
        uploadBtn.disabled = false;
        fileInput.value = '';
        alert('Error reading file');
    };

    reader.readAsDataURL(file);
}

// Emoji Picker
function setupEmojiPicker() {
    const emojiButton = document.getElementById('emoji-btn');
    const emojiPicker = document.getElementById('emoji-picker');
    
    const emojiCategories = {
        "All": ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮', '😯', '😪', '😫', '🤤', '😴', '😌', '😛', '😜', '😝', '👍', '👎','🖕', '👏', '🙌', '🤝', '👋', '🤚', '✋', '🖐️', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✊', '👊', '🤜', '🤛', '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐒', '🐧', '🐦', '🐤', '🦄', '🐝', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🍍', '🥭', '🥝', '🍅', '🍆', '🥑', '🥦', '🍔', '🍟', '🍕', '🌭', '🥪', '🍿', '🍰', '🍦', '🍩', '🚀', '✈️', '🚁', '🚢', '🚂', '🚗', '🚲', '🏍️', '🚦', '🗽', '🗼', '⛰️', '🌋', '🏖️'],
        Smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '😮', '😯', '😪', '😫', '🤤', '😴', '😌', '😛', '😜', '😝'],
        Gestures: ['👍', '👎', '🖕', '👏', '🙌', '🤝', '👋', '🤚', '✋', '🖐️', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✊', '👊', '🤜', '🤛'],
        Animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐒', '🐧', '🐦', '🐤', '🦄', '🐝'],
        Food: ['🍎', '🍐', '🍊', '🍋', '🍉', '🍇', '🍓', '🍒', '🍍', '🥭', '🥝', '🍅', '🥦', '🍔', '🍟', '🍕', '🥪', '🍿', '🍰', '🍦', '🍩'],
        Travel: ['🚀', '✈️', '🚁', '🚢', '🚂', '🚗', '🚲', '🏍️', '🚦', '🗽', '🗼', '⛰️', '🌋', '🏖️']
    };

    function createEmojiPicker() {
        emojiPicker.innerHTML = '';
        
        const categoryTabs = document.createElement('div');
        categoryTabs.classList.add('emoji-category-tabs');
        
        const emojiGrid = document.createElement('div');
        emojiGrid.classList.add('emoji-grid');
        
        Object.keys(emojiCategories).forEach((category, index) => {
            const categoryTab = document.createElement('button');
            categoryTab.textContent = category;
            categoryTab.classList.add('emoji-category-tab');
            if (index === 0) categoryTab.classList.add('active');
            
            categoryTab.addEventListener('click', () => {
                categoryTabs.querySelectorAll('.emoji-category-tab').forEach(tab => 
                    tab.classList.remove('active')
                );
                categoryTab.classList.add('active');
                populateEmojiGrid(category);
            });
            
            categoryTabs.appendChild(categoryTab);
        });
        
        function populateEmojiGrid(category) {
            emojiGrid.innerHTML = '';
            emojiCategories[category].forEach(emoji => {
                const emojiEl = document.createElement('span');
                emojiEl.textContent = emoji;
                emojiEl.classList.add('emoji-item');
                emojiEl.addEventListener('click', () => {
                    chatInput.value += emoji;
                    chatInput.focus();
                });
                emojiGrid.appendChild(emojiEl);
            });
        }
        
        populateEmojiGrid(Object.keys(emojiCategories)[0]);
        emojiPicker.appendChild(categoryTabs);
        emojiPicker.appendChild(emojiGrid);
    }

    emojiButton.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!emojiPicker.querySelector('.emoji-grid')) {
            createEmojiPicker();
        }
        emojiPicker.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
        if (!emojiPicker.contains(e.target) && !emojiButton.contains(e.target)) {
            emojiPicker.classList.remove('show');
        }
    });
}

// Friends List Functions
function updateFriendsList() {
    const friendsListContainer = document.getElementById('friends-tab');
    friendsListContainer.innerHTML = '<h2><i class="fas fa-user-friends"></i> Friends</h2>';

    if (friends.list.length === 0) {
        friendsListContainer.innerHTML += '<p class="no-friends">No friends yet. Add some friends!</p>';
        return;
    }

    friends.list.forEach(friend => {
        const friendItem = document.createElement('div');
        friendItem.className = 'friend-item';
        
        friendItem.innerHTML = `
            <img src="${friend.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(friend.username)}" 
                 class="friend-avatar" alt="${friend.username}">
            <div class="friend-info">
                <div class="friend-name">${friend.username}</div>
                <div class="friend-status ${friend.online ? 'online' : 'offline'}">
                    ${friend.online ? 'Online' : 'Offline'} ${friend.status ? '- ' + friend.status : ''}
                </div>
            </div>
            <div class="friend-actions">
                <button class="friend-action-btn chat-with-friend" data-username="${friend.username}">
                    <i class="fas fa-comment"></i>
                </button>
                <button class="friend-action-btn remove-friend" data-username="${friend.username}">
                    <i class="fas fa-user-minus"></i>
                </button>
            </div>
        `;
        
        friendsListContainer.appendChild(friendItem);
    });

    // Add event listeners for friend actions
    document.querySelectorAll('.chat-with-friend').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const username = e.currentTarget.getAttribute('data-username');
            startPrivateChat(username);
        });
    });

    document.querySelectorAll('.remove-friend').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const username = e.currentTarget.getAttribute('data-username');
            removeFriend(username);
        });
    });
}

function updateFriendRequests() {
    function updatePendingRequests() {
    const container = document.getElementById('pending-requests');
    container.innerHTML = '';
    friends.pending.forEach(pendingUsername => {
        const div = document.createElement('div');
        div.className = 'pending-request';
        div.innerHTML = `<span>${pendingUsername}</span> <em>(Pending)</em>`;
        container.appendChild(div);
    });
}
    const addFriendTab = document.getElementById('add-friend-tab');
    const requestsContainer = addFriendTab.querySelector('.friend-requests') || document.createElement('div');
    requestsContainer.className = 'friend-requests';
    
    if (friends.requests.length === 0) {
        requestsContainer.innerHTML = '<h3>No pending friend requests</h3>';
    } else {
        requestsContainer.innerHTML = '<h3>Friend Requests</h3>';
        
        friends.requests.forEach(request => {
            const requestItem = document.createElement('div');
            requestItem.className = 'friend-item';
            
            requestItem.innerHTML = `
                <img src="${request.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(request.from)}" 
                     class="friend-avatar" alt="${request.from}">
                <div class="friend-info">
                    <div class="friend-name">${request.from}</div>
                    <div class="friend-status">Wants to be your friend</div>
                </div>
                <div class="friend-actions">
                    <button class="friend-action-btn accept-request" 
                            style="background-color: var(--success-color)"
                            data-username="${request.from}">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="friend-action-btn decline-request" 
                            style="background-color: var(--error-color)"
                            data-username="${request.from}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
            
            requestsContainer.appendChild(requestItem);
        });

        // Add event listeners for request actions
        document.querySelectorAll('.accept-request').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const username = e.currentTarget.getAttribute('data-username');
                respondToFriendRequest(username, true);
            });
        });

        document.querySelectorAll('.decline-request').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const username = e.currentTarget.getAttribute('data-username');
                respondToFriendRequest(username, false);
            });
        });
    }

    if (!addFriendTab.querySelector('.friend-requests')) {
        addFriendTab.appendChild(requestsContainer);
    }
}

// Friend Actions
function addFriend() {
    console.log('Add friend clicked!');
    const friendUsername = friendUsernameInput.value.trim();
    
    if (!friendUsername) {
        alert('Please enter a username');
        return;
    }
    
    if (friendUsername === username) {
        alert("You can't add yourself as a friend!");
        return;
    }
    
    // Check if already friends
    if (friends.list.some(f => f.username === friendUsername)) {
        alert(`${friendUsername} is already your friend`);
        return;
    }
    
    // Check if request already pending
    if (friends.pending.includes(friendUsername)) {
        alert(`You already have a pending request to ${friendUsername}`);
        return;
    }
    
    socket.emit('sendFriendRequest', { 
        from: username, 
        to: friendUsername 
    }, (response) => {
        console.log('Server response:', response);
        if (response.success) {
            friends.pending.push(friendUsername);
            friendUsernameInput.value = '';
            showNotification(`Friend request sent to ${friendUsername}`);
            updatePendingRequests();  // Update the pending request list in the UI
        } else {
            alert(response.error || 'Failed to send friend request');
        }
    });
}

function respondToFriendRequest(username, accept) {
    socket.emit('respondToFriendRequest', {
        from: username,
        to: username,
        accepted: accept
    }, (response) => {
        if (response.success) {
            friends.requests = friends.requests.filter(r => r.from !== username);
            updateFriendRequests();
            
            if (accept) {
                // Add to friends list if accepted
                friends.list.push({
                    username,
                    online: false,
                    status: ''
                });
                updateFriendsList();
            }
        } else {
            alert(response.error || 'Failed to process friend request');
        }
    });
}

function removeFriend(username) {
    if (!confirm(`Are you sure you want to remove ${username} from your friends?`)) {
        return;
    }
    
    socket.emit('removeFriend', {
        username1: username,
        username2: username
    }, (response) => {
        if (!response.success) {
            alert(response.error || 'Failed to remove friend');
        }
    });
}

function startPrivateChat(username) {
    const privateRoom = `private_${[username, username].sort().join('_')}`;
    handleRoomSwitch(privateRoom);
}

// Notification System
function showNotification(message) {
    if (!('Notification' in window)) {
        console.log('This browser does not support desktop notification');
        return;
    }
    
    // Check if notification permissions are already granted
    if (Notification.permission === 'granted') {
        new Notification(message);
    } 
    // Otherwise, ask for permission
    else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification(message);
            }
        });
    }
    
    // Also show in-app notification
    const notification = document.createElement('div');
    notification.className = 'in-app-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 3000);
}

// Dynamic Link Creation
function showLinkModal(link) {
    const modal = document.createElement('div');
    modal.className = 'link-modal';
    
    modal.innerHTML = `
        <div class="link-modal-content">
            <h3>Chat Link Created</h3>
            <p>Share this link with others to join the chat room:</p>
            <div class="link-input-container">
                <input type="text" id="dynamic-link" value="${link}" readonly>
                <button class="copy-link-btn" id="copy-link-btn">
                    <i class="fas fa-copy"></i> Copy
                </button>
            </div>
            <button id="close-modal-btn" style="margin-top: 1rem; width: 100%; padding: 0.5rem;">
                Close
            </button>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    // Add event listeners
    document.getElementById('copy-link-btn').addEventListener('click', () => {
        copyToClipboard(link);
        showNotification('Link copied to clipboard!');
    });
    
    document.getElementById('close-modal-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
}

function createDynamicLink() {
    const roomId = generateRoomId();
    const dynamicLink = `${window.location.origin}?room=${roomId}`;
    showLinkModal(dynamicLink);
}

function generateRoomId() {
    return 'room-' + Math.random().toString(36).substring(2, 9);
}

function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}

// AI Assistant Configuration
const AI_CONFIG = {
    NAME: "AI Assistant",
    RESPONSE_DELAY: 1000,
    RESPONSES: {
        greetings: ["Hello! How can I help you today?", "Hi there! What can I do for you?", "Welcome to AI chat!"],
        questions: {
            "how are you": ["I'm doing well, thank you!", "I'm functioning perfectly, how about you?"],
            "what's your name": ["I'm your AI assistant!", "You can call me AI Assistant"],
            "what can you do": ["I can answer your questions, help with technical topics, and even have a fun conversation!"]
        },
        fallback: ["I'm not sure I understand, could you clarify?", "That's an interesting question, but I'm not certain of the exact answer."]
    }
};

// Handle AI Responses
function handleAIResponse(messageText) {
    const lowerCaseText = messageText.toLowerCase();
    
    // Check for greetings
    if (/hello|hi|hey|greetings/.test(lowerCaseText)) {
        const randomResponse = AI_CONFIG.RESPONSES.greetings[
            Math.floor(Math.random() * AI_CONFIG.RESPONSES.greetings.length)
        ];
        return randomResponse;
    }
    
    // Check specific questions
    for (const [question, answers] of Object.entries(AI_CONFIG.RESPONSES.questions)) {
        if (lowerCaseText.includes(question)) {
            return answers[Math.floor(Math.random() * answers.length)];
        }
    }
    
    // Fallback response
    return AI_CONFIG.RESPONSES.fallback[
        Math.floor(Math.random() * AI_CONFIG.RESPONSES.fallback.length)
    ];
}

function setupAIChat() {
    const askAIButton = document.getElementById('askAIButton');
    
    askAIButton.addEventListener('click', () => {
        const aiRoomName = `AI_Chat_${Date.now()}`;
        handleRoomSwitch(aiRoomName);
        
        setTimeout(() => {
            const welcomeMessage = {
                username: AI_CONFIG.NAME,
                text: AI_CONFIG.RESPONSES.greetings[0],
                room: aiRoomName,
                timestamp: Date.now()
            };
            socket.emit('chatMessage', welcomeMessage);
        }, 500);
        
        chatInput.placeholder = "Ask AI about anything...";
        document.getElementById('room-name').style.color = "#4a6cff";
    });
}

// Socket Listeners for Friends
function setupFriendSocketListeners() {
    socket.on('friendListUpdate', (updatedList) => {
        friends.list = updatedList;
        updateFriendsList();
    });

    socket.on('friendRequest', (request) => {
        friends.requests.push(request);
        updateFriendRequests();
        showNotification(`${request.from} sent you a friend request!`);
    });

    socket.on('friendRequestResponse', (response) => {
    if (response.accepted) {
        showNotification(`${response.from} accepted your friend request!`);
    } else {
        showNotification(`${response.from} declined your friend request`);
    }

    // Remove from pending list
    friends.pending = friends.pending.filter(f => f !== response.from);

    // Update the pending request UI
    updatePendingRequests();
});

    socket.on('friendStatusUpdate', ({ username, online, status }) => {
        const friend = friends.list.find(f => f.username === username);
        if (friend) {
            friend.online = online;
            friend.status = status;
            updateFriendsList();
        }
    });

    socket.on('friendRemoved', ({ username }) => {
        friends.list = friends.list.filter(f => f.username !== username);
        updateFriendsList();
        showNotification(`${username} is no longer your friend`);
    });
}

// Setup Socket Listeners
function setupSocketListeners() {
    socket.on('message', (msg) => {
        displayMessage(msg);
        
        if (msg.room.includes("AI_Chat") && msg.username !== AI_CONFIG.NAME) {
            setTimeout(() => {
                const aiResponse = {
                    username: AI_CONFIG.NAME,
                    text: handleAIResponse(msg.text),
                    room: msg.room,
                    timestamp: Date.now()
                };
                socket.emit('chatMessage', aiResponse);
            }, AI_CONFIG.RESPONSE_DELAY);
        }
    });
    
    socket.on('fileUploaded', (data) => {
        displayMessage({
            username: data.username,
            text: data.fileName || '',
            mediaUrl: data.mediaUrl,
            mediaType: data.mediaType,
            timestamp: data.timestamp,
            id: data.id
        });
    });

    socket.on('uploadError', (error) => {
        alert(`File upload error: ${error.message}`);
        uploadBtn.innerHTML = '<i class="fas fa-upload"></i>';
        uploadBtn.disabled = false;
    });

    socket.on('previousMessages', (messages) => {
        messages.forEach(displayMessage);
    });

    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        alert('Connection error. Please try again later.');
    });

    setupFriendSocketListeners();
}

// Setup Event Listeners
function setupEventListeners() {
    // Tab Switching
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabsContent = {
        'rooms': document.getElementById('rooms-tab'),
        'friends': document.getElementById('friends-tab'),
        'add-friend': document.getElementById('add-friend-tab')
    };

    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            
            navTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            Object.values(tabsContent).forEach(content => {
                content.style.display = 'none';
            });
            
            if (tabsContent[tabName]) {
                tabsContent[tabName].style.display = 'block';
            }
        });
    });

    // Room Buttons
    rooms.forEach((room) => {
        room.addEventListener('click', () => {
            const newRoom = room.getAttribute('data-room');
            handleRoomSwitch(newRoom);
        });
    });

    // Leave Room Button
    leaveRoomBtn.addEventListener('click', () => {
        sessionStorage.removeItem(CONFIG.STORAGE_KEY);
        localStorage.removeItem('user');
        window.location.href = '/login';
    });

    // Chat Form
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = chatInput.value.trim();
        if (message && message.length <= CONFIG.MAX_MESSAGE_LENGTH) {
            const messageData = {
                text: message,
                room: currentRoom,
                username,
            };
    
            if (currentReplyMessage) {
                messageData.replyTo = JSON.stringify({
                    username: currentReplyMessage.username,
                    text: currentReplyMessage.text
                });
            }
    
            socket.emit('chatMessage', messageData);
            chatInput.value = '';
            currentReplyMessage = null;
            replyContainer.style.display = 'none';
            chatInput.focus();
        } else {
            alert(`Message must be between 1-${CONFIG.MAX_MESSAGE_LENGTH} characters.`);
        }
    });

    // File Upload
    uploadBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', handleFileUpload);
    
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            const fileName = fileInput.files[0].name;
            uploadBtn.title = `Selected: ${fileName}`;
        } else {
            uploadBtn.title = 'Upload file';
        }
    });

    // Reply Cancel Button
    replyCancelBtn.addEventListener('click', () => {
        currentReplyMessage = null;
        replyContainer.style.display = 'none';
    });

    // Create Link Button
    createLinkBtn.addEventListener('click', createDynamicLink);

    // Add Friend Button
    addFriendBtn.addEventListener('click', addFriend);
    
    friendUsernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addFriend();
        }
    });

    // Request notification permission on first interaction
    document.addEventListener('click', () => {
        if (Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, { once: true });

    // Setup emoji picker
    setupEmojiPicker();
}

// Initialization
function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    
    if (roomParam) {
        currentRoom = roomParam;
        roomName.textContent = currentRoom;
    }

    joinRoom(currentRoom);
    setupEventListeners();
    setupSocketListeners();
    setupAIChat();

    // Load initial friends list and requests from server
    socket.emit('getFriendsList', username, (response) => {
        if (response.success) {
            friends.list = response.friends || [];
            friends.requests = response.requests || [];
            friends.pending = response.pending || [];

            updateFriendsList();        // Update sidebar friend list
            updateFriendRequests();     // Update incoming requests UI
            updatePendingRequests();    // Update outgoing/pending requests UI
        }
    });
}

// Start the application
init();