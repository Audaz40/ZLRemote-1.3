const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class SessionRecorder {
    constructor() {
        this.activeRecordings = new Map();
        this.recordingsDir = path.join(__dirname, '../../recordings');
        this.ensureRecordingsDir();
    }

    ensureRecordingsDir() {
        if (!fs.existsSync(this.recordingsDir)) {
            fs.mkdirSync(this.recordingsDir, { recursive: true });
        }
    }

    startRecording(sessionId, options = {}) {
        const recordingId = uuidv4();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `session_${sessionId}_${timestamp}.mp4`;
        const filepath = path.join(this.recordingsDir, filename);

        const recording = {
            id: recordingId,
            sessionId,
            filename,
            filepath,
            startTime: Date.now(),
            status: 'recording',
            frameBuffer: [],
            audioBuffer: [],
            chatLog: [],
            metadata: {
                resolution: options.resolution || '1920x1080',
                fps: options.fps || 60,
                quality: options.quality || 'high'
            }
        };

        // Configurar FFmpeg stream
        recording.ffmpegProcess = ffmpeg()
            .input('pipe:0')
            .inputFormat('rawvideo')
            .inputOptions([
                `-pix_fmt yuv420p`,
                `-s ${recording.metadata.resolution}`,
                `-r ${recording.metadata.fps}`
            ])
            .outputOptions([
                '-c:v libx264',
                '-preset ultrafast',
                '-crf 18',
                '-movflags +faststart'
            ])
            .output(filepath)
            .on('start', () => {
                console.log(`Recording started: ${recordingId}`);
            })
            .on('error', (err) => {
                console.error(`Recording error: ${err.message}`);
                recording.status = 'error';
            })
            .on('end', () => {
                console.log(`Recording completed: ${recordingId}`);
                recording.status = 'completed';
                this.generateMetadata(recording);
            });

        recording.ffmpegProcess.run();
        this.activeRecordings.set(recordingId, recording);

        return recordingId;
    }

    addFrame(recordingId, frameData) {
        const recording = this.activeRecordings.get(recordingId);
        if (!recording || recording.status !== 'recording') return;

        // Convertir base64 a buffer y escribir al stream de FFmpeg
        const frameBuffer = Buffer.from(frameData, 'base64');
        recording.ffmpegProcess.stdin.write(frameBuffer);
        
        recording.frameBuffer.push({
            timestamp: Date.now(),
            size: frameBuffer.length
        });
    }

    addChatMessage(recordingId, message) {
        const recording = this.activeRecordings.get(recordingId);
        if (!recording) return;

        recording.chatLog.push({
            timestamp: Date.now(),
            ...message
        });
    }

    stopRecording(recordingId) {
        const recording = this.activeRecordings.get(recordingId);
        if (!recording) return null;

        recording.status = 'stopping';
        recording.endTime = Date.now();
        recording.duration = recording.endTime - recording.startTime;

        // Finalizar stream de FFmpeg
        recording.ffmpegProcess.stdin.end();

        return {
            id: recordingId,
            filename: recording.filename,
            duration: recording.duration,
            frameCount: recording.frameBuffer.length
        };
    }

    generateMetadata(recording) {
        const metadata = {
            id: recording.id,
            sessionId: recording.sessionId,
            filename: recording.filename,
            startTime: recording.startTime,
            endTime: recording.endTime,
            duration: recording.duration,
            frameCount: recording.frameBuffer.length,
            chatMessages: recording.chatLog.length,
            ...recording.metadata
        };

        const metadataPath = recording.filepath.replace('.mp4', '.json');
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    }

    getRecordings(sessionId = null) {
        const recordings = [];
        const files = fs.readdirSync(this.recordingsDir);

        files.forEach(file => {
            if (file.endsWith('.json')) {
                const metadataPath = path.join(this.recordingsDir, file);
                const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                
                if (!sessionId || metadata.sessionId === sessionId) {
                    recordings.push(metadata);
                }
            }
        });

        return recordings.sort((a, b) => b.startTime - a.startTime);
    }

    deleteRecording(recordingId) {
        const recordings = this.getRecordings();
        const recording = recordings.find(r => r.id === recordingId);
        
        if (recording) {
            const videoPath = path.join(this.recordingsDir, recording.filename);
            const metadataPath = videoPath.replace('.mp4', '.json');
            
            if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
            if (fs.existsSync(metadataPath)) fs.unlinkSync(metadataPath);
            
            return true;
        }
        
        return false;
    }
}

module.exports = SessionRecorder;