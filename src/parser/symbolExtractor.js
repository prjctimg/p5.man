import { JSDocParser } from './index.js';
import { ModuleDetector } from './moduleDetector.js';

/**
 * Extracts and processes all symbols from p5.js source code
 */
export class SymbolExtractor {
  constructor() {
    this.parser = new JSDocParser();
    this.detector = new ModuleDetector();
    this.allSymbols = new Map();
    this.modules = new Map();
  }

  /**
   * Extract all symbols from p5.js source directory
   * @param {string} sourceDir - p5.js source directory
   * @returns {Promise<Object>} Extracted symbols and modules
   */
  async extractAll(sourceDir) {
    console.log('🔍 Extracting symbols from p5.js source...');
    
    try {
      // Detect modules first
      this.modules = await this.detector.detectModules(sourceDir);
      console.log(`📦 Found ${this.modules.size} modules`);
      
      // Get all JavaScript files
      const jsFiles = await this.detector.getJavaScriptFiles(sourceDir);
      console.log(`📄 Processing ${jsFiles.length} JavaScript files`);
      
      let processedCount = 0;
      let symbolCount = 0;
      
      for (const file of jsFiles) {
        try {
          const content = await import('fs/promises').then(fs => fs.readFile(file, 'utf8'));
          const result = this.parser.parse(content, file);
          
          if (result.symbols.size > 0) {
            result.symbols.forEach((symbol, key) => {
              // Only include public API symbols
              if (this.isPublicSymbol(symbol)) {
                // Map symbol to primary module
                const primaryModule = this.detector.mapSymbolToModule(symbol);
                if (primaryModule) {
                  symbol.primaryModule = primaryModule;
                  this.allSymbols.set(key, symbol);
                  symbolCount++;
                }
              }
            });
          }
          
          processedCount++;
          if (processedCount % 50 === 0) {
            console.log(`⏳ Processed ${processedCount}/${jsFiles.length} files...`);
          }
        } catch (error) {
          console.warn(`⚠️  Error processing ${file}:`, error.message);
        }
      }
      
      console.log(`✅ Extracted ${symbolCount} public symbols from ${processedCount} files`);
      
      // Group symbols by module
      const symbolsByModule = this.groupSymbolsByModule();
      
      return {
        symbols: this.allSymbols,
        modules: this.modules,
        symbolsByModule
      };
    } catch (error) {
      console.error('❌ Error extracting symbols:', error);
      throw error;
    }
  }

  /**
   * Check if symbol is part of public API
   * @param {Object} symbol - Symbol object
   * @returns {boolean} True if symbol is public
   */
  isPublicSymbol(symbol) {
    // Exclude private/internal symbols
    if (symbol.name.startsWith('_')) {
      return false;
    }
    
    if (symbol.private) {
      return false;
    }
    
    // Exclude obvious internal names
    const internalPatterns = [
      /^_/, /internal/i, /private/i, /debug/i, /test/i
    ];
    
    for (const pattern of internalPatterns) {
      if (pattern.test(symbol.name)) {
        return false;
      }
    }
    
    // Include symbols that are:
    // - Functions with @method tag
    // - Classes with @class tag  
    // - Properties with @property tag
    // - Variables with documentation
    
    if (symbol.method || symbol.class || symbol.property) {
      return true;
    }
    
    if (symbol.type === 'function' || symbol.type === 'class') {
      return true;
    }
    
    if (symbol.description && symbol.description.length > 10) {
      return true;
    }
    
    return false;
  }

  /**
   * Group symbols by their primary module
   * @returns {Map} Symbols grouped by module
   */
  groupSymbolsByModule() {
    const symbolsByModule = new Map();
    
    // Initialize with defined modules
    const moduleNames = [
      'shape', 'color', 'typography', 'image', 'transform', 'environment',
      '3d', 'rendering', 'math', 'io', 'events', 'data', 
      'structure', 'dom', 'constants'
    ];
    
    moduleNames.forEach(name => {
      symbolsByModule.set(name, []);
    });
    
    // Group symbols
    this.allSymbols.forEach((symbol, key) => {
      const module = symbol.primaryModule || symbol.module || 'unknown';
      
      if (!symbolsByModule.has(module)) {
        symbolsByModule.set(module, []);
      }
      
      symbolsByModule.get(module).push({
        ...symbol,
        key
      });
    });
    
    // Sort symbols within each module
    symbolsByModule.forEach((symbols, moduleName) => {
      symbols.sort((a, b) => {
        // Classes first, then functions, then properties/variables
        const typeOrder = { class: 0, function: 1, property: 2, variable: 3 };
        const aOrder = typeOrder[a.type] ?? 999;
        const bOrder = typeOrder[b.type] ?? 999;
        
        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }
        
        // Then alphabetically
        return a.name.localeCompare(b.name);
      });
    });
    
    return symbolsByModule;
  }

  /**
   * Get symbol by name
   * @param {string} name - Symbol name
   * @returns {Object|null} Symbol object
   */
  getSymbol(name) {
    for (const [key, symbol] of this.allSymbols) {
      if (symbol.name === name) {
        return symbol;
      }
    }
    return null;
  }

  /**
   * Get all symbols of a specific type
   * @param {string} type - Symbol type (function, class, property, variable)
   * @returns {Array} Array of symbols
   */
  getSymbolsByType(type) {
    const symbols = [];
    this.allSymbols.forEach(symbol => {
      if (symbol.type === type) {
        symbols.push(symbol);
      }
    });
    return symbols;
  }

  /**
   * Get deprecated symbols
   * @returns {Array} Array of deprecated symbols
   */
  getDeprecatedSymbols() {
    const deprecated = [];
    this.allSymbols.forEach(symbol => {
      if (symbol.deprecated) {
        deprecated.push(symbol);
      }
    });
    return deprecated;
  }

  /**
   * Get statistics about extracted symbols
   * @returns {Object} Statistics
   */
  getStatistics() {
    const stats = {
      totalSymbols: this.allSymbols.size,
      totalModules: this.modules.size,
      byType: {},
      byModule: {},
      deprecated: 0
    };
    
    // Count by type
    this.allSymbols.forEach(symbol => {
      stats.byType[symbol.type] = (stats.byType[symbol.type] || 0) + 1;
      
      const module = symbol.primaryModule || 'unknown';
      stats.byModule[module] = (stats.byModule[module] || 0) + 1;
      
      if (symbol.deprecated) {
        stats.deprecated++;
      }
    });
    
    return stats;
  }

  /**
   * Export symbols in structured format
   * @returns {Object} Exported data
   */
  exportData() {
    return {
      symbols: Object.fromEntries(this.allSymbols),
      modules: Object.fromEntries(this.modules),
      symbolsByModule: Object.fromEntries(this.groupSymbolsByModule()),
      statistics: this.getStatistics(),
      timestamp: new Date().toISOString()
    };
  }
}