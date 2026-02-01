/**
 * Manages tag generation and deduplication for Vim documentation
 */
export class TagManager {
  constructor() {
    this.tags = new Map();
    this.tagPrefixes = new Map();
  }

  /**
   * Add a tag to the manager
   * @param {string} name - Tag name
   * @param {string} file - File where tag is defined
   * @param {string} pattern - Search pattern for tag
   * @param {Object} options - Additional options
   */
  addTag(name, file, pattern, options = {}) {
    // Create unique tag name
    const uniqueName = this.createUniqueTag(name, options);
    
    // Store tag information
    this.tags.set(uniqueName, {
      file,
      pattern: pattern || `/${name.replace(/[()]/g, '')}/`,
      type: options.type || 'function',
      module: options.module || 'unknown',
      line: options.line,
      deprecated: options.deprecated || false
    });
    
    return uniqueName;
  }

  /**
   * Create unique tag name to avoid conflicts
   * @param {string} baseName - Base tag name
   * @param {Object} options - Tag options
   * @returns {string} Unique tag name
   */
  createUniqueTag(baseName, options) {
    const module = options.module || 'unknown';
    const type = options.type || 'function';
    
    // Add module prefix for disambiguation
    let tagName = `${module}_${baseName}`;
    
    // Add suffix for functions to distinguish from properties
    if (type === 'function' || type === 'method') {
      tagName += '()';
    }
    
    // Handle name conflicts by adding suffix
    let counter = 1;
    let finalName = tagName;
    
    while (this.tags.has(finalName)) {
      finalName = `${tagName}_${counter}`;
      counter++;
    }
    
    return finalName;
  }

  /**
   * Add multiple tags from a module
   * @param {Array} symbols - Array of symbols
   * @param {string} module - Module name
   */
  addModuleTags(symbols, module) {
    symbols.forEach(symbol => {
      this.addSymbolTag(symbol, module);
    });
  }

  /**
   * Add tag for a single symbol
   * @param {Object} symbol - Symbol object
   * @param {string} module - Module name
   */
  addSymbolTag(symbol, module) {
    const tagOptions = {
      type: symbol.type,
      module: symbol.primaryModule || module,
      line: symbol.line,
      deprecated: symbol.deprecated
    };
    
    this.addTag(symbol.name, `${module}.txt`, null, tagOptions);
  }

  /**
   * Generate tags file content
   * @returns {string} Tags file content
   */
  generateTagsFile() {
    let content = this.getTagsHeader();
    
    // Sort tags by name for consistent ordering
    const sortedTags = Array.from(this.tags.entries()).sort(([a], [b]) => 
      a.localeCompare(b)
    );
    
    // Generate tag lines
    sortedTags.forEach(([name, info]) => {
      content += this.formatTagLine(name, info);
    });
    
    return content;
  }

  /**
   * Get tags file header
   * @returns {string} Tags header
   */
  getTagsHeader() {
    return `!_TAG_FILE_SORTED\t1\t/unknown field/
!_TAG_FILE_ENCODING\tutf-8\t/unknown field/
!_TAG_FILE_FORMAT\t2\t/extended format; --format=1 will not compatible with vi/
!_TAG_PROGRAM_AUTHOR\tprjctimg
!_TAG_PROGRAM_NAME\tp5.js Documentation Automation
!_TAG_PROGRAM_URL\thttps://github.com/prjctimg/automata

`;
  }

  /**
   * Format a single tag line
   * @param {string} name - Tag name
   * @param {Object} info - Tag information
   * @returns {string} Formatted tag line
   */
  formatTagLine(name, info) {
    // Format: tagname<TAB>filename<TAB>address;"<TAB>type
    const deprecated = info.deprecated ? ' [DEPRECATED]' : '';
    return `${name}\t${info.file}\t${info.pattern}\t"${deprecated}"\n`;
  }

  /**
   * Get all tags for a specific module
   * @param {string} module - Module name
   * @returns {Array} Array of tag entries
   */
  getModuleTags(module) {
    const moduleTags = [];
    
    this.tags.forEach((info, name) => {
      if (info.module === module) {
        moduleTags.push({ name, ...info });
      }
    });
    
    return moduleTags.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get deprecated tags
   * @returns {Array} Array of deprecated tags
   */
  getDeprecatedTags() {
    const deprecated = [];
    
    this.tags.forEach((info, name) => {
      if (info.deprecated) {
        deprecated.push({ name, ...info });
      }
    });
    
    return deprecated;
  }

  /**
   * Check for tag conflicts
   * @returns {Array} Array of conflicts
   */
  detectConflicts() {
    const conflicts = [];
    const tagCounts = new Map();
    
    // Count occurrences of similar tag names (without suffixes)
    this.tags.forEach((info, name) => {
      const baseName = name.replace(/\([^)]*\)/g, '').replace(/_\d+$/, '');
      tagCounts.set(baseName, (tagCounts.get(baseName) || 0) + 1);
    });
    
    // Find conflicts
    tagCounts.forEach((count, name) => {
      if (count > 1) {
        const conflictingTags = [];
        this.tags.forEach((info, tagName) => {
          if (tagName.includes(name) || name.includes(tagName.replace(/\([^)]*\)/g, '').replace(/_\d+$/, ''))) {
            conflictingTags.push(tagName);
          }
        });
        
        conflicts.push({ name, count, tags: conflictingTags });
      }
    });
    
    return conflicts;
  }

  /**
   * Resolve tag conflicts automatically
   */
  resolveConflicts() {
    const conflicts = this.detectConflicts();
    
    conflicts.forEach(conflict => {
      console.warn(`⚠️  Tag conflict detected for "${conflict.name}" with ${conflict.count} variations`);
      
      // Keep the most specific tag (with module prefix)
      conflict.tags.sort((a, b) => {
        const aScore = (a.includes('_') ? 1 : 0) + (a.includes('()') ? 1 : 0);
        const bScore = (b.includes('_') ? 1 : 0) + (b.includes('()') ? 1 : 0);
        return bScore - aScore;
      });
      
      // Remove less specific tags
      for (let i = 1; i < conflict.tags.length; i++) {
        const tagToRemove = conflict.tags[i];
        console.log(`  🗑️  Removing tag: ${tagToRemove}`);
        this.tags.delete(tagToRemove);
      }
    });
  }

  /**
   * Get statistics about tags
   * @returns {Object} Tag statistics
   */
  getStatistics() {
    const stats = {
      total: this.tags.size,
      byModule: {},
      byType: {},
      deprecated: 0,
      conflicts: this.detectConflicts().length
    };
    
    this.tags.forEach((info, name) => {
      // Count by module
      stats.byModule[info.module] = (stats.byModule[info.module] || 0) + 1;
      
      // Count by type
      stats.byType[info.type] = (stats.byType[info.type] || 0) + 1;
      
      // Count deprecated
      if (info.deprecated) {
        stats.deprecated++;
      }
    });
    
    return stats;
  }

  /**
   * Export all tags as array
   * @returns {Array} Array of tag objects
   */
  exportTags() {
    const tags = [];
    
    this.tags.forEach((info, name) => {
      tags.push({
        name,
        ...info
      });
    });
    
    return tags;
  }

  /**
   * Clear all tags
   */
  clear() {
    this.tags.clear();
    this.tagPrefixes.clear();
  }

  /**
   * Get tag count
   * @returns {number} Number of tags
   */
  size() {
    return this.tags.size;
  }
}