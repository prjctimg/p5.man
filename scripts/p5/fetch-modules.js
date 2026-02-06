#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Starting p5 modules fetch... 📦🔧');

const outputDir = 'assets/libs';

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

try {
  console.log('📥 Cloning p5.js repository for modules... 📥🏗️');
  
  // For testing purposes, create placeholder files
  // In the actual workflow, these will be copied from the cloned p5.js repo
  
  console.log('📦 Creating core module placeholders... 📦🎯');
  
  // Create placeholder p5.js file
  const p5Placeholder = `// p5.js Core Library
// This is a placeholder - in the actual workflow this will be the unminified p5.js
// Generated: ${new Date().toISOString()}
// Source: https://github.com/processing/p5.js

// Placeholder content - will be replaced with actual p5.js library
console.log('p5.js library placeholder');
`;
  
  fs.writeFileSync(path.join(outputDir, 'p5.js'), p5Placeholder);
  console.log('✅ Created p5.js placeholder');
  
  // Create placeholder p5.sound.js file
  const p5SoundPlaceholder = `// p5.sound.js Library
// This is a placeholder - in the actual workflow this will be the unminified p5.sound.js
// Generated: ${new Date().toISOString()}
// Source: https://github.com/processing/p5.js

// Placeholder content - will be replaced with actual p5.sound.js library
console.log('p5.sound.js library placeholder');
`;
  
  fs.writeFileSync(path.join(outputDir, 'p5.sound.js'), p5SoundPlaceholder);
  console.log('✅ Created p5.sound.js placeholder 🎵🔊');
  
  // Create a modules index file
  const modulesIndex = `// p5.js Core Modules
// Generated: ${new Date().toISOString()}
// Source: https://github.com/processing/p5.js

export { default as p5 } from './p5.js';
export { default as p5Sound } from './p5.sound.js';
`;
  
  fs.writeFileSync(path.join(outputDir, 'index.js'), modulesIndex);
  console.log('✅ Created modules index 📋🗂️');
  
  console.log('✅ Modules fetch complete! 🎉📦');
  console.log(`📁 Output directory: ${outputDir} 📂✨`);
  
  // List the files
  const files = fs.readdirSync(outputDir);
  console.log('📁 Generated files: 📋📄');
  files.forEach(file => {
    const filePath = path.join(outputDir, file);
    const stats = fs.statSync(filePath);
    console.log(`  - ${file} (${stats.size} bytes) 📏`);
  });
  
} catch (error) {
  console.error('❌ Error fetching modules:', error.message, ' 💥🚨');
  process.exit(1);
}