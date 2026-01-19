#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

class P5ManGenerator {
  constructor() {
    this.modules = {
      'Shape': {
        file: 'p5-shape.txt',
        description: 'Shape drawing functions and primitives',
        functions: []
      },
      'Color': {
        file: 'p5-color.txt', 
        description: 'Color creation, reading, and setting functions',
        functions: []
      },
      'Typography': {
        file: 'p5-typography.txt',
        description: 'Text rendering and font functions',
        functions: []
      },
      'Image': {
        file: 'p5-image.txt',
        description: 'Image loading, display, and pixel manipulation',
        functions: []
      },
      'Transform': {
        file: 'p5-transform.txt',
        description: 'Coordinate system transformations',
        functions: []
      },
      'Environment': {
        file: 'p5-environment.txt',
        description: 'Canvas and environment setup functions',
        functions: []
      },
      '3D': {
        file: 'p5-3d.txt',
        description: '3D graphics and camera functions',
        functions: []
      },
      'Rendering': {
        file: 'p5-rendering.txt',
        description: 'Canvas rendering and graphics objects',
        functions: []
      },
      'Math': {
        file: 'p5-math.txt',
        description: 'Mathematical functions and vector operations',
        functions: []
      },
      'IO': {
        file: 'p5-io.txt',
        description: 'Input/output operations and data loading',
        functions: []
      },
      'Events': {
        file: 'p5-events.txt',
        description: 'Event handling for mouse, keyboard, and touch',
        functions: []
      },
      'DOM': {
        file: 'p5-dom.txt',
        description: 'DOM element creation and manipulation',
        functions: []
      },
      'Data': {
        file: 'p5-data.txt',
        description: 'Data structures and utility functions',
        functions: []
      },
      'Structure': {
        file: 'p5-structure.txt',
        description: 'Program structure and flow control',
        functions: []
      },
      'Constants': {
        file: 'p5-constants.txt',
        description: 'Built-in constants and values',
        functions: []
      },
      'Foundation': {
        file: 'p5-foundation.txt',
        description: 'JavaScript foundation concepts for p5.js',
        functions: []
      }
    };
  }

  async generate() {
    // Read version from .last_p5_version file
    let version;
    try {
      version = fs.readFileSync(path.join(__dirname, '.last_p5_version'), 'utf8').trim();
    } catch (error) {
      console.error('Could not read version from .last_p5_version file');
      console.error('Please ensure the version file exists before running generate');
      process.exit(1);
    }

    console.log(`Generating p5.js manpages for version ${version}`);
    
    // Clean and create output directory
    const docDir = path.join(__dirname, 'doc');
    if (fs.existsSync(docDir)) {
      fs.rmSync(docDir, { recursive: true });
    }
    fs.mkdirSync(docDir, { recursive: true });

    // Clone p5.js repository
    console.log('Cloning p5.js repository...');
    const tempDir = path.join(__dirname, 'temp', 'p5.js');
    if (fs.existsSync(path.join(__dirname, 'temp'))) {
      fs.rmSync(path.join(__dirname, 'temp'), { recursive: true });
    }
    fs.mkdirSync(path.join(__dirname, 'temp'), { recursive: true });
    
// Clone with v prefix since p5.js uses this tag convention
    execSync(`git clone --depth 1 --branch v${version} https://github.com/processing/p5.js.git ${tempDir}`, {
      stdio: 'inherit',
      timeout: 180000 // 3 minutes timeout
    });

    // Extract documentation from source code
    console.log('Extracting documentation from source code...');
    await this.extractDocumentation(tempDir);

    // Generate neovim help files
    console.log('Generating neovim help files...');
    this.generateHelpFiles(docDir, version);

    // Generate main index file
    this.generateIndex(docDir, version);

    console.log(`Documentation generated successfully in ${docDir}`);
    console.log(`To use in neovim: set runtimepath+=${docDir}`);
  }

  async extractDocumentation(srcDir) {
    const srcMainDir = path.join(srcDir, 'src');
    const files = this.findFiles(srcMainDir, '.js');
    
    for (const file of files) {
      await this.parseFile(file);
    }
  }

