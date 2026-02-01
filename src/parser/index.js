import { parse } from '@babel/parser';
import traverse from '@babel/traverse';

/**
 * Parses JavaScript source code to extract JSDoc comments and module information
 */
export class JSDocParser {
  constructor() {
    this.modules = new Map();
    this.symbols = new Map();
    this.currentModule = null;
    this.currentSubmodule = null;
  }

  /**
   * Parse source code and extract module and symbol information
   * @param {string} source - JavaScript source code
   * @param {string} filename - Source filename
   * @returns {Object} Extracted module and symbol data
   */
  parse(source, filename) {
    try {
      const ast = parse(source, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript']
      });

      this.extractComments(ast);
      this.traverseAST(ast, filename);
      
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
   * Extract leading comments from AST
   * @param {Object} ast - Abstract syntax tree
   */
  extractComments(ast) {
    if (ast.comments && ast.comments.length > 0) {
      ast.comments.forEach(comment => {
        if (comment.type === 'CommentBlock' && comment.value.startsWith('*')) {
          this.parseJSDocComment(comment);
        }
      });
    }
  }

  /**
   * Parse JSDoc comment for module declarations and metadata
   * @param {Object} comment - Comment node from AST
   */
  parseJSDocComment(comment) {
    const content = comment.value;
    const lines = content.split('\n').map(line => line.trim().replace(/^\*/, '').trim());
    
    const tags = this.extractTags(lines);
    
    // Check for module declarations
    if (tags.has('module')) {
      this.currentModule = tags.get('module');
      this.currentSubmodule = tags.get('submodule') || null;
      
      this.modules.set(this.currentModule, {
        name: this.currentModule,
        submodule: this.currentSubmodule,
        description: this.extractDescription(lines),
        tags: Object.fromEntries(tags),
        symbols: []
      });
    }
  }

  /**
   * Extract tags from JSDoc comment lines
   * @param {string[]} lines - JSDoc comment lines
   * @returns {Map} Extracted tags
   */
  extractTags(lines) {
    const tags = new Map();
    
    lines.forEach(line => {
      const tagMatch = line.match(/^@(\w+)\s*(.*)$/);
      if (tagMatch) {
        const [, tag, value] = tagMatch;
        tags.set(tag, value.trim());
      }
    });
    
    return tags;
  }

  /**
   * Extract description from JSDoc comment lines
   * @param {string[]} lines - JSDoc comment lines
   * @returns {string} Description text
   */
  extractDescription(lines) {
    const descriptionLines = [];
    let inDescription = true;
    
    for (const line of lines) {
      if (line.startsWith('@')) {
        inDescription = false;
        break;
      }
      if (inDescription && line.length > 0) {
        descriptionLines.push(line);
      }
    }
    
    return descriptionLines.join(' ').trim();
  }

  /**
   * Traverse AST to find function, class, and property definitions
   * @param {Object} ast - Abstract syntax tree
   * @param {string} filename - Source filename
   */
  traverseAST(ast, filename) {
    traverse(ast, {
      FunctionDeclaration: (path) => this.handleFunction(path, filename),
      FunctionExpression: (path) => this.handleFunction(path, filename),
      ArrowFunctionExpression: (path) => this.handleFunction(path, filename),
      ClassDeclaration: (path) => this.handleClass(path, filename),
      ClassExpression: (path) => this.handleClass(path, filename),
      AssignmentExpression: (path) => this.handleAssignment(path, filename),
      VariableDeclarator: (path) => this.handleVariable(path, filename)
    });
  }

  /**
   * Handle function declarations and expressions
   * @param {Object} path - Babel AST path
   * @param {string} filename - Source filename
   */
  handleFunction(path, filename) {
    const node = path.node;
    const leadingComments = node.leadingComments || [];
    
    if (leadingComments.length === 0) return;
    
    const jsdoc = this.parseSymbolJSDoc(leadingComments[0]);
    if (!jsdoc) return;
    
    const functionName = node.id?.name || 'anonymous';
    
    // Skip private/internal functions
    if (this.isPrivateSymbol(functionName, jsdoc)) return;
    
    const symbol = {
      type: 'function',
      name: functionName,
      module: this.currentModule,
      submodule: this.currentSubmodule,
      description: jsdoc.description,
      parameters: jsdoc.parameters || [],
      returns: jsdoc.returns,
      examples: jsdoc.examples || [],
      deprecated: jsdoc.deprecated,
      deprecatedMessage: jsdoc.deprecatedMessage,
      forClass: jsdoc.forClass,
      filename,
      line: node.loc?.start?.line
    };
    
    this.addSymbol(symbol);
  }

  /**
   * Handle class declarations and expressions
   * @param {Object} path - Babel AST path
   * @param {string} filename - Source filename
   */
  handleClass(path, filename) {
    const node = path.node;
    const leadingComments = node.leadingComments || [];
    
    if (leadingComments.length === 0) return;
    
    const jsdoc = this.parseSymbolJSDoc(leadingComments[0]);
    if (!jsdoc) return;
    
    const className = node.id?.name || 'Anonymous';
    
    // Skip private/internal classes
    if (this.isPrivateSymbol(className, jsdoc)) return;
    
    const symbol = {
      type: 'class',
      name: className,
      module: this.currentModule,
      submodule: this.currentSubmodule,
      description: jsdoc.description,
      parameters: jsdoc.parameters || [],
      examples: jsdoc.examples || [],
      deprecated: jsdoc.deprecated,
      deprecatedMessage: jsdoc.deprecatedMessage,
      filename,
      line: node.loc?.start?.line
    };
    
    this.addSymbol(symbol);
  }

  /**
   * Handle assignment expressions (for properties and methods)
   * @param {Object} path - Babel AST path
   * @param {string} filename - Source filename
   */
  handleAssignment(path, filename) {
    const node = path.node;
    const leadingComments = node.leadingComments || [];
    
    if (leadingComments.length === 0) return;
    
    const jsdoc = this.parseSymbolJSDoc(leadingComments[0]);
    if (!jsdoc) return;
    
    const propertyName = this.extractPropertyName(node.left);
    if (!propertyName) return;
    
    // Skip private/internal symbols
    if (this.isPrivateSymbol(propertyName, jsdoc)) return;
    
    let symbolType = 'property';
    if (jsdoc.method) {
      symbolType = 'function';
    } else if (jsdoc.property) {
      symbolType = 'property';
    } else if (jsdoc.class) {
      symbolType = 'class';
    }
    
    const symbol = {
      type: symbolType,
      name: propertyName,
      module: this.currentModule,
      submodule: this.currentSubmodule,
      description: jsdoc.description,
      parameters: jsdoc.parameters || [],
      returns: jsdoc.returns,
      examples: jsdoc.examples || [],
      deprecated: jsdoc.deprecated,
      deprecatedMessage: jsdoc.deprecatedMessage,
      forClass: jsdoc.forClass || this.extractForClass(jsdoc),
      filename,
      line: node.loc?.start?.line
    };
    
    this.addSymbol(symbol);
  }

  /**
   * Handle variable declarations (for constants and properties)
   * @param {Object} path - Babel AST path
   * @param {string} filename - Source filename
   */
  handleVariable(path, filename) {
    const node = path.node;
    const leadingComments = node.leadingComments || [];
    
    if (leadingComments.length === 0) return;
    
    const jsdoc = this.parseSymbolJSDoc(leadingComments[0]);
    if (!jsdoc) return;
    
    const variableName = node.id?.name;
    if (!variableName) return;
    
    // Skip private/internal symbols
    if (this.isPrivateSymbol(variableName, jsdoc)) return;
    
    const symbol = {
      type: 'variable',
      name: variableName,
      module: this.currentModule,
      submodule: this.currentSubmodule,
      description: jsdoc.description,
      examples: jsdoc.examples || [],
      deprecated: jsdoc.deprecated,
      deprecatedMessage: jsdoc.deprecatedMessage,
      forClass: jsdoc.forClass,
      filename,
      line: node.loc?.start?.line
    };
    
    this.addSymbol(symbol);
  }

  /**
   * Parse JSDoc comment for individual symbols
   * @param {Object} comment - Comment node
   * @returns {Object|null} Parsed JSDoc data
   */
  parseSymbolJSDoc(comment) {
    if (!comment.value.startsWith('*')) return null;
    
    const content = comment.value;
    const lines = content.split('\n').map(line => line.trim().replace(/^\*/, '').trim());
    
    const tags = new Map();
    const parameters = [];
    const examples = [];
    let description = '';
    let deprecated = false;
    let deprecatedMessage = '';
    
    let inDescription = true;
    let inExample = false;
    let currentExample = '';
    
    lines.forEach(line => {
      // Handle tags
      if (line.startsWith('@')) {
        const tagMatch = line.match(/^@(\w+)\s*(.*)$/);
        if (tagMatch) {
          const [, tag, value] = tagMatch;
          inDescription = false;
          inExample = false;
          
          switch (tag) {
            case 'param':
              parameters.push(this.parseParameter(value));
              break;
            case 'method':
            case 'property':
            case 'class':
              tags.set(tag, value);
              break;
            case 'deprecated':
              deprecated = true;
              deprecatedMessage = value || 'This symbol is deprecated';
              break;
            case 'return':
              tags.set('returns', this.parseReturn(value));
              break;
            case 'example':
              inExample = true;
              currentExample = '';
              break;
            case 'for':
              tags.set('forClass', value);
              break;
            default:
              tags.set(tag, value);
          }
        }
      } else if (inExample) {
        currentExample += line + '\n';
      } else if (inDescription && line.length > 0) {
        description += line + ' ';
      }
    });
    
    if (currentExample) {
      examples.push(currentExample.trim());
    }
    
    return {
      description: description.trim(),
      parameters,
      examples,
      deprecated,
      deprecatedMessage,
      forClass: tags.get('forClass'),
      returns: tags.get('returns'),
      ...Object.fromEntries(tags)
    };
  }

  /**
   * Parse parameter string from JSDoc
   * @param {string} paramStr - Parameter string
   * @returns {Object} Parsed parameter
   */
  parseParameter(paramStr) {
    const match = paramStr.match(/^\{([^}]+)\}\s*(\w+)(?:\s*\[([^]]+)\])?\s*(.*)$/);
    if (!match) {
      return { name: paramStr.trim(), type: 'unknown', description: '' };
    }
    
