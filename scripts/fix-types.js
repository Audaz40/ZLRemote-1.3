#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing TypeScript configuration issues...\n');

// 1. Crear archivos tsconfig faltantes
const tsconfigFiles = [
    {
        path: 'server/tsconfig.json',
        content: {
            "extends": "../tsconfig.json",
            "compilerOptions": {
                "outDir": "./dist",
                "rootDir": "./src",
                "module": "commonjs",
                "target": "es2020",
                "moduleResolution": "node",
                "esModuleInterop": true,
                "allowSyntheticDefaultImports": true,
                "strict": false,
                "skipLibCheck": true,
                "forceConsistentCasingInFileNames": true,
                "resolveJsonModule": true,
                "declaration": false,
                "types": ["node"]
            },
            "include": ["src/**/*", "../shared/**/*"],
            "exclude": ["node_modules", "dist", "**/*.test.js"]
        }
    },
    {
        path: 'web/tsconfig.json',
        content: {
            "extends": "../tsconfig.json",
            "compilerOptions": {
                "target": "es5",
                "lib": ["dom", "dom.iterable", "es6"],
                "allowJs": true,
                "skipLibCheck": true,
                "esModuleInterop": true,
                "allowSyntheticDefaultImports": true,
                "strict": false,
                "forceConsistentCasingInFileNames": true,
                "noFallthroughCasesInSwitch": true,
                "module": "esnext",
                "moduleResolution": "node",
                "resolveJsonModule": true,
                "isolatedModules": true,
                "noEmit": true,
                "jsx": "react-jsx"
            },
            "include": ["src/**/*", "../shared/**/*"],
            "exclude": ["node_modules"]
        }
    },
    {
        path: 'desktop/tsconfig.json',
        content: {
            "extends": "../tsconfig.json",
            "compilerOptions": {
                "outDir": "./dist",
                "rootDir": "./src",
                "module": "commonjs",
                "target": "es2020",
                "moduleResolution": "node",
                "esModuleInterop": true,
                "allowSyntheticDefaultImports": true,
                "strict": false,
                "skipLibCheck": true,
                "forceConsistentCasingInFileNames": true,
                "resolveJsonModule": true,
                "declaration": false,
                "types": ["node", "electron"]
            },
            "include": ["src/**/*", "../shared/**/*"],
            "exclude": ["node_modules", "dist"]
        }
    }
];

tsconfigFiles.forEach(file => {
    const filePath = path.join(__dirname, '..', file.path);
    const dir = path.dirname(filePath);
    
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, JSON.stringify(file.content, null, 2));
    console.log(`✅ Created ${file.path}`);
});

// 2. Actualizar tsconfig principal
const mainTsconfig = {
    "compilerOptions": {
        "target": "ES2020",
        "lib": ["dom", "dom.iterable", "es6"],
        "allowJs": true,
        "skipLibCheck": true,
        "esModuleInterop": true,
        "allowSyntheticDefaultImports": true,
        "strict": false,
        "forceConsistentCasingInFileNames": true,
        "module": "esnext",
        "moduleResolution": "node",
        "resolveJsonModule": true,
        "isolatedModules": false,
        "noEmit": true,
        "jsx": "react-jsx",
        "declaration": false,
        "declarationMap": false,
        "sourceMap": false,
        "baseUrl": ".",
        "paths": {
            "@shared/*": ["./shared/*"],
            "@server/*": ["./server/src/*"],
            "@web/*": ["./web/src/*"],
            "@desktop/*": ["./desktop/src/*"],
            "@mobile/*": ["./mobile/src/*"]
        }
    },
    "include": ["shared/**/*"],
    "exclude": ["node_modules", "dist", "build", "**/node_modules", "**/dist", "**/build"]
};

fs.writeFileSync(path.join(__dirname, '..', 'tsconfig.json'), JSON.stringify(mainTsconfig, null, 2));
console.log('✅ Updated main tsconfig.json');

console.log('\n🎉 TypeScript configuration fixed!');
console.log('Now try running: npm run dev');