import { FileUtils } from './helpers.js';

/**
 * Parser for Zig documentation comments
 * Supports Zig-style doc comments and comptime features
 */
export class ZigDocParser {
  constructor() {
    this.modules = new Map();
    this.symbols = new Map();
    this.currentModule = null;
  }

  /**
   * Parse Zig source code to extract documentation
   * @param {string} source - Zig source code
   * @param {string} filename - Source filename
   * @returns {Object} Extracted module and symbol data
   */
  parse(source, filename) {
    try {
      const lines = source.split('\n');
      this.processLines(lines, filename);
      
      return {
        modules: this.modules,
        symbols: this.symbols,
        filename
      };
    } catch (error) {
      console.error(`Error parsing ${filename}:`, error.message);
      return { modules: new Map(), symbols: new Map(), filename, error };
    }
  }

  /**
   * Process Zig source lines to extract documentation
   * @param {string[]} lines - Source code lines
   * @param {string} filename - Source filename
   */
  processLines(lines, filename) {
    let currentSymbol = null;
    let docLines = [];
    let inDocComment = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Track module declarations
      if (line.startsWith('pub const ') || line.startsWith('pub fn ') || 
          line.startsWith('pub const ') || line.startsWith('pub struct ')) {
        this.processPendingDoc(docLines, filename, i);
        
        if (line.startsWith('pub const ') || line.startsWith('pub struct ')) {
          this.extractModuleFromLine(line, filename);
        } else {
          this.extractSymbolFromLine(line, filename, i);
        }
        
        docLines = [];
        inDocComment = false;
      }
      
      // Track doc comments
      else if (line.startsWith('/// ')) {
        const docLine = line.slice(3).trim();
        if (docLine) {
          docLines.push(docLine);
          inDocComment = true;
        }
      }
      // End of doc comment
      else if (inDocComment && line.startsWith('pub ')) {
        this.processPendingDoc(docLines, filename, i);
        docLines = [];
        inDocComment = false;
      }
    }
    
