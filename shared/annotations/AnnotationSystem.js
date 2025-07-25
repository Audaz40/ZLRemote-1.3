class AnnotationSystem {
    constructor(canvas, websocket) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.ws = websocket;
        this.annotations = [];
        this.isDrawing = false;
        this.currentTool = 'pen';
        this.currentColor = '#ff4757';
        this.currentSize = 3;
        this.setupEventHandlers();
        this.setupTools();
    }

    setupEventHandlers() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());

        // Touch events para móviles
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });

        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            this.canvas.dispatchEvent(mouseEvent);
        });

        // WebSocket events
        this.ws.addEventListener('message', (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'annotation') {
                this.handleRemoteAnnotation(message.data);
            }
        });
    }

    setupTools() {
        const toolsContainer = document.createElement('div');
        toolsContainer.className = 'annotation-tools';
        toolsContainer.innerHTML = `
            <div class="tools-panel">
                <div class="tool-section">
                    <label>Herramienta:</label>
                    <div class="tool-buttons">
                        <button class="tool-btn active" data-tool="pen" title="Lápiz">✏️</button>
                        <button class="tool-btn" data-tool="highlighter" title="Resaltador">🖍️</button>
                        <button class="tool-btn" data-tool="arrow" title="Flecha">➡️</button>
                        <button class="tool-btn" data-tool="rectangle" title="Rectángulo">▭</button>
                        <button class="tool-btn" data-tool="circle" title="Círculo">○</button>
                        <button class="tool-btn" data-tool="text" title="Texto">T</button>
                        <button class="tool-btn" data-tool="eraser" title="Borrador">🧽</button>
                    </div>
                </div>
                
                <div class="tool-section">
                    <label>Color:</label>
                    <div class="color-palette">
                        <div class="color-btn active" data-color="#ff4757" style="background: #ff4757;"></div>
                        <div class="color-btn" data-color="#2ed573" style="background: #2ed573;"></div>
                        <div class="color-btn" data-color="#1e90ff" style="background: #1e90ff;"></div>
                        <div class="color-btn" data-color="#ffa502" style="background: #ffa502;"></div>
                        <div class="color-btn" data-color="#ff6348" style="background: #ff6348;"></div>
                        <div class="color-btn" data-color="#ffffff" style="background: #ffffff; border: 1px solid #ccc;"></div>
                        <div class="color-btn" data-color="#000000" style="background: #000000;"></div>
                    </div>
                </div>
                
                <div class="tool-section">
                    <label>Tamaño:</label>
                    <input type="range" id="sizeSlider" min="1" max="20" value="3" class="size-slider">
                    <span id="sizeValue">3px</span>
                </div>
                
                <div class="tool-section">
                    <button id="clearAnnotations" class="clear-btn">🗑️ Limpiar Todo</button>
                    <button id="undoAnnotation" class="undo-btn">↶ Deshacer</button>
                </div>
            </div>
        `;

        document.body.appendChild(toolsContainer);
        this.setupToolsEventHandlers();
        this.setupToolsStyles();
    }

    setupToolsEventHandlers() {
        // Tool selection
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = btn.dataset.tool;
                this.updateCursor();
            });
        });

        // Color selection
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentColor = btn.dataset.color;
            });
        });

        // Size slider
        const sizeSlider = document.getElementById('sizeSlider');
        const sizeValue = document.getElementById('sizeValue');
        sizeSlider.addEventListener('input', (e) => {
            this.currentSize = parseInt(e.target.value);
            sizeValue.textContent = `${this.currentSize}px`;
        });

        // Clear and undo
        document.getElementById('clearAnnotations').addEventListener('click', () => {
            this.clearAll();
        });

        document.getElementById('undoAnnotation').addEventListener('click', () => {
            this.undo();
        });
    }

    setupToolsStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .annotation-tools {
                position: fixed;
                top: 70px;
                left: 20px;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(10px);
                border-radius: 12px;
                padding: 15px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                z-index: 9999;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                min-width: 250px;
            }

            .tools-panel {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }

            .tool-section {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .tool-section label {
                font-size: 12px;
                font-weight: 600;
                color: #555;
                text-transform: uppercase;
            }

            .tool-buttons {
                display: flex;
                gap: 5px;
                flex-wrap: wrap;
            }

            .tool-btn {
                width: 35px;
                height: 35px;
                border: 2px solid #e2e8f0;
                border-radius: 8px;
                background: white;
                cursor: pointer;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }

            .tool-btn:hover {
                border-color: #667eea;
                transform: scale(1.05);
            }

            .tool-btn.active {
                border-color: #667eea;
                background: #667eea;
                color: white;
            }

            .color-palette {
                display: flex;
                gap: 5px;
                flex-wrap: wrap;
            }

            .color-btn {
                width: 30px;
                height: 30px;
                border-radius: 50%;
                cursor: pointer;
                border: 3px solid transparent;
                transition: all 0.2s ease;
            }

            .color-btn:hover {
                transform: scale(1.1);
            }

            .color-btn.active {
                border-color: #333;
                transform: scale(1.2);
            }

            .size-slider {
                width: 100%;
                height: 6px;
                border-radius: 3px;
                background: #e2e8f0;
                outline: none;
                cursor: pointer;
            }

            .size-slider::-webkit-slider-thumb {
                appearance: none;
                width: 18px;
                height: 18px;
                border-radius: 50%;
                background: #667eea;
                cursor: pointer;
            }

            #sizeValue {
                font-size: 12px;
                color: #666;
                text-align: center;
            }

            .clear-btn, .undo-btn {
                padding: 8px 12px;
                border: 2px solid #e2e8f0;
                border-radius: 6px;
                background: white;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
                transition: all 0.2s ease;
            }

            .clear-btn:hover {
                border-color: #ff6b6b;
                background: #ff6b6b;
                color: white;
            }

            .undo-btn:hover {
                border-color: #667eea;
                background: #667eea;
                color: white;
            }
        `;
        document.head.appendChild(style);
    }

    startDrawing(e) {
        this.isDrawing = true;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.currentAnnotation = {
            id: this.generateId(),
            tool: this.currentTool,
            color: this.currentColor,
            size: this.currentSize,
            points: [{ x, y }],
            timestamp: Date.now()
        };

        if (this.currentTool === 'text') {
            this.addTextAnnotation(x, y);
        } else {
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
        }
    }

    draw(e) {
        if (!this.isDrawing) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.currentAnnotation.points.push({ x, y });

        this.ctx.lineWidth = this.currentSize;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        switch (this.currentTool) {
            case 'pen':
                this.ctx.globalCompositeOperation = 'source-over';
                this.ctx.strokeStyle = this.currentColor;
                this.ctx.lineTo(x, y);
                this.ctx.stroke();
                break;

            case 'highlighter':
                this.ctx.globalCompositeOperation = 'multiply';
                this.ctx.strokeStyle = this.currentColor + '80'; // Semi-transparent
                this.ctx.lineTo(x, y);
                this.ctx.stroke();
                break;

            case 'eraser':
                this.ctx.globalCompositeOperation = 'destination-out';
                this.ctx.lineTo(x, y);
                this.ctx.stroke();
                break;
        }
    }

    stopDrawing() {
        if (!this.isDrawing) return;
        this.isDrawing = false;

        // Finalizar anotación y enviarla
        if (this.currentAnnotation) {
            this.annotations.push(this.currentAnnotation);
            this.sendAnnotation(this.currentAnnotation);
        }

        this.ctx.globalCompositeOperation = 'source-over';
    }

    addTextAnnotation(x, y) {
        const text = prompt('Ingrese el texto:');
        if (text) {
            this.ctx.font = `${this.currentSize * 5}px Arial`;
            this.ctx.fillStyle = this.currentColor;
            this.ctx.fillText(text, x, y);

            this.currentAnnotation.text = text;
            this.currentAnnotation.points = [{ x, y }];
            this.annotations.push(this.currentAnnotation);
            this.sendAnnotation(this.currentAnnotation);
        }
        this.isDrawing = false;
    }

    sendAnnotation(annotation) {
        this.ws.send(JSON.stringify({
            type: 'annotation',
            data: annotation
        }));
    }

    handleRemoteAnnotation(annotation) {
        this.renderAnnotation(annotation);
        this.annotations.push(annotation);
    }

    renderAnnotation(annotation) {
        this.ctx.save();
        
        this.ctx.lineWidth = annotation.size;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = annotation.color;

        switch (annotation.tool) {
            case 'pen':
                this.ctx.globalCompositeOperation = 'source-over';
                this.drawPath(annotation.points);
                break;

            case 'highlighter':
                this.ctx.globalCompositeOperation = 'multiply';
                this.ctx.strokeStyle = annotation.color + '80';
                this.drawPath(annotation.points);
                break;

            case 'text':
                this.ctx.font = `${annotation.size * 5}px Arial`;
                this.ctx.fillStyle = annotation.color;
                this.ctx.fillText(annotation.text, annotation.points[0].x, annotation.points[0].y);
                break;

            case 'arrow':
                this.drawArrow(annotation.points);
                break;

            case 'rectangle':
                this.drawRectangle(annotation.points);
                break;

            case 'circle':
                this.drawCircle(annotation.points);
                break;
        }

        this.ctx.restore();
    }

    drawPath(points) {
        if (points.length < 2) return;

        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }
        
        this.ctx.stroke();
    }

    drawArrow(points) {
        if (points.length < 2) return;

        const start = points[0];
        const end = points[points.length - 1];
        
        // Línea principal
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(end.x, end.y);
        this.ctx.stroke();

        // Punta de flecha
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const arrowLength = 20;
        
        this.ctx.beginPath();
        this.ctx.moveTo(end.x, end.y);
        this.ctx.lineTo(
            end.x - arrowLength * Math.cos(angle - Math.PI / 6),
            end.y - arrowLength * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.moveTo(end.x, end.y);
        this.ctx.lineTo(
            end.x - arrowLength * Math.cos(angle + Math.PI / 6),
            end.y - arrowLength * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.stroke();
    }

    drawRectangle(points) {
        if (points.length < 2) return;

        const start = points[0];
        const end = points[points.length - 1];
        
        this.ctx.beginPath();
        this.ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
        this.ctx.stroke();
    }

    drawCircle(points) {
        if (points.length < 2) return;

        const start = points[0];
        const end = points[points.length - 1];
        const radius = Math.sqrt(
            Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
        );
        
        this.ctx.beginPath();
        this.ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
        this.ctx.stroke();
    }

    clearAll() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.annotations = [];
        
        this.ws.send(JSON.stringify({
            type: 'annotation_clear'
        }));
    }

    undo() {
        if (this.annotations.length > 0) {
            this.annotations.pop();
            this.redrawAll();
            
            this.ws.send(JSON.stringify({
                type: 'annotation_undo'
            }));
        }
    }

    redrawAll() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.annotations.forEach(annotation => {
            this.renderAnnotation(annotation);
        });
    }

    updateCursor() {
        const cursors = {
            pen: 'crosshair',
            highlighter: 'crosshair',
            arrow: 'crosshair',
            rectangle: 'crosshair',
            circle: 'crosshair',
            text: 'text',
            eraser: 'grab'
        };

        this.canvas.style.cursor = cursors[this.currentTool] || 'default';
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    destroy() {
        // Limpiar event listeners y elementos DOM
        const toolsPanel = document.querySelector('.annotation-tools');
        if (toolsPanel) {
            toolsPanel.remove();
        }
    }
}

module.exports = AnnotationSystem;