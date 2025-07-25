class FileTransferSystem {
    constructor(websocket, maxFileSize = 100 * 1024 * 1024) { // 100MB default
        this.ws = websocket;
        this.maxFileSize = maxFileSize;
        this.activeTransfers = new Map();
        this.chunkSize = 64 * 1024; // 64KB chunks
        this.setupEventHandlers();
        this.createDropZone();
    }

    setupEventHandlers() {
        this.ws.addEventListener('message', (event) => {
            const message = JSON.parse(event.data);
            if (message.type.startsWith('file_')) {
                this.handleFileMessage(message);
            }
        });
    }

    createDropZone() {
        // Crear overlay para drag & drop
        this.dropOverlay = document.createElement('div');
        this.dropOverlay.className = 'file-drop-overlay';
        this.dropOverlay.innerHTML = `
            <div class="drop-zone">
                <div class="drop-icon">📁</div>
                <h3>Arrastra archivos aquí</h3>
                <p>Suelta para transferir archivos al cliente remoto</p>
                <div class="drop-supported">
                    Archivos soportados: Todos los tipos (máx. ${this.formatFileSize(this.maxFileSize)})
                </div>
            </div>
        `;

        // Estilos del drop zone
        this.setupDropZoneStyles();
        
        // Event handlers para drag & drop
        this.setupDragDropHandlers();
        
        document.body.appendChild(this.dropOverlay);
    }

    setupDropZoneStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .file-drop-overlay {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(102, 126, 234, 0.9);
                backdrop-filter: blur(5px);
                display: none;
                align-items: center;
                justify-content: center;
                z-index: 50000;
                animation: fadeIn 0.2s ease;
            }

            .file-drop-overlay.active {
                display: flex;
            }

            .drop-zone {
                background: white;
                border: 3px dashed #667eea;
                border-radius: 20px;
                padding: 60px 40px;
                text-align: center;
                max-width: 500px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                transform: scale(1);
                transition: transform 0.2s ease;
            }

            .drop-zone.hover {
                transform: scale(1.05);
                border-color: #51cf66;
                background: #f8fff9;
            }

            .drop-icon {
                font-size: 80px;
                margin-bottom: 20px;
                opacity: 0.8;
            }

            .drop-zone h3 {
                margin: 0 0 10px 0;
                color: #333;
                font-size: 24px;
                font-weight: 600;
            }

            .drop-zone p {
                margin: 0 0 20px 0;
                color: #666;
                font-size: 16px;
            }

            .drop-supported {
                font-size: 14px;
                color: #888;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 8px;
            }

            .file-transfer-manager {
                position: fixed;
                bottom: 80px;
                right: 20px;
                width: 400px;
                background: white;
                border-radius: 16px;
                box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
                z-index: 10001;
                max-height: 500px;
                overflow: hidden;
                transform: translateX(420px);
                transition: transform 0.3s ease;
            }

            .file-transfer-manager.visible {
                transform: translateX(0);
            }

            .transfer-header {
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                padding: 15px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-radius: 16px 16px 0 0;
            }

            .transfer-header h4 {
                margin: 0;
                font-weight: 600;
            }

            .transfer-list {
                max-height: 400px;
                overflow-y: auto;
                padding: 15px;
            }

            .transfer-item {
                background: #f8f9fa;
                border-radius: 12px;
                padding: 15px;
                margin-bottom: 10px;
                border: 1px solid #e9ecef;
            }

            .transfer-item.completed {
                background: #f8fff9;
                border-color: #51cf66;
            }

            .transfer-item.error {
                background: #fff5f5;
                border-color: #ff6b6b;
            }

            .transfer-info {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 10px;
            }

            .file-name {
                font-weight: 500;
                color: #333;
                font-size: 14px;
                max-width: 200px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .file-size {
                font-size: 12px;
                color: #666;
            }

            .transfer-progress {
                width: 100%;
                height: 6px;
                background: #e9ecef;
                border-radius: 3px;
                overflow: hidden;
                margin-bottom: 8px;
            }

            .progress-bar {
                height: 100%;
                background: linear-gradient(90deg, #667eea, #764ba2);
                border-radius: 3px;
                transition: width 0.3s ease;
            }

            .transfer-status {
                font-size: 12px;
                color: #666;
                display: flex;
                justify-content: space-between;
            }

            .transfer-actions {
                display: flex;
                gap: 8px;
                margin-top: 10px;
            }

            .transfer-btn {
                padding: 4px 12px;
                border: none;
                border-radius: 6px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .transfer-btn.cancel {
                background: #ff6b6b;
                color: white;
            }

            .transfer-btn.retry {
                background: #667eea;
                color: white;
            }

            .transfer-btn:hover {
                transform: translateY(-1px);
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    setupDragDropHandlers() {
        let dragCounter = 0;

        // Prevenir comportamiento por defecto del navegador
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        document.addEventListener('dragenter', (e) => {
            dragCounter++;
            if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
                this.showDropZone();
            }
        });

        document.addEventListener('dragleave', (e) => {
            dragCounter--;
            if (dragCounter === 0) {
                this.hideDropZone();
            }
        });

        this.dropOverlay.addEventListener('dragover', (e) => {
            this.dropOverlay.querySelector('.drop-zone').classList.add('hover');
        });

        this.dropOverlay.addEventListener('dragleave', (e) => {
            if (!this.dropOverlay.contains(e.relatedTarget)) {
                this.dropOverlay.querySelector('.drop-zone').classList.remove('hover');
            }
        });

        this.dropOverlay.addEventListener('drop', (e) => {
            dragCounter = 0;
            this.handleFileDrop(e);
            this.hideDropZone();
        });
    }

    showDropZone() {
        this.dropOverlay.classList.add('active');
    }

    hideDropZone() {
        this.dropOverlay.classList.remove('active');
        this.dropOverlay.querySelector('.drop-zone').classList.remove('hover');
    }

    async handleFileDrop(e) {
        const files = Array.from(e.dataTransfer.files);
        
        for (const file of files) {
            if (file.size > this.maxFileSize) {
                this.showError(`Archivo "${file.name}" es demasiado grande (máx. ${this.formatFileSize(this.maxFileSize)})`);
                continue;
            }
            
            await this.startFileTransfer(file);
        }
    }

    async startFileTransfer(file) {
        const transferId = this.generateId();
        const transfer = {
            id: transferId,
            file: file,
            name: file.name,
            size: file.size,
            type: file.type,
            status: 'preparing',
            progress: 0,
            uploadedBytes: 0,
            startTime: Date.now(),
            chunks: Math.ceil(file.size / this.chunkSize),
            currentChunk: 0
        };

        this.activeTransfers.set(transferId, transfer);
        this.createTransferManager();
        this.updateTransferDisplay();

        // Iniciar transferencia
        try {
            await this.sendFileMetadata(transfer);
            await this.sendFileChunks(transfer);
        } catch (error) {
            transfer.status = 'error';
            transfer.error = error.message;
            this.updateTransferDisplay();
        }
    }

    async sendFileMetadata(transfer) {
        transfer.status = 'uploading';
        
        const metadata = {
            id: transfer.id,
            name: transfer.name,
            size: transfer.size,
            type: transfer.type,
            chunks: transfer.chunks,
            checksum: await this.calculateChecksum(transfer.file)
        };

        this.ws.send(JSON.stringify({
            type: 'file_metadata',
            data: metadata
        }));

        this.updateTransferDisplay();
    }

    async sendFileChunks(transfer) {
        const file = transfer.file;
        
        for (let i = 0; i < transfer.chunks; i++) {
            const start = i * this.chunkSize;
            const end = Math.min(start + this.chunkSize, file.size);
            const chunk = file.slice(start, end);
            
            const chunkData = await this.readChunkAsBase64(chunk);
            
            this.ws.send(JSON.stringify({
                type: 'file_chunk',
                data: {
                    id: transfer.id,
                    chunkIndex: i,
                    data: chunkData,
                    isLast: i === transfer.chunks - 1
                }
            }));

            transfer.currentChunk = i + 1;
            transfer.uploadedBytes = end;
            transfer.progress = (transfer.uploadedBytes / transfer.size) * 100;
            
            this.updateTransferDisplay();
            
            // Pequeña pausa para no saturar la conexión
            await this.sleep(10);
        }

        transfer.status = 'completed';
        transfer.endTime = Date.now();
        this.updateTransferDisplay();
    }

    async calculateChecksum(file) {
        const buffer = await file.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async readChunkAsBase64(chunk) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.readAsDataURL(chunk);
        });
    }

    handleFileMessage(message) {
        switch (message.type) {
            case 'file_metadata':
                this.handleIncomingFileMetadata(message.data);
                break;
            case 'file_chunk':
                this.handleIncomingFileChunk(message.data);
                break;
            case 'file_complete':
                this.handleFileComplete(message.data);
                break;
            case 'file_error':
                this.handleFileError(message.data);
                break;
        }
    }

    handleIncomingFileMetadata(metadata) {
        const transfer = {
            id: metadata.id,
            name: metadata.name,
            size: metadata.size,
            type: metadata.type,
            chunks: metadata.chunks,
            checksum: metadata.checksum,
            status: 'downloading',
            progress: 0,
            downloadedBytes: 0,
            receivedChunks: 0,
            data: new Uint8Array(metadata.size),
            isIncoming: true
        };

        this.activeTransfers.set(metadata.id, transfer);
        this.createTransferManager();
        this.updateTransferDisplay();

        // Confirmar recepción
        this.ws.send(JSON.stringify({
            type: 'file_metadata_ack',
            data: { id: metadata.id }
        }));
    }

    handleIncomingFileChunk(chunkData) {
        const transfer = this.activeTransfers.get(chunkData.id);
        if (!transfer) return;

        // Decodificar chunk
        const chunk = Uint8Array.from(atob(chunkData.data), c => c.charCodeAt(0));
        const start = chunkData.chunkIndex * this.chunkSize;
        transfer.data.set(chunk, start);

        transfer.receivedChunks++;
        transfer.downloadedBytes = Math.min(start + chunk.length, transfer.size);
        transfer.progress = (transfer.downloadedBytes / transfer.size) * 100;

        this.updateTransferDisplay();

        // Si es el último chunk, completar transferencia
        if (chunkData.isLast) {
            this.completeIncomingFile(transfer);
        }
    }

    async completeIncomingFile(transfer) {
        try {
            // Verificar checksum
            const receivedChecksum = await this.calculateChecksumFromArray(transfer.data);
            if (receivedChecksum !== transfer.checksum) {
                throw new Error('Checksum verification failed');
            }

            // Crear blob y descargar
            const blob = new Blob([transfer.data], { type: transfer.type });
            this.downloadFile(blob, transfer.name);

            transfer.status = 'completed';
            transfer.endTime = Date.now();

            // Notificar al sender
            this.ws.send(JSON.stringify({
                type: 'file_complete_ack',
                data: { id: transfer.id }
            }));

        } catch (error) {
            transfer.status = 'error';
            transfer.error = error.message;
            
            this.ws.send(JSON.stringify({
                type: 'file_error',
                data: { id: transfer.id, error: error.message }
            }));
        }

        this.updateTransferDisplay();
    }

    async calculateChecksumFromArray(data) {
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    createTransferManager() {
        if (document.querySelector('.file-transfer-manager')) return;

        const manager = document.createElement('div');
        manager.className = 'file-transfer-manager';
        manager.innerHTML = `
            <div class="transfer-header">
                <h4>📁 Transferencias de Archivos</h4>
                <button onclick="this.parentElement.parentElement.classList.toggle('visible')" style="background: none; border: none; color: white; cursor: pointer;">✕</button>
            </div>
            <div class="transfer-list" id="transferList">
                <!-- Transfers will be added here -->
            </div>
        `;

        document.body.appendChild(manager);
        manager.classList.add('visible');
    }

    updateTransferDisplay() {
        const transferList = document.getElementById('transferList');
        if (!transferList) return;

        transferList.innerHTML = Array.from(this.activeTransfers.values()).map(transfer => {
            const statusIcons = {
                preparing: '⏳',
                uploading: '⬆️',
                downloading: '⬇️',
                completed: '✅',
                error: '❌'
            };

            const duration = transfer.endTime ? 
                transfer.endTime - transfer.startTime : 
                Date.now() - transfer.startTime;

            const speed = transfer.uploadedBytes > 0 ? 
                this.formatFileSize(transfer.uploadedBytes / (duration / 1000)) + '/s' : '0 B/s';

            return `
                <div class="transfer-item ${transfer.status}">
                    <div class="transfer-info">
                        <div class="file-name">${statusIcons[transfer.status]} ${transfer.name}</div>
                        <div class="file-size">${this.formatFileSize(transfer.size)}</div>
                    </div>
                    
                    ${transfer.status !== 'completed' && transfer.status !== 'error' ? `
                        <div class="transfer-progress">
                            <div class="progress-bar" style="width: ${transfer.progress}%"></div>
                        </div>
                    ` : ''}
                    
                    <div class="transfer-status">
                        <span>${this.getStatusText(transfer)}</span>
                        <span>${speed}</span>
                    </div>
                    
                    ${transfer.status === 'error' ? `
                        <div class="transfer-actions">
                            <button class="transfer-btn retry" onclick="window.fileTransfer.retryTransfer('${transfer.id}')">Reintentar</button>
                            <button class="transfer-btn cancel" onclick="window.fileTransfer.cancelTransfer('${transfer.id}')">Cancelar</button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        // Exponer métodos globalmente para los botones
        window.fileTransfer = this;
    }

    getStatusText(transfer) {
        switch (transfer.status) {
            case 'preparing':
                return 'Preparando...';
            case 'uploading':
                return `Enviando ${Math.round(transfer.progress)}%`;
            case 'downloading':
                return `Descargando ${Math.round(transfer.progress)}%`;
            case 'completed':
                return transfer.isIncoming ? 'Descargado' : 'Enviado';
            case 'error':
                return `Error: ${transfer.error}`;
            default:
                return transfer.status;
        }
    }

    cancelTransfer(transferId) {
        const transfer = this.activeTransfers.get(transferId);
        if (transfer) {
            transfer.status = 'cancelled';
            this.ws.send(JSON.stringify({
                type: 'file_cancel',
                data: { id: transferId }
            }));
            this.updateTransferDisplay();
        }
    }

    async retryTransfer(transferId) {
        const transfer = this.activeTransfers.get(transferId);
        if (transfer && transfer.file) {
            transfer.status = 'preparing';
            transfer.progress = 0;
            transfer.uploadedBytes = 0;
            transfer.currentChunk = 0;
            transfer.startTime = Date.now();
            
            try {
                await this.sendFileMetadata(transfer);
                await this.sendFileChunks(transfer);
            } catch (error) {
                transfer.status = 'error';
                transfer.error = error.message;
            }
            
            this.updateTransferDisplay();
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    showError(message) {
        // Crear notificación de error
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff6b6b;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(255, 107, 107, 0.3);
            z-index: 60000;
            max-width: 400px;
            animation: slideIn 0.3s ease;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span>❌</span>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; margin-left: auto;">✕</button>
            </div>
        `;

        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    destroy() {
        const manager = document.querySelector('.file-transfer-manager');
        if (manager) manager.remove();
        
        if (this.dropOverlay) this.dropOverlay.remove();
    }
}

module.exports = FileTransferSystem;