    const [, type, name, optional = '', description = ''] = match;
    
    return {
      type: type.trim(),
      name: name.trim(),
      optional: optional.length > 0,
      description: description.trim()
    };
  }

  /**
   * Parse return value from JSDoc
   * @param {string} returnStr - Return string
   * @returns {Object} Parsed return value
   */
  parseReturn(returnStr) {
    const match = returnStr.match(/^\{([^}]+)\}\s*(.*)$/);
    if (!match) {
      return { type: 'void', description: returnStr.trim() };
    }
    
    const [, type, description = ''] = match;
    
    return {
      type: type.trim(),
      description: description.trim()
    };
  }

  /**
   * Extract property name from assignment left side
   * @param {Object} leftNode - Left side of assignment
   * @returns {string|null} Property name
   */
  extractPropertyName(leftNode) {
    if (leftNode.type === 'Identifier') {
      return leftNode.name;
    } else if (leftNode.type === 'MemberExpression') {
      // Handle p5.propertyName
      const property = leftNode.property;
      return property.name || property.value;
    }
    return null;
  }

  /**
   * Extract class name from @for tag
   * @param {Object} jsdoc - Parsed JSDoc
   * @returns {string|null} Class name
   */
  extractForClass(jsdoc) {
    const forValue = jsdoc.forClass;
    if (forValue) {
      // Extract p5.ClassName to get ClassName
      const match = forValue.match(/p5\.(\w+)/);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  /**
   * Check if symbol should be excluded (private/internal)
   * @param {string} name - Symbol name
   * @param {Object} jsdoc - Parsed JSDoc
   * @returns {boolean} True if symbol is private
   */
  isPrivateSymbol(name, jsdoc) {
    return name.startsWith('_') || 
           jsdoc.private || 
           name.includes('internal') ||
           name.includes('private');
  }

  /**
   * Add symbol to appropriate collections
   * @param {Object} symbol - Symbol object
   */
  addSymbol(symbol) {
    const key = `${symbol.module}.${symbol.name}`;
    this.symbols.set(key, symbol);
    
    if (this.modules.has(symbol.module)) {
      const module = this.modules.get(symbol.module);
      if (!module.symbols.includes(key)) {
        module.symbols.push(key);
      }
    }
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