    // Process any remaining documentation
    this.processPendingDoc(docLines, filename, lines.length);
  }

  /**
   * Extract module information from line
   * @param {string} line - Source line
   * @param {string} filename - Source filename
   */
  extractModuleFromLine(line, filename) {
    // Extract module name from various patterns
    let moduleMatch = line.match(/^pub (?:const|struct|fn)\s+(\w+)/);
    if (moduleMatch) {
      const moduleName = moduleMatch[1];
      
      // Heuristics for module categorization
      const category = this.detectModuleCategory(moduleName);
      
      if (category) {
        this.modules.set(moduleName, {
          name: moduleName,
          category,
          description: `Zig ${category} module`,
          symbols: [],
          filename,
          language: 'zig'
        });
      }
    }
  }

  /**
   * Detect module category based on naming patterns
   * @param {string} moduleName - Module name
   * @returns {string|null} Category name
   */
  detectModuleCategory(moduleName) {
    const patterns = {
      'std': ['std', 'builtin', 'core'],
      'math': ['math', 'vec', 'mat', 'float', 'int'],
      'io': ['fs', 'io', 'file', 'path', 'net', 'http'],
      'memory': ['mem', 'alloc', 'heap', 'memory'],
      'crypto': ['crypto', 'hash', 'cipher', 'aes'],
      'system': ['os', 'time', 'env', 'process', 'thread'],
      'graphics': ['gfx', 'draw', 'color', 'pixel', 'image', 'render'],
      'data': ['json', 'xml', 'html', 'url', 'parse', 'format']
    };
    
    const lowerName = moduleName.toLowerCase();
    
    for (const [category, keywords] of Object.entries(patterns)) {
      if (keywords.some(keyword => lowerName.includes(keyword))) {
        return category;
      }
    }
    
    return null;
  }

  /**
   * Extract symbol information from line
   * @param {string} line - Source line
   * @param {string} filename - Source filename
   * @param {number} lineNumber - Line number
   */
  extractSymbolFromLine(line, filename, lineNumber) {
    // Extract function, constant, or struct
    let symbolMatch = line.match(/^pub (?:fn|const|struct)\s+(\w+)(?:\([^)]*\))?\s*(?::)?/);
    
    if (symbolMatch) {
      const [symbolName, params, returnType] = this.parseSignature(symbolMatch);
      const symbolType = this.detectSymbolType(line, symbolMatch);
      
      const symbol = {
        name: symbolName,
        type: symbolType,
        module: this.currentModule,
        category: this.detectModuleCategory(symbolName),
        parameters: params ? this.parseParameters(params) : [],
        returns: returnType ? this.parseReturnType(returnType) : null,
        language: 'zig',
        filename,
        line: lineNumber,
        public: true,
        description: '',
        examples: []
      };
      
      this.symbols.set(`${this.currentModule}.${symbolName}`, symbol);
      
      // Add to current module
      if (this.modules.has(this.currentModule)) {
        const module = this.modules.get(this.currentModule);
        module.symbols.push(`${this.currentModule}.${symbolName}`);
      }
    }
  }

  /**
   * Parse symbol signature components
   * @param {RegExpMatchArray} match - Regex match from symbol line
   * @returns {Array} [name, params, returnType]
   */
  parseSignature(match) {
    const fullMatch = match[0];
    const paramsMatch = fullMatch.match(/\(([^)]*)\)/);
    const returnTypeMatch = fullMatch.match(/::\s*([^:\s*]*)$/);
    
    const symbolName = match[1] || '';
    const params = paramsMatch ? paramsMatch[1] : '';
    const returnType = returnTypeMatch ? returnTypeMatch[1] : '';
    
    return [symbolName, params, returnType];
  }

  /**
   * Detect symbol type from line content
   * @param {string} line - Source line
   * @param {RegExpMatchArray} match - Regex match
   * @returns {string} Symbol type
   */
  detectSymbolType(line, match) {
    if (line.includes('pub fn')) {
      return 'function';
    } else if (line.includes('pub const')) {
      return 'constant';
    } else if (line.includes('pub struct')) {
      return 'class';
    } else {
      return 'variable';
    }
  }

  /**
   * Parse parameters from parameter string
   * @param {string} paramString - Parameter string
   * @returns {Array} Array of parameter objects
   */
  parseParameters(paramString) {
    if (!paramString.trim()) {
      return [];
    }
    
    const params = paramString.split(',').map(param => {
      const trimmed = param.trim();
      const typeMatch = trimmed.match(/^(\w+)(?:\s*[^:]+)?/);
      
      if (typeMatch) {
        const type = typeMatch[1];
        const defaultValue = trimmed.includes(':') ? 
          trimmed.split(':')[1].trim() : '';
        
        return {
          type: this.normalizeZigType(type),
          name: this.extractParamName(type),
          optional: defaultValue !== '',
          description: '',
          defaultValue
        };
      }
      
      return {
        type: 'unknown',
        name: trimmed,
        optional: false,
        description: ''
      };
    }).filter(p => p.name); // Filter out empty names
    
    return params;
  }

  /**
   * Parse return type from return string
   * @param {string} returnString - Return type string
   * @returns {Object} Parsed return type
   */
  parseReturnType(returnString) {
    if (!returnString.trim()) {
      return { type: 'void', description: '' };
    }
    
    return {
      type: this.normalizeZigType(returnString.trim()),
      description: ''
    };
  }

  /**
   * Normalize Zig types to standard format
   * @param {string} zigType - Zig type string
   * @returns {string} Normalized type
   */
  normalizeZigType(zigType) {
    const typeMap = {
      'u8': 'Number', 'i8': 'Number', 'u16': 'Number', 'i16': 'Number',
      'u32': 'Number', 'i32': 'Number', 'u64': 'Number', 'i64': 'Number',
      'f32': 'Number', 'f64': 'Number',
      'bool': 'Boolean', 'void': 'void',
      '[]const u8': 'Array<u8>', '[]const f32': 'Array<f32>'
    };
    
    return typeMap[zigType] || zigType;
  }

  /**
   * Extract parameter name from type
   * @param {string} type - Parameter type
   * @returns {string} Parameter name
   */
  extractParamName(type) {
    // Extract last word after common patterns
    const words = type.split(/\s+/);
    const lastWord = words[words.length - 1];
    
    // Remove common type prefixes
    return lastWord.replace(/^(a|an|the|some|my|our)/, '');
  }

  /**
   * Process pending documentation
   * @param {string[]} docLines - Documentation lines
   * @param {string} filename - Source filename
   * @param {number} lineNumber - Line number
   */
  processPendingDoc(docLines, filename, lineNumber) {
    if (docLines.length > 0 && this.currentSymbol) {
      const description = docLines.join(' ').trim();
      
      // Extract examples from doc comments
      const examples = this.extractExamplesFromDoc(description);
      
      // Update the most recent symbol with documentation
      const symbolKey = `${this.currentModule}.${this.currentSymbol}`;
      if (this.symbols.has(symbolKey)) {
        const symbol = this.symbols.get(symbolKey);
        symbol.description = description;
        symbol.examples = examples;
      }
    }
  }

  /**
   * Extract code examples from documentation
   * @param {string} doc - Documentation string
   * @returns {Array} Array of example code blocks
   */
  extractExamplesFromDoc(doc) {
    const examples = [];
    
    // Look for code blocks or example patterns
    const exampleMatch = doc.match(/```(?:zig)?\n([\s\S]*?)\n```/);
    if (exampleMatch) {
      examples.push(exampleMatch[1]);
    }
    
    return examples;
  }

  /**
   * Get all parsed modules
   * @returns {Map} All modules
   */
  getModules() {
    return this.modules;
  }

  /**
   * Get all parsed symbols
   * @returns {Map} All symbols
   */
  getSymbols() {
    return this.symbols;
  }
}