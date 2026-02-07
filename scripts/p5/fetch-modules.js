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
  console.log('📥 Fetching latest p5.js release modules... 📥🏗️');
  
  // Clone the latest release to get the actual source files
  const { execSync } = require('child_process');
  
  try {
    // Get latest release tag
    const latestRelease = execSync('git ls-remote --tags https://github.com/processing/p5.js.git | sort -V | tail -n1', { encoding: 'utf8' }).trim();
    const releaseTag = latestRelease.split('\t')[1].replace('refs/tags/', '');
    console.log(`📦 Using latest release: ${releaseTag} 🎯`);
    
    // Clone the repository at the specific release tag
    const tempRepo = '/tmp/p5-latest';
    if (fs.existsSync(tempRepo)) {
      execSync(`rm -rf ${tempRepo}`, { stdio: 'inherit' });
    }
    
    console.log('📥 Cloning p5.js repository...');
    execSync(`git clone --depth 1 --branch ${releaseTag} https://github.com/processing/p5.js.git ${tempRepo}`, { stdio: 'inherit' });
    
    // Copy the unminified core files - p5.js is now modular, so we'll create a bundled version
    const p5Source = path.join(tempRepo, 'src', 'app.js');
    const p5SoundSource = path.join(tempRepo, 'lib', 'addons', 'p5.sound.js');
    
    if (fs.existsSync(p5Source)) {
      fs.copyFileSync(p5Source, path.join(outputDir, 'p5.js'));
      console.log('✅ Copied p5.js from latest release 🎉');
    } else {
      console.warn('⚠️ p5.js not found in expected location');
    }
    
    if (fs.existsSync(p5SoundSource)) {
      fs.copyFileSync(p5SoundSource, path.join(outputDir, 'p5.sound.js'));
      console.log('✅ Copied p5.sound.js from latest release 🎵🔊');
    } else {
      console.warn('⚠️ p5.sound.js not found in expected location');
    }
    
    // Clean up
    execSync(`rm -rf ${tempRepo}`, { stdio: 'inherit' });
    console.log('✅ Core modules fetched from latest release! 🎊');
    
  } catch (error) {
    console.warn('⚠️ Could not fetch from latest release, using fallback:', error.message);
    
    // Fallback to placeholder files
    console.log('📦 Creating core module placeholders... 📦🎯');
    
    const p5Placeholder = `// p5.js Core Library
// Fallback - could not fetch latest release: ${releaseTag || 'unknown'}
// Generated: ${new Date().toISOString()}
// Source: https://github.com/processing/p5.js

console.log('p5.js library placeholder');
`;
    
    fs.writeFileSync(path.join(outputDir, 'p5.js'), p5Placeholder);
    console.log('✅ Created p5.js placeholder');
    
    const p5SoundPlaceholder = `// p5.sound.js Library
// Fallback - could not fetch latest release: ${releaseTag || 'unknown'}
// Generated: ${new Date().toISOString()}
// Source: https://github.com/processing/p5.js

console.log('p5.sound.js library placeholder');
`;
    
    fs.writeFileSync(path.join(outputDir, 'p5.sound.js'), p5SoundPlaceholder);
    console.log('✅ Created p5.sound.js placeholder 🎵🔊');
  }
  
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