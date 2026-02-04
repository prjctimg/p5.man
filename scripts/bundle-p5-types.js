#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Starting p5 type bundling...');

const outputDir = 'assets/types';
const outputFile = path.join(outputDir, 'index.d.ts');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function resolveReferences(content, basePath) {
  const referenceRegex = /\/\/\/\s*<reference\s+path="([^"]+)"\s*\/>/g;
  let resolvedContent = content;
  let match;
  const processedFiles = new Set();
  
  while ((match = referenceRegex.exec(content)) !== null) {
    const refPath = match[1];
    const fullRefPath = path.resolve(basePath, refPath);
    
    if (!processedFiles.has(fullRefPath) && fs.existsSync(fullRefPath)) {
      try {
        const refContent = fs.readFileSync(fullRefPath, 'utf8');
        // Recursively resolve nested references
        const resolvedRefContent = resolveReferences(refContent, path.dirname(fullRefPath));
        
        // Fix module declarations that might have incorrect paths
        let cleanedRefContent = resolvedRefContent.replace(/declare module '[^']*'/g, '// Module declaration removed');
        cleanedRefContent = cleanedRefContent.replace(/import p5 = require\("\.\.\/[^"]*"\);?/g, '');
        
        resolvedContent = resolvedContent.replace(match[0], `// Inlined from: ${refPath}\n${cleanedRefContent}`);
        processedFiles.add(fullRefPath);
      } catch (error) {
        console.warn(`⚠️  Could not resolve reference: ${refPath} (${error.message})`);
        resolvedContent = resolvedContent.replace(match[0], `// Failed to resolve: ${refPath}`);
      }
    }
  }
  
  return resolvedContent;
}

try {
  console.log('📖 Reading p5 type files...');
  
  // Step 1: Read and resolve all references in the main index.d.ts
  const indexPath = 'node_modules/@types/p5/index.d.ts';
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  console.log('🔗 Resolving type references...');
  const resolvedIndexContent = resolveReferences(indexContent, path.dirname(indexPath));
  
  // Step 2: Read global declarations
  console.log('🌍 Reading global declarations...');
  const globalPath = 'node_modules/@types/p5/global.d.ts';
  const globalContent = fs.readFileSync(globalPath, 'utf8');
  
  // Step 3: Remove the global import from index.d.ts since we'll handle it separately
  const cleanIndexContent = resolvedIndexContent.replace(/import\s+p5\s*=\s*require\("\.\/index"\);?/, '');
  
  // Step 4: Create combined output with both global and namespace support
  console.log('🔗 Combining global and namespace types...');
  
  const combinedContent = `// Generated p5.js Type Definitions
// This file provides both global and p5 namespace support
// Generated: ${new Date().toISOString()}
// Original source: @types/p5 package

// ============================================================================
// P5 NAMESPACE SUPPORT
// Use: import p5 from 'p5'; const instance = new p5();
// ============================================================================
${cleanIndexContent}

// ============================================================================
// GLOBAL SUPPORT  
// Use: createCanvas(400, 300); // directly available in global scope
// ============================================================================
${globalContent}

// ============================================================================
// DUAL EXPORT SUPPORT
// Supports both import styles for maximum compatibility
// ============================================================================
export * from './index';
export * from './global';
export as namespace p5;
export = p5;
`;

  // Step 5: Write the final combined file
  fs.writeFileSync(outputFile, combinedContent);
  
  console.log('✅ Type bundling complete!');
  console.log(`📁 Output written to: ${outputFile}`);
  
  // Verify file exists and has content
  const stats = fs.statSync(outputFile);
  console.log(`📊 File size: ${stats.size} bytes`);
  console.log(`📝 Lines of code: ${combinedContent.split('\n').length}`);
  
} catch (error) {
  console.error('❌ Error bundling types:', error.message);
  process.exit(1);
}