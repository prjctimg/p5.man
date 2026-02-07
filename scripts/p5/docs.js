#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting p5.js module-specific documentation generation... 📚✨');

const outputDir = 'doc';
const assetsDir = 'assets';

// Ensure output directories exist 📁🏗️
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`📁 Created output directory: ${outputDir} 🆕`);
}
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
  console.log(`📁 Created assets directory: ${assetsDir} 🆕`);
}

// Module emoji mapping 🎨🌈
const moduleEmojis = {
  'accessibility': '♿',
  'color': '🎨',
  'core': '⚙️',
  'data': '📊',
  'dom': '🌐',
  'events': '🖱️',
  'image': '🖼️',
  'io': '📁',
  'math': '🔢',
  'typography': '📝',
  'utilities': '🛠️',
  'webgl': '🎮'
};

try {
  console.log('📖 Extracting documentation from @types/p5... 🔍📦');
  
  // Get p5 version from package.json
  const p5PackageJson = JSON.parse(fs.readFileSync('node_modules/@types/p5/package.json', 'utf8'));
  const p5Version = p5PackageJson.version || '1.7.7';
  
  // Get current timestamp
  const now = new Date();
  const timestamp = now.toISOString().replace(/T/, ' ').replace(/\..+/, '');
  const formattedTimestamp = now.toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-');
  
  console.log(`📦 p5.js version: ${p5Version} 🎯`);
  console.log(`📅 Last updated: ${timestamp} ⏰`);
  
  // Read the bundled TypeScript definitions
  const typesFile = 'assets/types/p5.d.ts';
  if (!fs.existsSync(typesFile)) {
    console.error('❌ TypeScript definitions not found. Run types generation first. 📂❌');
    process.exit(1);
  }
  
  const typesContent = fs.readFileSync(typesFile, 'utf8');
  
  // Parse modules from the TypeScript definitions
  const modules = parseModulesFromTypes(typesContent);
  
  console.log(`📚 Found ${Object.keys(modules).length} modules 🎊📋`);
  
  // Generate documentation for each module
  for (const [moduleName, moduleData] of Object.entries(modules)) {
    console.log(`📝 Generating documentation for ${moduleName}... ✍️🎨`);
    
    // Generate markdown for this module
    const markdown = generateModuleMarkdown(moduleName, moduleData, p5Version, timestamp);
    
    // Remove internal links
    const cleanMarkdown = removeInternalLinks(markdown);
    
    // Convert to Vimdoc using pandoc
    const vimdoc = convertToVimdoc(cleanMarkdown, moduleName, p5Version, timestamp);
    
    // Save as p5-[module].txt 📝💾
    const filename = `p5-${moduleName}.txt`;
    const filepath = path.join(outputDir, filename);
    
    fs.writeFileSync(filepath, vimdoc);
    console.log(`✅ Generated ${filename} 🎉📄💾`);
  }
  
  // Generate a master index file 📋🗂️
  generateMasterIndex(modules, p5Version, timestamp);
  
  console.log('✅ Module-specific documentation generation complete! 🎊🏆🎯');
  console.log(`📁 Generated ${Object.keys(modules).length} manpages in ${outputDir}/ 📂✨🌟`);
  console.log(`🎉 All modules documented with emojis and proper Vim formatting! 🎨📚`);
  
} catch (error) {
  console.error('❌ Error generating documentation:', error.message, ' 💥🚨');
  process.exit(1);
}

function parseModulesFromTypes(typesContent) {
  const modules = {};
  
  // Split content by module markers
  const sections = typesContent.split(/\/\/ Inlined from: \.\/src\/([^\/]+)\/([^\/]+)\.d\.ts/);
  
  let currentModule = null;
  let currentSubModule = null;
  let currentContent = '';
  
  for (let i = 0; i < sections.length; i++) {
    if (i % 3 === 1) {
      // This is a module name
      currentModule = sections[i];
      if (!modules[currentModule]) {
        modules[currentModule] = {
          name: currentModule,
          functions: [],
          classes: [],
          variables: [],
          content: ''
        };
      }
    } else if (i % 3 === 2) {
      // This is a sub-module name
      currentSubModule = sections[i];
    } else if (i % 3 === 0) {
      // This is content
      if (currentModule && sections[i]) {
        const content = sections[i].trim();
        if (content) {
          // Extract functions, classes, and variables from this section
          extractAPIElements(content, modules[currentModule], currentSubModule);
          modules[currentModule].content += content + '\n\n';
        }
      }
    }
  }
  
  return modules;
}

