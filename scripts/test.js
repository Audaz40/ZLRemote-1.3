#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Running ZLRemote Test Suite...\n');

const testCommands = [
  {
    name: 'Server Tests',
    command: 'npm',
    args: ['test'],
    cwd: path.join(__dirname, '../server'),
  },
  {
    name: 'Web Tests',
    command: 'npm',
    args: ['test', '--', '--watchAll=false'],
    cwd: path.join(__dirname, '../web'),
  },
  {
    name: 'Desktop Tests',
    command: 'npm',
    args: ['test'],
    cwd: path.join(__dirname, '../desktop'),
  },
  {
    name: 'Shared Tests',
    command: 'npm',
    args: ['test'],
    cwd: path.join(__dirname, '../'),
  },
];

async function runTests() {
  for (const test of testCommands) {
    console.log(`\n🔬 Running ${test.name}...`);
    
    try {
      await new Promise((resolve, reject) => {
        const proc = spawn(test.command, test.args, {
          cwd: test.cwd,
          stdio: 'inherit'
        });
        
        proc.on('close', (code) => {
          if (code === 0) {
            console.log(`✅ ${test.name} passed`);
            resolve();
          } else {
            console.log(`❌ ${test.name} failed`);
            reject(new Error(`Test failed with code ${code}`));
          }
        });
      });
    } catch (error) {
      console.error(`💥 ${test.name} failed:`, error.message);
      process.exit(1);
    }
  }
  
  console.log('\n🎉 All tests passed!');
}

runTests().catch(console.error);