#!/bin/bash

set -e

echo "🚀 ZLRemote Quick Start"
echo "======================="

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) found"

# Verificar FFmpeg (opcional)
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  FFmpeg not found. Recording features will be disabled."
    echo "Install FFmpeg from https://ffmpeg.org/ to enable recording."
else
    echo "✅ FFmpeg found"
fi

# Setup inicial
echo ""
echo "📦 Setting up ZLRemote..."
npm run setup

# Crear script de inicio
cat > start-zlremote.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting ZLRemote..."

# Verificar que el servidor esté disponible
echo "Starting server..."
cd server && npm start &
SERVER_PID=$!

# Esperar a que el servidor esté listo
sleep 3

# Iniciar aplicación web
echo "Starting web application..."
cd ../web && npm start &
WEB_PID=$!

# Función para manejar Ctrl+C
cleanup() {
    echo ""
    echo "🛑 Stopping ZLRemote..."
    kill $SERVER_PID 2>/dev/null || true
    kill $WEB_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

echo ""
echo "✅ ZLRemote is running!"
echo "📱 Web App: http://localhost:3000"
echo "🖥️  Desktop App: Run 'cd desktop && npm start' in another terminal"
echo "📱 Mobile App: Run 'cd mobile && npm run android' in another terminal"
echo ""
echo "Press Ctrl+C to stop all services"

# Esperar a que terminen los procesos
wait $SERVER_PID $WEB_PID
EOF

chmod +x start-zlremote.sh

echo ""
echo "🎉 Setup complete!"
echo ""
echo "🚀 To start ZLRemote:"
echo "   ./start-zlremote.sh"
echo ""
echo "🛠️  For development:"
echo "   npm run dev"
echo ""
echo "📖 Documentation:"
echo "   docs/README.md"