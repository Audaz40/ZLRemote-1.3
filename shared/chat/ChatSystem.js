class ChatSystem {
    constructor(websocket) {
        this.ws = websocket;
        this.chatHistory = [];
        this.typingUsers = new Set();
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        // Eventos de chat
        this.ws.addEventListener('message', (event) => {
            const message = JSON.parse(event.data);
            if (message.type.startsWith('chat_')) {
                this.handleChatMessage(message);
            }
        });
    }

    sendMessage(text, type = 'text') {
        const message = {
            type: 'chat_message',
            data: {
                id: this.generateId(),
                text,
                messageType: type,
                timestamp: Date.now(),
                sender: this.getUserInfo()
            }
        };

        this.ws.send(JSON.stringify(message));
        this.addToHistory(message.data);
    }

    sendFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const message = {
                type: 'chat_file',
                data: {
                    id: this.generateId(),
                    filename: file.name,
                    size: file.size,
                    mimeType: file.type,
                    content: e.target.result,
                    timestamp: Date.now(),
                    sender: this.getUserInfo()
                }
            };

            this.ws.send(JSON.stringify(message));
            this.addToHistory({
                ...message.data,
                messageType: 'file',
                text: `📎 ${file.name}`
            });
        };
        reader.readAsDataURL(file);
    }

    sendTyping(isTyping) {
        this.ws.send(JSON.stringify({
            type: 'chat_typing',
            data: {
                isTyping,
                user: this.getUserInfo()
            }
        }));
    }

    handleChatMessage(message) {
        switch (message.type) {
            case 'chat_message':
                this.addToHistory(message.data);
                this.onMessageReceived?.(message.data);
                break;
            
            case 'chat_file':
                this.handleFileMessage(message.data);
                break;
            
            case 'chat_typing':
                this.handleTyping(message.data);
                break;
            
            case 'chat_history':
                this.chatHistory = message.data;
                this.onHistoryLoaded?.(this.chatHistory);
                break;
        }
    }

    handleFileMessage(data) {
        this.addToHistory({
            ...data,
            messageType: 'file',
            text: `📎 ${data.filename}`
        });
        this.onFileReceived?.(data);
    }

    handleTyping(data) {
        if (data.isTyping) {
            this.typingUsers.add(data.user.id);
        } else {
            this.typingUsers.delete(data.user.id);
        }
        this.onTypingChanged?.(Array.from(this.typingUsers));
    }

    addToHistory(message) {
        this.chatHistory.push(message);
        if (this.chatHistory.length > 1000) {
            this.chatHistory = this.chatHistory.slice(-1000);
        }
    }

    getUserInfo() {
        return {
            id: this.userId || 'anonymous',
            name: this.userName || 'Usuario',
            avatar: this.userAvatar || null
        };
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Callbacks que pueden ser configurados
    onMessageReceived = null;
    onFileReceived = null;
    onTypingChanged = null;
    onHistoryLoaded = null;
}

// Componente de Chat UI para Desktop
class ChatUI {
    constructor(chatSystem, container) {
        this.chat = chatSystem;
        this.container = container;
        this.isMinimized = true;
        this.unreadCount = 0;
        this.render();
        this.setupEventHandlers();
    }

    render() {
        this.container.innerHTML = `
            <div class="chat-widget ${this.isMinimized ? 'minimized' : 'expanded'}">
                <div class="chat-header" id="chatHeader">
                    <div class="chat-title">
                        <span>💬 Chat</span>
                        <span class="unread-badge" id="unreadBadge" style="display: none;">0</span>
                    </div>
                    <button class="chat-toggle" id="chatToggle">
                        ${this.isMinimized ? '📖' : '📕'}
                    </button>
                </div>
                
                <div class="chat-body" id="chatBody">
                    <div class="chat-messages" id="chatMessages"></div>
                    <div class="chat-typing" id="chatTyping" style="display: none;"></div>
                    <div class="chat-input-container">
                        <input type="file" id="fileInput" style="display: none;" multiple>
                        <button class="attach-btn" id="attachBtn">📎</button>
                        <input type="text" id="chatInput" placeholder="Escribe un mensaje..." maxlength="500">
                        <button class="send-btn" id="sendBtn">📤</button>
                    </div>
                </div>
            </div>
        `;

        this.setupStyles();
    }

    setupStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .chat-widget {
                position: fixed;
                bottom: 20px;
                right: 20px;
                width: 350px;
                background: white;
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
                z-index: 10000;
                transition: all 0.3s ease;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }

            .chat-widget.minimized {
                height: 60px;
                overflow: hidden;
            }

            .chat-widget.expanded {
                height: 400px;
            }

            .chat-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px;
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                border-radius: 16px 16px 0 0;
                cursor: pointer;
            }

            .chat-title {
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 600;
            }

            .unread-badge {
                background: #ff4757;
                color: white;
                border-radius: 12px;
                padding: 2px 8px;
                font-size: 12px;
                font-weight: bold;
            }

            .chat-toggle {
                background: none;
                border: none;
                color: white;
                font-size: 18px;
                cursor: pointer;
                padding: 5px;
                border-radius: 50%;
                transition: background 0.2s;
            }

            .chat-toggle:hover {
                background: rgba(255, 255, 255, 0.1);
            }

            .chat-body {
                height: 340px;
                display: flex;
                flex-direction: column;
            }

            .chat-messages {
                flex: 1;
                overflow-y: auto;
                padding: 15px;
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .chat-message {
                max-width: 80%;
                padding: 10px 12px;
                border-radius: 12px;
                word-wrap: break-word;
            }

            .chat-message.own {
                align-self: flex-end;
                background: #667eea;
                color: white;
            }

            .chat-message.other {
                align-self: flex-start;
                background: #f1f3f4;
                color: #333;
            }

            .chat-message.file {
                cursor: pointer;
                border: 2px dashed #667eea;
                background: #f8f9ff;
            }

            .message-time {
                font-size: 11px;
                opacity: 0.7;
                margin-top: 4px;
            }

            .chat-typing {
                padding: 10px 15px;
                font-style: italic;
                color: #666;
                font-size: 14px;
            }

            .chat-input-container {
                display: flex;
                padding: 15px;
                gap: 10px;
                border-top: 1px solid #eee;
            }

            .attach-btn, .send-btn {
                background: #667eea;
                color: white;
                border: none;
                border-radius: 8px;
                padding: 8px 12px;
                cursor: pointer;
                font-size: 16px;
                transition: background 0.2s;
            }

            .attach-btn:hover, .send-btn:hover {
                background: #5a67d8;
            }

            #chatInput {
                flex: 1;
                border: 2px solid #e2e8f0;
                border-radius: 8px;
                padding: 8px 12px;
                font-size: 14px;
                outline: none;
                transition: border-color 0.2s;
            }

            #chatInput:focus {
                border-color: #667eea;
            }

            .chat-messages::-webkit-scrollbar {
                width: 6px;
            }

            .chat-messages::-webkit-scrollbar-track {
                background: #f1f1f1;
            }

            .chat-messages::-webkit-scrollbar-thumb {
                background: #c1c1c1;
                border-radius: 3px;
            }
        `;
        document.head.appendChild(style);
    }

    setupEventHandlers() {
        // Toggle chat
        document.getElementById('chatToggle').addEventListener('click', () => {
            this.toggleChat();
        });

        document.getElementById('chatHeader').addEventListener('click', () => {
            this.toggleChat();
        });

        // Send message
        document.getElementById('sendBtn').addEventListener('click', () => {
            this.sendMessage();
        });

        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // File attachment
        document.getElementById('attachBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        document.getElementById('fileInput').addEventListener('change', (e) => {
            Array.from(e.target.files).forEach(file => {
                this.chat.sendFile(file);
            });
        });

        // Typing indicator
        let typingTimer;
        document.getElementById('chatInput').addEventListener('input', () => {
            this.chat.sendTyping(true);
            clearTimeout(typingTimer);
            typingTimer = setTimeout(() => {
                this.chat.sendTyping(false);
            }, 1000);
        });

        // Chat system callbacks
        this.chat.onMessageReceived = (message) => {
            this.addMessage(message);
            if (this.isMinimized) {
                this.showUnreadNotification();
            }
        };

        this.chat.onTypingChanged = (typingUsers) => {
            this.updateTypingIndicator(typingUsers);
        };

        this.chat.onFileReceived = (fileData) => {
            this.handleFileDownload(fileData);
        };
    }

    toggleChat() {
        this.isMinimized = !this.isMinimized;
        this.container.querySelector('.chat-widget').className = 
            `chat-widget ${this.isMinimized ? 'minimized' : 'expanded'}`;
        
        document.getElementById('chatToggle').textContent = this.isMinimized ? '📖' : '📕';
        
        if (!this.isMinimized) {
            this.clearUnreadNotification();
            this.scrollToBottom();
        }
    }

    sendMessage() {
        const input = document.getElementById('chatInput');
        const text = input.value.trim();
        
        if (text) {
            this.chat.sendMessage(text);
            input.value = '';
            this.chat.sendTyping(false);
        }
    }

    addMessage(message) {
        const messagesContainer = document.getElementById('chatMessages');
        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${message.sender.id === this.chat.getUserInfo().id ? 'own' : 'other'} ${message.messageType || 'text'}`;
        
        const time = new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });

        messageEl.innerHTML = `
            <div class="message-content">${this.formatMessage(message)}</div>
            <div class="message-time">${time}</div>
        `;

        if (message.messageType === 'file') {
            messageEl.addEventListener('click', () => {
                this.downloadFile(message);
            });
        }

        messagesContainer.appendChild(messageEl);
        this.scrollToBottom();
    }

    formatMessage(message) {
        if (message.messageType === 'file') {
            return `📎 ${message.filename} (${this.formatFileSize(message.size)})`;
        }
        return this.escapeHtml(message.text);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    scrollToBottom() {
        const messages = document.getElementById('chatMessages');
        messages.scrollTop = messages.scrollHeight;
    }

    showUnreadNotification() {
        this.unreadCount++;
        const badge = document.getElementById('unreadBadge');
        badge.textContent = this.unreadCount;
        badge.style.display = 'block';
    }

    clearUnreadNotification() {
        this.unreadCount = 0;
        document.getElementById('unreadBadge').style.display = 'none';
    }

    updateTypingIndicator(typingUsers) {
        const indicator = document.getElementById('chatTyping');
        if (typingUsers.length > 0) {
            indicator.textContent = `${typingUsers.length} usuario(s) escribiendo...`;
            indicator.style.display = 'block';
        } else {
            indicator.style.display = 'none';
        }
    }

    downloadFile(fileMessage) {
        const link = document.createElement('a');
        link.href = fileMessage.content;
        link.download = fileMessage.filename;
        link.click();
    }

    handleFileDownload(fileData) {
        // Auto-download o mostrar preview según el tipo
        if (fileData.mimeType.startsWith('image/')) {
            this.showImagePreview(fileData);
        } else {
            // Mostrar notificación de descarga disponible
            this.showDownloadNotification(fileData);
        }
    }

    showImagePreview(fileData) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 20000;
            cursor: pointer;
        `;
        
        const img = document.createElement('img');
        img.src = fileData.content;
        img.style.maxWidth = '90%';
        img.style.maxHeight = '90%';
        img.style.borderRadius = '8px';
        
        overlay.appendChild(img);
        overlay.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        document.body.appendChild(overlay);
    }

    showDownloadNotification(fileData) {
        // Implementar notificación toast
        console.log('File ready for download:', fileData.filename);
    }
}

module.exports = { ChatSystem, ChatUI };