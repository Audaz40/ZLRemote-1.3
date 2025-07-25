#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const dirsToClean = [
  'dist',
  'build',
  'logs',
  'recordings',
  'uploads',
  'temp',
  'server/node_modules',
  'desktop/node_modules',
  'web/node_modules',
  'mobile/node_modules',
  'desktop/dist',
  'web/build',
  'mobile/android/app/build',
  'mobile/ios/build',
];

function deleteFolderRecursive(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
    console.log(`🗑️  Deleted: ${dirPath}`);
  }
}

console.log('🧹 Cleaning ZLRemote project...\n');

dirsToClean.forEach(dir => {
  deleteFolderRecursive(dir);
});

console.log('\n✨ Project cleaned successfully!');
console.log('Run npm run setup to reinstall dependencies.');