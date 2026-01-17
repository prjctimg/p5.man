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
    
    try {
      // Try to clone the specific version tag first
      execSync(`git clone --depth 1 --branch ${version} https://github.com/processing/p5.js.git ${tempDir}`, {
        stdio: 'inherit',
        timeout: 180000 // 3 minutes timeout
      });
    } catch (error) {
      console.log(`Failed to clone version ${version}, trying with 'v' prefix...`);
      try {
        execSync(`git clone --depth 1 --branch v${version} https://github.com/processing/p5.js.git ${tempDir}`, {
          stdio: 'inherit',
          timeout: 180000
        });
      } catch (vError) {
        console.log(`Failed to clone v${version}, falling back to main branch...`);
        execSync(`git clone --depth 1 https://github.com/processing/p5.js.git ${tempDir}`, {
          stdio: 'inherit',
          timeout: 180000
        });
      }
    }

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
          file: filePath
        };
        continue;
      }
      
      // End of documentation comment
      if (inDocComment && line === '*/') {
        inDocComment = false;
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
        } else if (content.startsWith('@param ')) {
          const paramMatch = content.match(/@param \{([^}]+)\}\s+(\w+)\s+(.*)/);
          if (paramMatch) {
            currentComment.params.push({
              type: paramMatch[1],
              name: paramMatch[2],
              description: paramMatch[3]
            });
          }
        } else if (content.startsWith('@return ')) {
          const returnMatch = content.match(/@return \{([^}]+)\}\s+(.*)/);
          if (returnMatch) {
            currentComment.returns = `${returnMatch[1]} - ${returnMatch[2]}`;
          }
        } else if (content.startsWith('@example')) {
          // Collect example lines until next @tag or end
          currentComment.example = '';
          for (let j = i + 1; j < lines.length; j++) {
            const nextLine = lines[j].trim();
            if (nextLine.startsWith('* @') || nextLine === '*/') {
              break;
            }
            if (nextLine.startsWith('* ')) {
              currentComment.example += nextLine.substring(2) + '\n';
            }
          }
        } else if (!content.startsWith('@')) {
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
    // Create individual module files
    for (const [moduleName, moduleData] of Object.entries(this.modules)) {
      const content = this.generateModuleHelp(moduleName, moduleData, version);
      const filePath = path.join(docDir, moduleData.file);
      fs.writeFileSync(filePath, content);
    }

    // Create tags file
    this.generateTags(docDir, version);
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
        content += `   • |${func.method}()|\n`;
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
    const tagName = this.shouldQualifyTag(func.method) ? `p5.${func.method}()|${moduleName.toLowerCase()}` : `p5.${func.method}()`;
    content += `\n🔧 ${func.method}()                                                *${tagName}*\n`;
    content += `${'─'.repeat(func.method.length + 8)}\n`;
    
    // Description
    if (func.description) {
      content += `\n📝 ${func.description.trim()}\n`;
    }

    // Parameters
    if (func.params && func.params.length > 0) {
      content += `\n📋 Parameters:\n`;
      for (const param of func.params) {
        content += `   • {${param.type}} ${param.name} - ${param.description}\n`;
      }
    }

    // Return value
    if (func.returns) {
      content += `\n↩️  Returns:\n`;
      content += `   ${func.returns}\n`;
    }

    // Example (simplified for help file)
    if (func.example) {
      content += `\n💡 Example:\n`;
      content += `>\n`;
      const exampleLines = func.example.trim().split('\n').slice(0, 10); // Limit example length
      for (const line of exampleLines) {
        content += `  ${line}\n`;
      }
      content += `>\n`;
    }

    // Cross-references
    content += `\n🔗 See also: |p5.${moduleName.toLowerCase()}|\n\n`;
    
    return content;
  }

  shouldQualifyTag(methodName) {
    // List of function names that could conflict across modules
    const conflictingFunctions = [
      'clear', 'print', 'save', 'load', 'get', 'set', 'close', 'open',
      'remove', 'add', 'create', 'update', 'delete', 'copy', 'move',
      'draw', 'fill', 'stroke', 'background', 'write', 'read'
    ];
    
    const baseName = methodName.replace(/\(\)$/, '');
    return conflictingFunctions.includes(baseName);
  }

  generateTags(docDir, version) {
    const tagsFile = path.join(docDir, 'tags');
    let tagsContent = `!_TAG_FILE_ENCODING\tutf-8\n`;
    tagsContent += `!_TAG_FILE_SORTED\t1\n`;
    tagsContent += `!_TAG_PROGRAM_AUTHOR\tprjctimg\n`;
    tagsContent += `!_TAG_PROGRAM_NAME\tp5.man\n`;
    tagsContent += `!_TAG_PROGRAM_URL\thttps://github.com/prjctimg/p5.man\n`;
    tagsContent += `!_TAG_PROGRAM_VERSION\t${version}\n`;

    // Collect all functions from all modules and handle conflicts
    const allFunctions = [];
    
    for (const [moduleName, moduleData] of Object.entries(this.modules)) {
      for (const func of moduleData.functions) {
        if (func.method) {
          allFunctions.push({
            ...func,
            moduleName: moduleName,
            moduleData: moduleData
          });
        }
      }
    }
    
    // Sort functions by method name to ensure consistent ordering
    allFunctions.sort((a, b) => a.method.localeCompare(b.method));

    // Generate tags for modules
    for (const [moduleName, moduleData] of Object.entries(this.modules)) {
      const moduleTag = `p5.${moduleName.toLowerCase()}`;
      tagsContent += `${moduleTag}\t${moduleData.file}\t/^\\*${moduleTag}\\*\\t/;"\tline:1\tkind:\tlanguage:p5\n`;
    }
    
    // Generate tags for all functions, handling conflicts
    const usedTagNames = new Set();
    for (const func of allFunctions) {
      if (func.method) {
        let tagName = `p5.${func.method}()`;
        
        // If this tag name is already used or the function should be qualified, use qualified name
        if (usedTagNames.has(tagName) || this.shouldQualifyTag(func.method)) {
          tagName = `p5.${func.method}()|${func.moduleName.toLowerCase()}`;
        }
        
        usedTagNames.add(tagName);
        const lineNumber = this.findFunctionLineNumber(func.moduleData.file, func.method);
        tagsContent += `${tagName}\t${func.moduleData.file}\t/^${func.method}()\\t/;"\tline:${lineNumber}\tkind:f\tfunction:${func.moduleName}\tlanguage:p5\n`;
      }
    }

    fs.writeFileSync(tagsFile, tagsContent);
  }

  findFunctionLineNumber(filename, functionName) {
    // Simplified line number calculation - in reality would need to parse the generated file
    return Math.floor(Math.random() * 100) + 50; // Placeholder
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