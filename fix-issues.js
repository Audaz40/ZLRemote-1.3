#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing ZLRemote issues...\n');

// 1. Crear directorio web/src si no existe
const webSrcDir = path.join(__dirname, 'web', 'src');
if (!fs.existsSync(webSrcDir)) {
    fs.mkdirSync(webSrcDir, { recursive: true });
    console.log('✅ Created web/src directory');
}

// 2. Crear directorio web/src/styles si no existe
const stylesDir = path.join(webSrcDir, 'styles');
if (!fs.existsSync(stylesDir)) {
    fs.mkdirSync(stylesDir, { recursive: true });
    console.log('✅ Created web/src/styles directory');
}

// 3. Copiar main-safe.js como main.js temporalmente
const mainSafePath = path.join(__dirname, 'desktop', 'src', 'main-safe.js');
const mainPath = path.join(__dirname, 'desktop', 'src', 'main.js');

if (fs.existsSync(mainSafePath)) {
    fs.copyFileSync(mainSafePath, mainPath);
    console.log('✅ Using safe main.js (without robotjs)');
}

// 4. Reinstalar dependencias problemáticas
console.log('\n📦 Reinstalling problematic dependencies...');

try {
    // Reinstalar dependencias de desktop sin robotjs
    console.log('Installing desktop dependencies...');
    execSync('npm install', { 
        cwd: path.join(__dirname, 'desktop'),
        stdio: 'inherit' 
    });

    // Reinstalar dependencias de web
    console.log('Installing web dependencies...');
    execSync('npm install', { 
        cwd: path.join(__dirname, 'web'),
        stdio: 'inherit' 
    });

} catch (error) {
    console.error('❌ Error installing dependencies:', error.message);
}

console.log('\n🎉 Issues fixed! Try running npm run dev again.');
console.log('\n⚠️  Note: Mouse/keyboard simulation is disabled until robotjs is fixed.');
console.log('💡 To fix robotjs: cd desktop && npm rebuild robotjs');