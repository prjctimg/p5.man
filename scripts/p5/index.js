#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Starting automata main script...');

// Parse command line arguments
const args = process.argv.slice(2);
const skipTypes = args.includes('--skip-types');
const skipModules = args.includes('--skip-modules');
const skipDocs = args.includes('--skip-docs');

console.log('Arguments:', { skipTypes, skipModules, skipDocs });

try {
  // Generate types if not skipped
  if (!skipTypes) {
    console.log('📝 Generating types...');
    const { execSync } = require('child_process');
    execSync('./scripts/p5/types.sh', { stdio: 'inherit' });
  }

  // Generate modules if not skipped
  if (!skipModules) {
    console.log('📦 Generating modules...');
    const { execSync } = require('child_process');
    execSync('./scripts/p5/assets.sh', { stdio: 'inherit' });
  }

  // Generate docs if not skipped
  if (!skipDocs) {
    console.log('📖 Generating documentation...');
    const { execSync } = require('child_process');
    execSync('./scripts/p5/docs.sh', { stdio: 'inherit' });
  }

  console.log('✅ All tasks completed successfully!');

} catch (error) {
  console.error('❌ Error in main script:', error.message);
  process.exit(1);
}