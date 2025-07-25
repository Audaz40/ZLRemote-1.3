#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const config = {
  platforms: ['desktop', 'mobile', 'tv', 'web'],
  buildDir: 'dist',
  version: process.env.VERSION || '1.0.0'
};

class ZLRemoteBuilder {
  constructor() {
    this.startTime = Date.now();
    console.log('🚀 Starting ZLRemote build process...\n');
  }

  async buildAll() {
    try {
      await this.cleanBuildDir();
      await this.buildServer();
      await this.buildDesktop();
      await this.buildMobile();
      await this.buildTV();
      await this.buildWeb();
      await this.createDistributable();
      
      const buildTime = ((Date.now() - this.startTime) / 1000).toFixed(2);
      console.log(`\n✅ Build completed successfully in ${buildTime}s`);
    } catch (error) {
      console.error('❌ Build failed:', error);
      process.exit(1);
    }
  }

  async cleanBuildDir() {
    console.log('🧹 Cleaning build directory...');
    if (fs.existsSync(config.buildDir)) {
      fs.rmSync(config.buildDir, { recursive: true });
    }
    fs.mkdirSync(config.buildDir, { recursive: true });
  }

  async buildServer() {
    console.log('📦 Building server...');
    
    // Copiar archivos del servidor
    this.copyDirectory('server', path.join(config.buildDir, 'server'));
    
    // Instalar dependencias de producción
    execSync('npm ci --only=production', {
      cwd: path.join(config.buildDir, 'server'),
      stdio: 'inherit'
    });
    
    console.log('✅ Server build complete');
  }

  async buildDesktop() {
    console.log('🖥️  Building desktop app...');
    
    // Electron build
    execSync('npm run build', {
      cwd: 'desktop',
      stdio: 'inherit'
    });
    
    // Copiar builds
    this.copyDirectory('desktop/dist', path.join(config.buildDir, 'desktop'));
    
    console.log('✅ Desktop build complete');
  }

  async buildMobile() {
    console.log('📱 Building mobile app...');
    
    // React Native Android
    execSync('cd mobile && npx react-native build-android --mode=release', {
      stdio: 'inherit'
    });
    
    // React Native iOS (si estamos en macOS)
    if (process.platform === 'darwin') {
      execSync('cd mobile && npx react-native build-ios --mode=Release', {
        stdio: 'inherit'
      });
    }
    
    // Copiar APKs/IPAs
    const mobileBuildDir = path.join(config.buildDir, 'mobile');
    fs.mkdirSync(mobileBuildDir, { recursive: true });
    
    // Copiar Android APK
    if (fs.existsSync('mobile/android/app/build/outputs/apk/release')) {
      this.copyDirectory(
        'mobile/android/app/build/outputs/apk/release',
        path.join(mobileBuildDir, 'android')
      );
    }
    
    console.log('✅ Mobile build complete');
  }

  async buildTV() {
    console.log('📺 Building TV app...');
    
    const tvBuildDir = path.join(config.buildDir, 'tv');
    this.copyDirectory('tv', tvBuildDir);
    
    // Minificar archivos
    const html = fs.readFileSync(path.join(tvBuildDir, 'public/index.html'), 'utf8');
    const minifiedHTML = html.replace(/\s+/g, ' ').trim();
    fs.writeFileSync(path.join(tvBuildDir, 'public/index.html'), minifiedHTML);
    
    console.log('✅ TV build complete');
  }

  async buildWeb() {
    console.log('🌐 Building web app...');
    
    // Build web version
    execSync('npm run build', {
      cwd: 'web',
      stdio: 'inherit'
    });
    
    this.copyDirectory('web/build', path.join(config.buildDir, 'web'));
    
    console.log('✅ Web build complete');
  }

  async createDistributable() {
    console.log('📦 Creating distributable packages...');
    
    // Crear archivos de instalación
    const installerDir = path.join(config.buildDir, 'installers');
    fs.mkdirSync(installerDir, { recursive: true });
    
    // Windows Installer
    this.createWindowsInstaller(installerDir);
    
    // macOS Installer
    if (process.platform === 'darwin') {
      this.createMacInstaller(installerDir);
    }
    
    // Linux Package
    this.createLinuxPackage(installerDir);
    
    // Docker containers
    this.createDockerFiles();
    
    console.log('✅ Distributables created');
  }

  createWindowsInstaller(dir) {
    const installerScript = `
@echo off
echo Installing ZLRemote...
mkdir "%PROGRAMFILES%\\ZLRemote"
xcopy /E /I "server" "%PROGRAMFILES%\\ZLRemote\\server"
xcopy /E /I "desktop" "%PROGRAMFILES%\\ZLRemote\\desktop"
echo ZLRemote installed successfully!
pause
    `;
    
    fs.writeFileSync(path.join(dir, 'install-windows.bat'), installerScript);
  }

  createMacInstaller(dir) {
    const installerScript = `#!/bin/bash
echo "Installing ZLRemote..."
sudo mkdir -p "/Applications/ZLRemote"
sudo cp -R server "/Applications/ZLRemote/"
sudo cp -R desktop "/Applications/ZLRemote/"
echo "ZLRemote installed successfully!"
    `;
    
    fs.writeFileSync(path.join(dir, 'install-macos.sh'), installerScript);
    fs.chmodSync(path.join(dir, 'install-macos.sh'), '755');
  }

  createLinuxPackage(dir) {
    const installerScript = `#!/bin/bash
echo "Installing ZLRemote..."
sudo mkdir -p "/opt/zlremote"
sudo cp -R server "/opt/zlremote/"
sudo cp -R desktop "/opt/zlremote/"
sudo ln -sf "/opt/zlremote/desktop/zlremote" "/usr/local/bin/zlremote"
echo "ZLRemote installed successfully!"
    `;
    
    fs.writeFileSync(path.join(dir, 'install-linux.sh'), installerScript);
    fs.chmodSync(path.join(dir, 'install-linux.sh'), '755');
  }

  createDockerFiles() {
    const dockerDir = path.join(config.buildDir, 'docker');
    fs.mkdirSync(dockerDir, { recursive: true });
    
    // Dockerfile para servidor
    const serverDockerfile = `
FROM node:18-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/ ./
EXPOSE 3001
CMD ["npm", "start"]
    `;
    
    fs.writeFileSync(path.join(dockerDir, 'Dockerfile.server'), serverDockerfile);
    
    // Docker Compose
    const dockerCompose = `
version: '3.8'
services:
  zlremote-server:
    build:
      context: .
      dockerfile: Dockerfile.server
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    
  zlremote-web:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./web:/usr/share/nginx/html:ro
    depends_on:
      - zlremote-server
    restart: unless-stopped
    `;
    
    fs.writeFileSync(path.join(dockerDir, 'docker-compose.yml'), dockerCompose);
  }

  copyDirectory(src, dest) {
    if (!fs.existsSync(src)) return;
    
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    
    entries.forEach(entry => {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    });
  }
}

// Ejecutar build si es llamado directamente
if (require.main === module) {
  new ZLRemoteBuilder().buildAll();
}

module.exports = ZLRemoteBuilder;