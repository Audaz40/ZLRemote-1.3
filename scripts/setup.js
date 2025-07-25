#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up ZLRemote...\n');

const steps = [
    {
        name: 'Creating environment file',
        action: () => {
            if (!fs.existsSync('.env')) {
                fs.copyFileSync('.env.example', '.env');
                console.log('✅ Created .env file');
            } else {
                console.log('⚠️  .env file already exists');
            }
        }
    },
    {
        name: 'Creating directories',
        action: () => {
            const dirs = ['logs', 'recordings', 'uploads', 'temp'];
            dirs.forEach(dir => {
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                    console.log(`✅ Created ${dir}/ directory`);
                }
            });
        }
    },
    {
        name: 'Installing server dependencies',
        action: () => {
            console.log('📦 Installing server dependencies...');
            execSync('npm install', { cwd: 'server', stdio: 'inherit' });
        }
    },
    {
        name: 'Installing desktop dependencies',
        action: () => {
            console.log('📦 Installing desktop dependencies...');
            execSync('npm install', { cwd: 'desktop', stdio: 'inherit' });
        }
    },
    {
        name: 'Installing web dependencies',
        action: () => {
            console.log('📦 Installing web dependencies...');
            execSync('npm install', { cwd: 'web', stdio: 'inherit' });
        }
    },
    {
        name: 'Building shared modules',
        action: () => {
            console.log('🔧 Building shared modules...');
            // Aquí puedes agregar lógica para compilar módulos compartidos
        }
    }
];

async function runSetup() {
    for (const step of steps) {
        try {
            console.log(`\n⏳ ${step.name}...`);
            await step.action();
        } catch (error) {
            console.error(`❌ Error in ${step.name}:`, error.message);
            process.exit(1);
        }
    }

    console.log('\n🎉 Setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Review and update the .env file with your configuration');
    console.log('2. Start the server: npm run dev:server');
    console.log('3. Start the desktop app: npm run dev:desktop');
    console.log('4. Open web interface: npm run dev:web');
    console.log('\n🚀 Happy coding!');
}

runSetup().catch(console.error);