  findFiles(dir, ext) {
    const files = [];
    
    function traverse(currentDir) {
      const items = fs.readdirSync(currentDir);
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          traverse(fullPath);
        } else if (item.endsWith(ext)) {
          files.push(fullPath);
        }
      }
    }
    
    traverse(dir);
    return files;
  }

  convertHtmlToMarkdown(text) {
    return text
      .replace(/<code>/g, '`')
      .replace(/<\/code>/g, '`')
      .replace(/<strong>/g, '**')
      .replace(/<\/strong>/g, '**')
      .replace(/<em>/g, '*')
      .replace(/<\/em>/g, '*')
      .replace(/<b>/g, '**')
      .replace(/<\/b>/g, '**')
      .replace(/<i>/g, '*')
      .replace(/<\/i>/g, '*')
      .replace(/<pre>/g, '\n```\n')
      .replace(/<\/pre>/g, '\n```\n')
      .replace(/<p>/g, '\n')
      .replace(/<\/p>/g, '\n')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<a\s+href="([^"]+)">([^<]+)<\/a>/g, '[$2]($1)')
      .replace(/<[^>]+>/g, ''); // Remove any remaining HTML tags
  }

  async parseFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    let currentComment = null;
    let inDocComment = false;
    let inExample = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Start of documentation comment
      if (line === '/**') {
        inDocComment = true;
        currentComment = {
          description: '',
          method: '',
          params: [],
          returns: '',
          example: '',
          module: this.guessModule(filePath),
          file: filePath,
          lineNumber: i + 1
        };
        continue;
      }
      
      // End of documentation comment
      if (inDocComment && line === '*/') {
        inDocComment = false;
        inExample = false;
        if (currentComment && currentComment.method) {
          currentComment.description = this.convertHtmlToMarkdown(currentComment.description);
          if (currentComment.example) {
            currentComment.example = this.convertHtmlToMarkdown(currentComment.example);
          }
          // Convert parameter descriptions too
          currentComment.params = currentComment.params.map(param => ({
            ...param,
            description: this.convertHtmlToMarkdown(param.description)
          }));
          if (currentComment.returns) {
            currentComment.returns = this.convertHtmlToMarkdown(currentComment.returns);
          }
          this.addFunctionToModule(currentComment);
        }
        currentComment = null;
        continue;
      }
      
      // Parse comment content
      if (inDocComment && line.startsWith('*')) {
        const content = line.substring(1).trim();
        
        if (content.startsWith('@method ')) {
          currentComment.method = content.substring(8).trim();
          inExample = false;
        } else if (content.startsWith('@param ')) {
          const paramMatch = content.match(/@param \{([^}]+)\}\s+(\w+)\s+(.*)/);
          if (paramMatch) {
            currentComment.params.push({
              type: paramMatch[1],
              name: paramMatch[2],
              description: paramMatch[3]
            });
          }
          inExample = false;
        } else if (content.startsWith('@return ')) {
          const returnMatch = content.match(/@return \{([^}]+)\}\s+(.*)/);
          if (returnMatch) {
            currentComment.returns = `${returnMatch[1]} - ${returnMatch[2]}`;
          }
          inExample = false;
        } else if (content.startsWith('@example')) {
          // Start collecting example content
          inExample = true;
          currentComment.example = '';
        } else if (content.startsWith('@')) {
          // Skip other JSDoc tags (like @type, @property, etc.)
          inExample = false;
        } else if (inExample) {
          // Collect example content
          if (content.startsWith(' ')) {
            currentComment.example += content.substring(1) + '\n';
          } else {
            currentComment.example += content + '\n';
          }
        } else {
          // Add to description only if it's not a tag and not in example
          currentComment.description += content + ' ';
        }
      }
    }
  }

  guessModule(filePath) {
    const lowerPath = filePath.toLowerCase();
    
    // Check more specific paths first
    if (lowerPath.includes('/shape/') || lowerPath.includes('primitive') || lowerPath.includes('vertex')) {
      return 'Shape';
    } else if (lowerPath.includes('/color/') || lowerPath.includes('color_conversion') || lowerPath.includes('creating_reading') || lowerPath.includes('p5.color')) {
      return 'Color';
    } else if (lowerPath.includes('/typography/') || lowerPath.includes('text') || lowerPath.includes('font') || lowerPath.includes('p5.font')) {
      return 'Typography';
    } else if (lowerPath.includes('/image/') || lowerPath.includes('pixel') || lowerPath.includes('filters') || lowerPath.includes('loading_displaying') || lowerPath.includes('p5.image')) {
      return 'Image';
    } else if (lowerPath.includes('transform') || lowerPath.includes('matrix')) {
      return 'Transform';
    } else if (lowerPath.includes('/webgl/') || lowerPath.includes('3d') || lowerPath.includes('camera') || lowerPath.includes('p5.geometry') || lowerPath.includes('p5.texture') || lowerPath.includes('p5.shader') || lowerPath.includes('p5.camera')) {
      return '3D';
    } else if (lowerPath.includes('/core/shape/') || lowerPath.includes('render') || lowerPath.includes('canvas') || lowerPath.includes('graphics') || lowerPath.includes('p5.graphics') || lowerPath.includes('p5.renderer')) {
      return 'Rendering';
    } else if (lowerPath.includes('/math/') || lowerPath.includes('vector') || lowerPath.includes('noise') || lowerPath.includes('calculation') || lowerPath.includes('trigonometry') || lowerPath.includes('random') || lowerPath.includes('p5.vector')) {
      return 'Math';
    } else if (lowerPath.includes('/io/') || lowerPath.includes('load') || lowerPath.includes('save') || lowerPath.includes('files') || lowerPath.includes('p5.table') || lowerPath.includes('p5.xml')) {
      return 'IO';
    } else if (lowerPath.includes('/events/') || lowerPath.includes('mouse') || lowerPath.includes('key') || lowerPath.includes('touch') || lowerPath.includes('acceleration')) {
      return 'Events';
    } else if (lowerPath.includes('/dom/') || lowerPath.includes('element') || lowerPath.includes('p5.element')) {
      return 'DOM';
    } else if (lowerPath.includes('/data/') || lowerPath.includes('array') || lowerPath.includes('string') || lowerPath.includes('local_storage') || lowerPath.includes('p5.typeddict') || lowerPath.includes('utilities')) {
      return 'Data';
    } else if (lowerPath.includes('constants')) {
      return 'Constants';
    }
    
    // Default categorization based on filename
    if (lowerPath.includes('environment') || lowerPath.includes('main') || lowerPath.includes('structure') || lowerPath.includes('app')) {
      return 'Structure';
    }
    
    return 'Foundation';
  }

  addFunctionToModule(comment) {
    const module = this.modules[comment.module];
    if (module) {
      module.functions.push(comment);
    } else {
      console.warn(`Unknown module: ${comment.module} for ${comment.method}`);
    }
  }

  generateHelpFiles(docDir, version) {
    // Create individual module files and track line numbers
    for (const [moduleName, moduleData] of Object.entries(this.modules)) {
      const content = this.generateModuleHelp(moduleName, moduleData, version);
      const filePath = path.join(docDir, moduleData.file);
      fs.writeFileSync(filePath, content);
      
      // Store line numbers for this module's functions
      this.updateFunctionLineNumbers(filePath, moduleData);
    }

    // Note: Tags will be generated by neovim automatically using :helptags
    console.log('Documentation files generated. Tags will be created by neovim.');
  }

  generateModuleHelp(moduleName, moduleData, version) {
    let content = '';
    
    // Remove duplicate functions
    const uniqueFunctions = this.removeDuplicateFunctions(moduleData.functions);
    
    // Get current date for generation timestamp
    const generationDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Header with emojis
    content += `🎨 *p5.${moduleName.toLowerCase()}*\t${moduleData.description} 📚\n`;
    content += `==============================================================================\n`;
    content += `🚀 p5.js ${moduleName} Reference\n\n`;
    content += `📅 Generated on: ${generationDate}\n`;
    content += `🏷️  p5.js version: ${version}\n\n`;
    content += `\t*help-topic*p5.${moduleName.toLowerCase()}\n\n`;
    
    // Enhanced Table of contents
    if (uniqueFunctions.length > 0) {
      content += `📋 TABLE OF CONTENTS                                        *p5.${moduleName.toLowerCase()}-contents*\n\n`;
      content += `1. 🎯 Functions (${uniqueFunctions.length} total)\n\n`;
      
      for (const func of uniqueFunctions.sort((a, b) => a.method.localeCompare(b.method))) {
        content += `   • ${func.method}()\n`;
      }
      content += '\n';
    }

    // Function documentation
    content += `📖 FUNCTION DOCUMENTATION\n\n`;
    for (const func of uniqueFunctions.sort((a, b) => a.method.localeCompare(b.method))) {
      content += this.generateFunctionHelp(func, moduleName);
    }

    // Footer with emojis
    content += `==============================================================================\n`;
    content += `🤖 Generated by p5.man - neovim help generator for p5.js\n`;
    content += `🌐 https://github.com/prjctimg/p5.man\n`;
    
    return content;
  }

  removeDuplicateFunctions(functions) {
    const seen = new Set();
    return functions.filter(func => {
      // Normalize method name for comparison (remove parentheses, trim whitespace)
      const methodName = (func.method || '').replace(/\(\)$/, '').trim();
      if (!methodName || seen.has(methodName)) {
        return false;
      }
      seen.add(methodName);
      return true;
    });
  }

  generateFunctionHelp(func, moduleName) {
    let content = '';
    
    // Function header with tag and emoji
    // Use module-qualified tag for functions that could conflict across modules
    const tagName = this.shouldQualifyTag(func.method) ? `p5.${func.method}()--${moduleName.toLowerCase()}` : `p5.${func.method}()`;
    content += `\n🔧 ${func.method}()                                                *${tagName}*\n`;
    content += `${'─'.repeat(func.method.length + 8)}\n`;
    
    // Description (clean, without tag remnants)
    if (func.description) {
      const cleanDescription = func.description.trim()
        .replace(/\s+/g, ' ')  // Normalize whitespace
        .replace(/\{@\w+\s+[^}]*\}/g, ''); // Remove any remaining inline JSDoc tags
      content += `\n📝 ${cleanDescription}\n`;
    }

    // Parameters
    if (func.params && func.params.length > 0) {
      content += `\n📋 Parameters:\n`;
      for (const param of func.params) {
        const cleanParamDesc = param.description.trim().replace(/\s+/g, ' ');
        content += `   • {${param.type}} ${param.name} - ${cleanParamDesc}\n`;
      }
    }

    // Return value
    if (func.returns) {
      const cleanReturns = func.returns.trim().replace(/\s+/g, ' ');
      content += `\n↩️  Returns:\n`;
      content += `   ${cleanReturns}\n`;
    }

    // Example section - properly separated and formatted
    if (func.example && func.example.trim()) {
      content += `\n💡 Example:                                                     *${tagName}-example*\n`;
      content += `${'─'.repeat(15)}\n`;
      content += `>\n`;
      
      const exampleLines = func.example.trim().split('\n');
      // Limit example length but preserve code formatting
      const maxLines = 15;
      for (let i = 0; i < Math.min(exampleLines.length, maxLines); i++) {
        const line = exampleLines[i];
        if (line.trim()) {
          content += `  ${line}\n`;
        } else {
          content += `\n`;
        }
      }
      
      if (exampleLines.length > maxLines) {
        content += `  ... (truncated)\n`;
      }
      content += `>\n`;
    }

    // Cross-references
    content += `\n🔗 See also: |p5.${moduleName.toLowerCase()}|\n\n`;
    
    return content;
  }

  shouldQualifyTag(methodName) {
    // List of function names that could conflict across modules
    // Note: Removed core p5.js drawing functions like 'fill', 'stroke', 'background' 
    // as they are well-established and don't typically conflict
    const conflictingFunctions = [
      'clear', 'print', 'save', 'load', 'get', 'set', 'close', 'open',
      'remove', 'add', 'create', 'update', 'delete', 'copy', 'move',
      'draw', 'write', 'read', 'updatePixels'
    ];
    
    const baseName = methodName.replace(/\(\)$/, '');
    return conflictingFunctions.includes(baseName);
  }

  // Note: generateTags method removed - neovim will handle tag generation automatically
  // using :helptags command in the workflow

  updateFunctionLineNumbers(filePath, moduleData) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    // Create a map of function names to their line numbers
    const functionLineMap = new Map();
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for function headers (e.g., "🔧 functionName()                                                *tag*")
      const functionMatch = line.match(/🔧\s+(\w+)\(\)/);
      if (functionMatch) {
        const functionName = functionMatch[1];
        // Line number is i + 1 (1-based indexing)
        functionLineMap.set(functionName, i + 1);
      }
    }
    
    // Store the line numbers in the module data for later use
    moduleData.functionLineNumbers = functionLineMap;
  }

  findFunctionLineNumber(filename, functionName) {
    // This method will now use the stored line numbers
    // For backward compatibility, return a reasonable default if not found
    const moduleData = Object.values(this.modules).find(m => m.file === filename);
    if (moduleData && moduleData.functionLineNumbers) {
      return moduleData.functionLineNumbers.get(functionName) || 50;
    }
    return 50; // Fallback
  }

  generateIndex(docDir, version) {
    let content = '';
    
    // Get current date for generation timestamp
    const generationDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Main header with emojis
    content += `🎨 *p5*\t\tp5.js Reference Documentation 📚\n`;
    content += `==============================================================================\n`;
    content += `🚀 p5.js Reference for Neovim\n\n`;
    content += `📅 Generated on: ${generationDate}\n`;
    content += `🏷️  p5.js version: ${version}\n\n`;
    content += `\t*help-topic*p5\n\n`;

    // Introduction with emojis
    content += `🌟 INTRODUCTION                                                    *p5-introduction*\n\n`;
    content += `p5.js is a JavaScript library for creative coding, with a focus on making\n`;
    content += `coding accessible and inclusive for artists, designers, educators,\n`;
    content += `beginners, and anyone else! 🎨✨\n\n`;

    content += `This help file provides comprehensive documentation for all p5.js functions\n`;
    content += `and modules, organized by topic for easy reference. 📖\n\n`;

    // Module index with emojis
    content += `📚 MODULES                                                          *p5-modules*\n\n`;
    
    for (const [moduleName, moduleData] of Object.entries(this.modules)) {
      const uniqueFunctions = this.removeDuplicateFunctions(moduleData.functions);
      content += `|p5.${moduleName.toLowerCase()}|\t${moduleData.description} (${uniqueFunctions.length} functions)\n`;
    }
    content += '\n';

    // Quick reference with emojis
    content += `⚡ QUICK REFERENCE                                              *p5-quick-reference*\n\n`;
    content += `Common functions by category:\n\n`;
    
    content += `🎯 Setup:\n`;
    content += `  |setup()| |draw()| |createCanvas()| |background()|\n\n`;
    
    content += `🔷 2D Shapes:\n`;
    content += `  |p5.circle()| |p5.ellipse()| |p5.rect()| |p5.line()| |p5.point()|\n\n`;
    
    content += `🎨 Color:\n`;
    content += `  |p5.fill()| |p5.stroke()| |p5.background()| |p5.color()|\n\n`;
    
    content += `🖱️  Interaction:\n`;
    content += `  |p5.mousePressed()| |p5.keyPressed()| |p5.mouseX| |p5.mouseY|\n\n`;

    // Usage instructions with emojis
    content += `💻 USAGE IN NEOVIM                                                   *p5-usage*\n\n`;
    content += `To use this documentation:\n\n`;
    content += `1. 📁 Add to your neovim config:\n`;
    content += `   set runtimepath+=/path/to/p5.man/doc\n\n`;
    content += `2. 🔍 Jump to topics with:\n`;
    content += `   :help p5                    " Main index\n`;
    content += `   :help p5.shape              " Shape module\n`;
    content += `   :help p5.ellipse()          " Specific function\n\n`;
    content += `3. 🏷️  Use tag completion:\n`;
    content += `   :tag p5.                    " List all p5 tags\n`;
    content += `   Ctrl-] on function names     " Jump to definition\n\n`;

    // Footer with emojis
    content += `==============================================================================\n`;
    content += `🤖 Generated by p5.man - https://github.com/prjctimg/p5.man\n`;
    content += `🌐 p5.js - https://p5js.org/\n`;
    content += `📧 Enjoy creative coding! 💖\n`;

    fs.writeFileSync(path.join(docDir, 'p5.txt'), content);
  }
}

// Main execution
if (require.main === module) {
  const generator = new P5ManGenerator();
  generator.generate().catch(console.error);
}

module.exports = P5ManGenerator;