#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🌍 Setting up ZLRemote for Production...\n');

const domain = process.argv[2] || 'your-domain.com';
const email = process.argv[3] || 'admin@your-domain.com';

console.log(`Domain: ${domain}`);
console.log(`Email: ${email}\n`);

const steps = [
    {
        name: 'Installing dependencies',
        action: () => {
            console.log('📦 Installing production dependencies...');
            execSync('npm install --production', { stdio: 'inherit' });
        }
    },
    {
        name: 'Setting up SSL certificates',
        action: () => {
            setupSSL(domain, email);
        }
    },
    {
        name: 'Configuring TURN server',
        action: () => {
            setupTURNServer(domain);
        }
    },
    {
        name: 'Building applications',
        action: () => {
            console.log('🔨 Building applications...');
            execSync('npm run build', { stdio: 'inherit' });
        }
    },
    {
        name: 'Setting up firewall',
        action: () => {
            setupFirewall();
        }
    },
    {
        name: 'Creating production environment',
        action: () => {
            createProductionEnv(domain);
        }
    }
];

async function runSetup() {
    for (const step of steps) {
        try {
            console.log(`\n⏳ ${step.name}...`);
            await step.action();
            console.log(`✅ ${step.name} completed`);
        } catch (error) {
            console.error(`❌ Error in ${step.name}:`, error.message);
            process.exit(1);
        }
    }

    console.log('\n🎉 Production setup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Update DNS records to point to this server');
    console.log('2. Start the production services: docker-compose -f deploy/production.yml up -d');
    console.log('3. Test the connection: https://your-domain.com/health');
    console.log('\n🚀 ZLRemote is ready for production!');
}

function setupSSL(domain, email) {
    console.log('🔒 Setting up SSL certificates with Let\'s Encrypt...');
    
    try {
        // Install certbot if not available
        execSync('which certbot || apt-get update && apt-get install -y certbot', { stdio: 'inherit' });
        
        // Create SSL directory
        fs.mkdirSync('./ssl', { recursive: true });
        
        // Generate certificates
        execSync(`certbot certonly --standalone --email ${email} --agree-tos --no-eff-email -d ${domain}`, { stdio: 'inherit' });
        
        // Copy certificates to our SSL directory
        execSync(`cp /etc/letsencrypt/live/${domain}/privkey.pem ./ssl/private.key`);
        execSync(`cp /etc/letsencrypt/live/${domain}/fullchain.pem ./ssl/certificate.crt`);
        execSync(`cp /etc/letsencrypt/live/${domain}/chain.pem ./ssl/ca.crt`);
        
        console.log('✅ SSL certificates installed');
    } catch (error) {
        console.warn('⚠️  SSL setup failed, using self-signed certificates');
        generateSelfSignedCerts(domain);
    }
}

function generateSelfSignedCerts(domain) {
    console.log('🔒 Generating self-signed certificates...');
    
    fs.mkdirSync('./ssl', { recursive: true });
    
    execSync(`openssl req -x509 -newkey rsa:4096 -keyout ./ssl/private.key -out ./ssl/certificate.crt -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=${domain}"`);
    execSync(`cp ./ssl/certificate.crt ./ssl/ca.crt`);
}

function setupTURNServer(domain) {
    console.log('🔄 Setting up TURN server configuration...');
    
    const turnPassword = generatePassword();
    
    const coturnConfig = `
listening-port=3478
tls-listening-port=5349
relay-ip=${getPublicIP()}
external-ip=${getPublicIP()}
realm=${domain}
server-name=${domain}
lt-cred-mech
user=zlremote:${turnPassword}
cert=/etc/ssl/coturn/certificate.crt
pkey=/etc/ssl/coturn/private.key
log-file=/var/log/turnserver.log
verbose
fingerprint
no-multicast-peers
no-cli
no-tlsv1
no-tlsv1_1
min-port=49152
max-port=65535
`;

    fs.writeFileSync('./deploy/coturn.conf', coturnConfig);
    
    // Save TURN password to environment
    const envContent = fs.readFileSync('.env', 'utf8');
    const updatedEnv = envContent.replace(/TURN_PASSWORD=.*/, `TURN_PASSWORD=${turnPassword}`);
    fs.writeFileSync('.env', updatedEnv);
    
    console.log('✅ TURN server configured');
}

function setupFirewall() {
    console.log('🔥 Setting up firewall rules...');
    
    try {
        // Allow necessary ports
        execSync('ufw allow 80/tcp');     // HTTP
        execSync('ufw allow 443/tcp');    // HTTPS
        execSync('ufw allow 3478/udp');   // STUN
        execSync('ufw allow 5349/tcp');   // TURNS
        execSync('ufw allow 49152:65535/udp'); // TURN data ports
        execSync('ufw --force enable');
        
        console.log('✅ Firewall configured');
    } catch (error) {
        console.warn('⚠️  Firewall setup failed (may need manual configuration)');
    }
}

function createProductionEnv(domain) {
    const envContent = `
# Production Environment
NODE_ENV=production
DOMAIN=${domain}
PORT=443
HTTP_PORT=80

# SSL Configuration
SSL_KEY_PATH=/app/ssl/private.key
SSL_CERT_PATH=/app/ssl/certificate.crt
SSL_CA_PATH=/app/ssl/ca.crt

# TURN Configuration
TURN_USERNAME=zlremote
TURN_PASSWORD=${generatePassword()}

# Security
JWT_SECRET=${generatePassword(32)}
API_SECRET=${generatePassword(32)}

# Logging
LOG_LEVEL=info
LOG_FILE=/app/logs/production.log

# Performance
MAX_CONNECTIONS=1000
MAX_SESSIONS=100
ENABLE_COMPRESSION=true
ENABLE_ANTI_LAG=true
`;

    fs.writeFileSync('.env.production', envContent);
    console.log('✅ Production environment created');
}

function getPublicIP() {
    try {
        const ip = execSync('curl -s http://ipecho.net/plain', { encoding: 'utf8' });
        return ip.trim();
    } catch (error) {
        return '0.0.0.0';
    }
}

function generatePassword(length = 16) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

runSetup().catch(console.error);