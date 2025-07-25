#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting ZLRemote with CORRECT FLOW...\n');
console.log('=' .repeat(60));
console.log('IMPORTANTE: El flujo correcto es:');
console.log('1. DESKTOP crea la sesión (Host)');
console.log('2. WEB se conecta a esa sesión (Viewer)');
console.log('=' .repeat(60) + '\n');

const processes = [];

// Start server FIRST
console.log('1️⃣ Starting server...');
const server = spawn('node', ['src/server.js'], {
    cwd: path.join(__dirname, 'server'),
    stdio: 'inherit'
});
processes.push(server);

setTimeout(() => {
    // Start desktop app for HOSTING
    console.log('\n2️⃣ Starting Desktop app (for HOSTING)...');
    const desktop = spawn('npm', ['start'], {
        cwd: path.join(__dirname, 'desktop'),
        stdio: 'inherit',
        shell: true
    });
    processes.push(desktop);
}, 3000);

setTimeout(() => {
    // Start web app for VIEWING
    console.log('\n3️⃣ Starting Web app (for VIEWING)...');
    const web = spawn('npm', ['start'], {
        cwd: path.join(__dirname, 'web'),
        stdio: 'inherit',
        shell: true
    });
    processes.push(web);
}, 6000);

setTimeout(() => {
    console.log('\n' + '='.repeat(60));
    console.log('✅ ZLRemote is running!\n');
    console.log('📋 FLUJO CORRECTO:');
    console.log('');
    console.log('PASO 1 - En Desktop App:');
    console.log('  • Click "Start Hosting"');
    console.log('  • Copiar el Session ID (ej: ABC123)');
    console.log('');
    console.log('PASO 2 - En Web App:');
    console.log('  • Click "Join Session"');
    console.log('  • Pegar el Session ID');
    console.log('  • Click "Join"');
    console.log('');
    console.log('❌ NO uses "Host Session" en la Web!');
    console.log('✅ La Web es solo para VER, no para hostear');
    console.log('='.repeat(60) + '\n');
}, 10000);

// Handle shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down ZLRemote...');
    processes.forEach(p => {
        if (!p.killed) {
            p.kill();
        }
    });
    process.exit(0);
});

// Keep running
process.stdin.resume();