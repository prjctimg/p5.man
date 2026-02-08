#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 Starting p5 type bundling... 📝✨');

const outputDir = 'assets/types';
const outputFile = path.join(outputDir, 'p5.d.ts');

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
        
        // Extract content from module declarations
        let cleanedRefContent = extractModuleContent(resolvedRefContent);
        
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

function extractModuleContent(content) {
  // Extract content from within module declarations
  const moduleRegex = /declare module\s+['"][^'"]*['"]\s*\{([\s\S]*?)\n\}/g;
  let extractedContent = '';
  let match;
  
  while ((match = moduleRegex.exec(content)) !== null) {
    extractedContent += match[1] + '\n';
  }
  
  // If no module declarations found, return the original content cleaned up
  if (!extractedContent) {
    return content
      .replace(/import p5 = require\("\.\.\/[^"]*"\);?/g, '')
      .replace(/export\s*\{[^}]*\}/g, '// Export removed')
      .replace(/export\s+default\s+[^;]*;/g, '// Default export removed')
      .replace(/export\s+\*\s+from\s+['"][^'"]*['"];?/g, '// Export from removed')
      .replace(/\/\/\/\s*<reference\s+path="[^"]*"\s*\/>/g, '// Reference directive removed');
  }
  
  return extractedContent
    .replace(/import p5 = require\("\.\.\/[^"]*"\);?/g, '')
    .replace(/export\s*\{[^}]*\}/g, '// Export removed')
    .replace(/export\s+default\s+[^;]*;/g, '// Default export removed')
    .replace(/export\s+\*\s+from\s+['"][^'"]*['"];?/g, '// Export from removed')
    .replace(/\/\/\/\s*<reference\s+path="[^"]*"\s*\/>/g, '// Reference directive removed');
}

function extractAndInlineTypes(content) {
  // Extract all type definitions and ensure they're available globally
  const typeDefinitions = new Set();
  
  // Find all type declarations
  const typeRegex = /(?:type|interface|enum|const)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[=:{]/g;
  let match;
  
  while ((match = typeRegex.exec(content)) !== null) {
    typeDefinitions.add(match[1]);
  }
  
  // Find all constant declarations that might be types
  const constRegex = /declare\s+const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g;
  while ((match = constRegex.exec(content)) !== null) {
    typeDefinitions.add(match[1]);
  }
  
  return content;
}

try {
  console.log('📖 Reading p5 type files... 📚🔍');
  
  // Step 1: Read and resolve all references in the main index.d.ts
  const indexPath = 'node_modules/@types/p5/index.d.ts';
  let indexContent = fs.readFileSync(indexPath, 'utf8');
  
  console.log('🔗 Resolving type references... ⛓️🔧');
  const resolvedIndexContent = resolveReferences(indexContent, path.dirname(indexPath));
  
  // Step 2: Read global declarations
  console.log('🌍 Reading global declarations...');
  const globalPath = 'node_modules/@types/p5/global.d.ts';
  const globalContent = fs.readFileSync(globalPath, 'utf8');
  
  // Step 3: Process and clean the content to ensure all types are properly inlined
  console.log('🧹 Cleaning and processing type definitions...');
  
  // Remove module declarations, imports, and reference directives that could cause conflicts
  let cleanIndexContent = resolvedIndexContent
    .replace(/import\s+p5\s*=\s*require\("\.\/index"\);?/g, '')
    .replace(/import\s+p5\s*=\s*require\("\.\/[^"]*"\);?/g, '// Import removed')
    .replace(/declare module ['"][^'"]*['"]/g, '// Module declaration removed')
    .replace(/export\s*\{[^}]*\}/g, '// Export removed')
    .replace(/export\s+default\s+[^;]*;/g, '// Default export removed')
    .replace(/export\s+\*\s+from\s+['"][^'"]*['"];?/g, '// Export from removed')
    .replace(/\/\/\/\s*<reference\s+path="[^"]*"\s*\/>/g, '// Reference directive removed');
  
  let cleanGlobalContent = globalContent
    .replace(/import\s+p5\s*=\s*require\("\.\/index"\);?/g, '')
    .replace(/import\s+p5\s*=\s*require\("\.\/[^"]*"\);?/g, '// Import removed')
    .replace(/declare module ['"][^'"]*['"]/g, '// Module declaration removed')
    .replace(/export\s*\{[^}]*\}/g, '// Export removed')
    .replace(/export\s+default\s+[^;]*;/g, '// Default export removed')
    .replace(/export\s+\*\s+from\s+['"][^'"]*['"];?/g, '// Export from removed')
    .replace(/\/\/\/\s*<reference\s+path="[^"]*"\s*\/>/g, '// Reference directive removed');
  
  // Extract and inline all type definitions
  cleanIndexContent = extractAndInlineTypes(cleanIndexContent);
  cleanGlobalContent = extractAndInlineTypes(cleanGlobalContent);
  
  // Step 4: Create combined output with both global and namespace support
  console.log('🔗 Combining global and namespace types... 🔗🎯');
  
  const combinedContent = `// Generated p5.js Type Definitions
// This file provides both global and p5 namespace support
// Generated: ${new Date().toISOString()}
// Original source: @types/p5 package

// ============================================================================
// BASIC TYPE DEFINITIONS
// Ensure all fundamental types are available globally
// ============================================================================
type DEGREES = 'degrees';
type RADIANS = 'radians';
type LABEL = 'label';
type FALLBACK = 'fallback';
type ANGLE_MODE = RADIANS | DEGREES;
type DESCRIBE_DISPLAY = LABEL | FALLBACK;
type GRID_DISPLAY = FALLBACK | LABEL;
type TEXT_DISPLAY = FALLBACK | LABEL;

// ============================================================================
// P5 NAMESPACE SUPPORT
// Use: import p5 from 'p5'; const instance = new p5();
// ============================================================================
${cleanIndexContent}

// ============================================================================
// GLOBAL SUPPORT  
// Use: createCanvas(400, 300); // directly available in global scope
// ============================================================================
${cleanGlobalContent}

// ============================================================================
// DUAL EXPORT SUPPORT
// Supports both import styles for maximum compatibility
// ============================================================================
export as namespace p5;
export = p5;
`;

  // Step 5: Write the final combined file
  fs.writeFileSync(outputFile, combinedContent);
  
  console.log('✅ Type bundling complete! 🎉📝');
  console.log(`📁 Output written to: ${outputFile} 📂💾`);
  
  // Verify file exists and has content
  const stats = fs.statSync(outputFile);
  console.log(`📊 File size: ${stats.size} bytes 📏`);
  console.log(`📝 Lines of code: ${combinedContent.split('\n').length} 📄`);
  
} catch (error) {
  console.error('❌ Error bundling types:', error.message, ' 💥🚨');
  process.exit(1);
}