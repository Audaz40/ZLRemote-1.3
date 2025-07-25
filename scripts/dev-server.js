#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Verificar que existe .env
if (!fs.existsSync('.env')) {
    console.error('❌ .env file not found. Run npm run setup first.');
    process.exit(1);
}

console.log('🚀 Starting ZLRemote development servers...\n');

const processes = [];

// Servidor principal
const server = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, '../server'),
    stdio: ['inherit', 'pipe', 'pipe']
});

server.stdout.on('data', (data) => {
    console.log(`[SERVER] ${data.toString().trim()}`);
});

server.stderr.on('data', (data) => {
    console.error(`[SERVER ERROR] ${data.toString().trim()}`);
});

processes.push(server);

// Esperar un poco antes de iniciar el siguiente
setTimeout(() => {
    // Aplicación web
    const web = spawn('npm', ['start'], {
        cwd: path.join(__dirname, '../web'),
        stdio: ['inherit', 'pipe', 'pipe']
    });

    web.stdout.on('data', (data) => {
        console.log(`[WEB] ${data.toString().trim()}`);
    });

    web.stderr.on('data', (data) => {
        console.error(`[WEB ERROR] ${data.toString().trim()}`);
    });

    processes.push(web);
}, 2000);

// Aplicación desktop (opcional)
setTimeout(() => {
    if (process.argv.includes('--with-desktop')) {
        const desktop = spawn('npm', ['start'], {
            cwd: path.join(__dirname, '../desktop'),
            stdio: ['inherit', 'pipe', 'pipe']
        });

        desktop.stdout.on('data', (data) => {
            console.log(`[DESKTOP] ${data.toString().trim()}`);
        });

        desktop.stderr.on('data', (data) => {
            console.error(`[DESKTOP ERROR] ${data.toString().trim()}`);
        });

        processes.push(desktop);
    }
}, 4000);

// Manejar cierre limpio
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down servers...');
    processes.forEach(proc => {
        if (!proc.killed) {
            proc.kill('SIGINT');
        }
    });
    process.exit(0);
});

process.on('SIGTERM', () => {
    processes.forEach(proc => {
        if (!proc.killed) {
            proc.kill('SIGTERM');
        }
    });
    process.exit(0);
});

console.log('📝 Logs will appear below. Press Ctrl+C to stop all servers.\n');