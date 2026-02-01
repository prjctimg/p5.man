import fs from 'fs/promises';
import path from 'path';
import { getModuleEmoji, generateEmojiPrefix, formatParameterWithEmoji, formatReturnWithEmoji } from './emojiMapper.js';

/**
 * Generates Vim documentation files from p5.js symbols
 */
export class VimdocGenerator {
  constructor(config) {
    this.config = config;
    this.tags = new Map();
    this.generatedFiles = new Map();
  }

  /**
   * Generate all module documentation files
   * @param {Map} symbolsByModule - Symbols grouped by module
   * @param {string} outputDir - Output directory
   * @returns {Promise<Map>} Generated file paths
   */
  async generateAllFiles(symbolsByModule, outputDir) {
    console.log('📝 Generating Vim documentation files...');
    
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });
    
    // Generate each module file
    for (const [moduleName, symbols] of symbolsByModule) {
      if (symbols.length === 0) continue;
      
      const filename = this.config.modules[moduleName]?.file || `p5-${moduleName}.txt`;
      const filepath = path.join(outputDir, filename);
      
      const content = this.generateModuleFile(moduleName, symbols);
      await fs.writeFile(filepath, content, 'utf8');
      
      this.generatedFiles.set(moduleName, filepath);
      console.log(`✅ Generated ${filename} with ${symbols.length} symbols`);
    }
    
    // Generate tags file
    await this.generateTagsFile(outputDir);
    
    console.log(`📚 Generated ${this.generatedFiles.size} documentation files`);
    return this.generatedFiles;
  }

  /**
   * Generate content for a single module file
   * @param {string} moduleName - Module name
   * @param {Array} symbols - Array of symbols
   * @returns {string} File content
   */
  generateModuleFile(moduleName, symbols) {
    const moduleConfig = this.config.modules[moduleName];
    const moduleEmoji = getModuleEmoji(moduleName);
    
    const content = [
      this.generateHeader(moduleName, moduleConfig, moduleEmoji),
      this.generateTableOfContents(symbols),
      this.generateSymbolSections(symbols),
      this.generateFooter(moduleName)
    ].join('\n\n');
    
    return content;
  }

  /**
   * Generate file header
   * @param {string} moduleName - Module name
   * @param {Object} moduleConfig - Module configuration
   * @param {string} emoji - Module emoji
   * @returns {string} Header content
   */
  generateHeader(moduleName, moduleConfig, emoji) {
    const title = `p5.${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}`;
    const description = moduleConfig?.description || `${moduleName} module functions and properties`;
    
    return `${emoji} *${title}*${emoji}
${description}

==============================================================================
Tags ${title} ${description}
==============================================================================

`;
  }

  /**
   * Generate table of contents
   * @param {Array} symbols - Array of symbols
   * @returns {string} Table of contents
   */
  generateTableOfContents(symbols) {
    const sections = this.groupSymbolsByType(symbols);
    let toc = 'CONTENTS                                                           *${this.getCurrentModuleName()}-contents*\n\n';
    
    for (const [type, typeSymbols] of Object.entries(sections)) {
      if (typeSymbols.length === 0) continue;
      
      toc += `${type.toUpperCase()}:\n`;
      typeSymbols.forEach(symbol => {
        const tag = this.generateTag(symbol);
        const deprecated = symbol.deprecated ? ' [DEPRECATED]' : '';
        toc += `  ${symbol.name.padEnd(25)} |${tag}${deprecated}\n`;
      });
      toc += '\n';
    }
    
    return toc;
  }

  /**
   * Generate sections for all symbols
   * @param {Array} symbols - Array of symbols
   * @returns {string} Symbol sections content
   */
  generateSymbolSections(symbols) {
    const sections = this.groupSymbolsByType(symbols);
    let content = '';
    
    for (const [type, typeSymbols] of Object.entries(sections)) {
      if (typeSymbols.length === 0) continue;
      
      content += `${type.toUpperCase()}                                                   *${this.getCurrentModuleName()}-${type}*\n\n`;
      
      typeSymbols.forEach(symbol => {
        content += this.generateSymbolSection(symbol);
      });
    }
    
    return content;
  }

  /**
   * Generate documentation section for a single symbol
   * @param {Object} symbol - Symbol object
   * @returns {string} Symbol documentation
   */
  generateSymbolSection(symbol) {
    const tag = this.generateTag(symbol);
    const emojiPrefix = generateEmojiPrefix(symbol);
    const signature = this.generateSignature(symbol);
    
    let content = `${tag} ${emojiPrefix}\n${signature}\n\n`;
    
    // Description
    if (symbol.description) {
      content += `${this.formatDescription(symbol.description)}\n\n`;
    }
    
    // Deprecation warning
    if (symbol.deprecated) {
      content += `⚠️  DEPRECATED: ${symbol.deprecatedMessage || 'This function is deprecated.'}\n\n`;
    }
    
    // Parameters
    if (symbol.parameters && symbol.parameters.length > 0) {
      content += 'Parameters: ~\n';
      symbol.parameters.forEach(param => {
        const formattedParam = formatParameterWithEmoji(param);
        const description = param.description ? ` - ${param.description}` : '';
        content += `                ${formattedParam}${description}\n`;
      });
      content += '~\n\n';
    }
    
    // Return value
    if (symbol.returns && symbol.returns.type !== 'void') {
      const formattedReturn = formatReturnWithEmoji(symbol.returns);
      content += `Returns: ~\n                ${formattedReturn}\n~\n\n`;
    }
    
    // Examples
    if (symbol.examples && symbol.examples.length > 0) {
      content += 'Example: >\n';
      symbol.examples.forEach((example, index) => {
        if (index === 0) {
          content += `>\n${this.formatExample(example)}\n`;
        } else {
          content += `>\nAlternative example ${index + 1}:\n${this.formatExample(example)}\n`;
        }
      });
      content += '<\n\n';
    }
    
    // Source reference
    if (symbol.filename) {
      const relativePath = path.relative('src', symbol.filename);
      content += `Source: ~\n                ${relativePath}:${symbol.line || '?'}\n~\n\n`;
    }
    
    content += '\n';
    return content;
  }

  /**
   * Generate function/class signature
   * @param {Object} symbol - Symbol object
   * @returns {string} Signature
   */
  generateSignature(symbol) {
    const name = symbol.name;
    const typeSymbol = symbol.type === 'class' ? 'Class' : 'Function';
    
    if (symbol.type === 'class') {
      return `${name}() ${typeSymbol}`;
    }
    
    if (symbol.type === 'property' || symbol.type === 'variable') {
      return `${name} ${typeSymbol}`;
    }
    
    // Function signature
    const params = symbol.parameters ? 
      symbol.parameters.map(p => {
        const optional = p.optional ? '?' : '';
        return `${p.name}${optional}`;
      }).join(', ') : 
      '';
    
    return `${name}(${params}) ${typeSymbol}`;
  }

  /**
   * Generate Vim tag for symbol
   * @param {Object} symbol - Symbol object
   * @returns {string} Tag string
   */
  generateTag(symbol) {
    const moduleName = symbol.primaryModule || symbol.module || 'unknown';
    const tagName = `${moduleName}_${symbol.name}()`;
    
    // Store for tags file generation
    this.tags.set(tagName, {
      file: this.getCurrentModuleName(),
      pattern: `/${symbol.name}/`
    });
    
    return tagName;
  }

  /**
   * Generate master tags file
   * @param {string} outputDir - Output directory
   */
  async generateTagsFile(outputDir) {
    let tagsContent = '!_TAG_FILE_SORTED\t1\t/unknown field/'
    tagsContent += '!_TAG_FILE_ENCODING\tutf-8\t/unknown field/'
    tagsContent += '!_TAG_FILE_FORMAT\t2\t/extended format; --format=1 will not compatible with vi/\n\n';
    
    for (const [tag, info] of this.tags) {
      tagsContent += `${tag}\t${info.file}.txt\t${info.pattern}\t"\n`;
    }
    
    const tagsPath = path.join(outputDir, 'tags');
    await fs.writeFile(tagsPath, tagsContent, 'utf8');
    
    console.log(`🏷️  Generated tags file with ${this.tags.size} tags`);
  }

  /**
   * Group symbols by type for organization
   * @param {Array} symbols - Array of symbols
   * @returns {Object} Symbols grouped by type
   */
  groupSymbolsByType(symbols) {
    const groups = {
      classes: [],
      functions: [],
      properties: [],
      variables: []
    };
    
    symbols.forEach(symbol => {
      const type = symbol.type === 'class' ? 'classes' :
                 symbol.type === 'function' ? 'functions' :
                 symbol.type === 'property' ? 'properties' :
                 'variables';
      
      if (groups[type]) {
        groups[type].push(symbol);
      }
    });
    
    return groups;
  }

  /**
   * Format description text for Vim
   * @param {string} description - Description text
   * @returns {string} Formatted description
   */
  formatDescription(description) {
    // Clean up description and wrap at reasonable line length
    return description
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join(' ')
      .replace(/\s+/g, ' ')
      .replace(/([.!?])\s+/g, '$1\n');
  }

  /**
   * Format example code for Vim
   * @param {string} example - Example code
   * @returns {string} Formatted example
   */
  formatExample(example) {
    return example
      .trim()
      .split('\n')
      .map(line => `> ${line}`)
      .join('\n');
  }

  /**
   * Generate file footer
   * @param {string} moduleName - Module name
   * @returns {string} Footer content
   */
  generateFooter(moduleName) {
    const emoji = getModuleEmoji(moduleName);
    return `==============================================================================
Generated by p5.js Documentation Automation
See: https://github.com/prjctimg/automata
Last updated: ${new Date().toISOString().split('T')[0]}
${emoji} End of ${moduleName} documentation ${emoji}
==============================================================================`;
  }

  /**
   * Get current module name from context
   * @returns {string} Module name
   */
  getCurrentModuleName() {
    // This would be set during file generation
    return 'p5-module';
  }

  /**
   * Set current module name for tag generation
   * @param {string} moduleName - Module name
   */
  setCurrentModuleName(moduleName) {
    this.currentModuleName = moduleName;
  }

  /**
   * Get all generated files
   * @returns {Map} Generated files map
   */
  getGeneratedFiles() {
    return this.generatedFiles;
  }

  /**
   * Get all generated tags
   * @returns {Map} Generated tags map
   */
  getGeneratedTags() {
    return this.tags;
  }
}