function extractAPIElements(content, module, subModule) {
  // Extract functions
  const functionMatches = content.match(/\/\*\*\s*\n[\s\S]*?\*\/\s*\n\s*(\w+)\s*\([^)]*\)\s*:\s*[^;]+;/g);
  if (functionMatches) {
    functionMatches.forEach(match => {
      const nameMatch = match.match(/\s*(\w+)\s*\(/);
      if (nameMatch) {
        const docMatch = match.match(/\/\*\*\s*\n([\s\S]*?)\*\//);
        const description = docMatch ? docMatch[1] : '';
        
        module.functions.push({
          name: nameMatch[1],
          description: cleanJSDoc(description),
          subModule: subModule
        });
      }
    });
  }
  
  // Extract classes
  const classMatches = content.match(/\/\*\*\s*\n[\s\S]*?\*\/\s*\n\s*(class|interface)\s+(\w+)/g);
  if (classMatches) {
    classMatches.forEach(match => {
      const nameMatch = match.match(/(class|interface)\s+(\w+)/);
      if (nameMatch) {
        const docMatch = match.match(/\/\*\*\s*\n([\s\S]*?)\*\//);
        const description = docMatch ? docMatch[1] : '';
        
        module.classes.push({
          name: nameMatch[2],
          type: nameMatch[1],
          description: cleanJSDoc(description),
          subModule: subModule
        });
      }
    });
  }
  
  // Extract variables/properties
  const variableMatches = content.match(/\/\*\*\s*\n[\s\S]*?\*\/\s*\n\s*(\w+)\s*:\s*[^;]+;/g);
  if (variableMatches) {
    variableMatches.forEach(match => {
      const nameMatch = match.match(/\s*(\w+)\s*:/);
      if (nameMatch) {
        const docMatch = match.match(/\/\*\*\s*\n([\s\S]*?)\*\//);
        const description = docMatch ? docMatch[1] : '';
        
        module.variables.push({
          name: nameMatch[1],
          description: cleanJSDoc(description),
          subModule: subModule
        });
      }
    });
  }
}

function cleanJSDoc(jsdoc) {
  return jsdoc
    .replace(/\/\*\*\s*\n/g, '')
    .replace(/\s*\*\/\s*$/g, '')
    .replace(/\n\s*\*\s?/g, '\n')
    .replace(/@param\s+(\w+)\s*(.*)/g, '- **$1**: $2')
    .replace(/@returns?\s*(.*)/g, '- **Returns**: $1')
    .trim();
}

function generateModuleMarkdown(moduleName, moduleData, p5Version, timestamp) {
  let markdown = `# ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} Module

**p5.js Version:** ${p5Version}  
**Last Updated:** ${timestamp}

---

## Table of Contents

`;

  // Add TOC for functions with emojis 🔧
  if (moduleData.functions.length > 0) {
    markdown += '### 🔧 Functions\n\n';
    moduleData.functions.forEach(func => {
      markdown += `- [${func.name}](#${func.name.toLowerCase()}) 🔧\n`;
    });
    markdown += '\n';
  }

  // Add TOC for classes with emojis 🏗️
  if (moduleData.classes.length > 0) {
    markdown += '### 🏗️ Classes\n\n';
    moduleData.classes.forEach(cls => {
      markdown += `- [${cls.name}](#${cls.name.toLowerCase()}) 🏗️\n`;
    });
    markdown += '\n';
  }

  // Add TOC for variables with emojis 📊
  if (moduleData.variables.length > 0) {
    markdown += '### 📊 Variables\n\n';
    moduleData.variables.forEach(variable => {
      markdown += `- [${variable.name}](#${variable.name.toLowerCase()}) 📊\n`;
    });
    markdown += '\n';
  }

  markdown += '---\n\n';

  // Add function documentation with emojis 🔧
  if (moduleData.functions.length > 0) {
    markdown += '## 🔧 Functions\n\n';
    moduleData.functions.forEach(func => {
      markdown += `### 🔧 ${func.name}\n\n`;
      if (func.description) {
        markdown += `${func.description}\n\n`;
      }
      if (func.subModule) {
        markdown += `📂 *Sub-module: ${func.subModule}*\n\n`;
      }
      markdown += '---\n\n';
    });
  }

  // Add class documentation with emojis 🏗️
  if (moduleData.classes.length > 0) {
    markdown += '## 🏗️ Classes\n\n';
    moduleData.classes.forEach(cls => {
      markdown += `### 🏗️ ${cls.name}\n\n`;
      markdown += `🏷️ **Type:** ${cls.type}\n\n`;
      if (cls.description) {
        markdown += `${cls.description}\n\n`;
      }
      if (cls.subModule) {
        markdown += `📂 *Sub-module: ${cls.subModule}*\n\n`;
      }
      markdown += '---\n\n';
    });
  }

  // Add variable documentation with emojis 📊
  if (moduleData.variables.length > 0) {
    markdown += '## 📊 Variables\n\n';
    moduleData.variables.forEach(variable => {
      markdown += `### 📊 ${variable.name}\n\n`;
      if (variable.description) {
        markdown += `${variable.description}\n\n`;
      }
      if (variable.subModule) {
        markdown += `📂 *Sub-module: ${variable.subModule}*\n\n`;
      }
      markdown += '---\n\n';
    });
  }

  return markdown;
}

function removeInternalLinks(markdown) {
  // Remove internal links like [text]() that would be broken
  return markdown
    .replace(/\[([^\]]+)\]\(\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'); // Also remove external links for cleaner docs
}

function convertToVimdoc(markdown, moduleName, p5Version, timestamp) {
  const emoji = moduleEmojis[moduleName] || '📄';
  const title = `p5-${moduleName}`;
  
  // Convert markdown to Vimdoc format with section emojis 📚✨
  let vimdoc = `${title}.txt    p5.js ${moduleName} documentation    p5

==============================================================================
${emoji} p5.js ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} Module ${emoji}    *p5-${moduleName}*

📦 p5.js Version: ${p5Version}~
⏰ Last Updated: ${timestamp}~

==============================================================================
📋 CONTENTS                                                    *p5-${moduleName}-contents*

`;

  // Convert markdown headers to Vimdoc with section emojis 🎨📝
  vimdoc = vimdoc.replace(/^# (.+)$/gm, '==============================================================================\n📚 $1 📚                                            *p5-${moduleName}-$1*\n');
  vimdoc = vimdoc.replace(/^## (.+)$/gm, '\n🔧 $1 🔧~\n');
  vimdoc = vimdoc.replace(/^### (.+)$/gm, '\n📝 $1 📝~\n');
  
  // Convert bold text
  vimdoc = vimdoc.replace(/\*\*(.+?)\*\*/g, '$1');
  
  // Convert code blocks
  vimdoc = vimdoc.replace(/```(\w+)?\n([\s\S]*?)```/g, '\n$2\n');
  
  // Convert inline code
  vimdoc = vimdoc.replace(/`([^`]+)`/g, '$1');
  
  // Convert lists
  vimdoc = vimdoc.replace(/^- (.+)$/gm, '    $1');
  
  // Convert horizontal rules
  vimdoc = vimdoc.replace(/^---$/gm, '==============================================================================');
  
  // Add the rest of the content
  const contentStart = markdown.indexOf('\n---\n\n## Table of Contents');
  if (contentStart > -1) {
    const content = markdown.substring(contentStart + 5);
    vimdoc += content;
  }
  
  vimdoc += `\n\n==============================================================================
vim:tw=78:ts=8:ft=help:norl:
`;
  
  return vimdoc;
}

function generateMasterIndex(modules, p5Version, timestamp) {
  let index = `p5-index.txt    p5.js Complete Documentation Index    p5

==============================================================================
p5.js Complete Documentation Index                    *p5-index*

p5.js Version: ${p5Version}~
Last Updated: ${timestamp}~

==============================================================================
CONTENTS                                                    *p5-index-contents*

Available Modules:
`;

  // Add module list with emojis 📚
  for (const [moduleName, moduleData] of Object.entries(modules)) {
    const emoji = moduleEmojis[moduleName] || '📄';
    const filename = `p5-${moduleName}.txt`;
    const functionCount = moduleData.functions.length;
    const classCount = moduleData.classes.length;
    const variableCount = moduleData.variables.length;
    
    index += `    ${emoji} ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} (${filename})~`;
    index += `        🔧 Functions: ${functionCount}, 🏗️ Classes: ${classCount}, 📊 Variables: ${variableCount}\n`;
  }

  index += `\n==============================================================================
Usage:\n\nTo view documentation for a specific module, use:\n>
    :help p5-${Object.keys(modules).join(' | :help p5-')}\n<
\n==============================================================================
vim:tw=78:ts=8:ft=help:norl:
`;

  fs.writeFileSync(path.join(outputDir, 'p5-index.txt'), index);
  console.log('✅ Generated master index: p5-index.txt 📋🗂️');
}