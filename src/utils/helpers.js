import fs from 'fs/promises';
import path from 'path';

/**
 * File and directory utilities
 */
export class FileUtils {
  /**
   * Ensure directory exists
   * @param {string} dirPath - Directory path
   */
  static async ensureDir(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      return true;
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
      return false;
    }
  }

  /**
   * Check if file exists
   * @param {string} filePath - File path
   * @returns {Promise<boolean>} True if file exists
   */
  static async exists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read file with error handling
   * @param {string} filePath - File path
   * @returns {Promise<string|null>} File content or null
   */
  static async readFileSafe(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return content;
    } catch (error) {
      console.warn(`Failed to read ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Write file with backup
   * @param {string} filePath - File path
   * @param {string} content - File content
   * @param {boolean} backup - Whether to create backup
   */
  static async writeFileSafe(filePath, content, backup = true) {
    try {
      // Create backup if file exists and backup is enabled
      if (backup && await this.exists(filePath)) {
        const backupPath = `${filePath}.backup.${Date.now()}`;
        await fs.copyFile(filePath, backupPath);
      }

      // Ensure directory exists
      await this.ensureDir(path.dirname(filePath));
      
      // Write file
      await fs.writeFile(filePath, content, 'utf8');
      return true;
    } catch (error) {
      console.error(`Failed to write ${filePath}:`, error.message);
      return false;
    }
  }

  /**
   * Get all files in directory recursively
   * @param {string} dirPath - Directory path
   * @param {RegExp} pattern - File pattern filter
   * @returns {Promise<Array>} Array of file paths
   */
  static async getFilesRecursively(dirPath, pattern = null) {
    const files = [];
    
    async function scan(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await scan(fullPath);
        } else if (entry.isFile()) {
          if (!pattern || pattern.test(entry.name)) {
            files.push(fullPath);
          }
        }
      }
    }
    
    await scan(dirPath);
    return files;
  }

  /**
   * Clean directory
   * @param {string} dirPath - Directory path
   * @param {RegExp} keepPattern - Pattern for files to keep
   */
  static async cleanDirectory(dirPath, keepPattern = null) {
    if (!await this.exists(dirPath)) {
      return true;
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isFile() && (!keepPattern || !keepPattern.test(entry.name))) {
          await fs.unlink(fullPath);
        } else if (entry.isDirectory()) {
          await this.cleanDirectory(fullPath);
          await fs.rmdir(fullPath);
        }
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to clean ${dirPath}:`, error.message);
      return false;
    }
  }
}

/**
 * String utilities
 */
export class StringUtils {
  /**
   * Capitalize first letter
   * @param {string} str - String to capitalize
   * @returns {string} Capitalized string
   */
  static capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Convert to camelCase
   * @param {string} str - String to convert
   * @returns {string} Camel case string
   */
  static toCamelCase(str) {
    return str
      .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '')
      .replace(/^[A-Z]/, c => c.toLowerCase());
  }

  /**
   * Convert to kebab-case
   * @param {string} str - String to convert
   * @returns {string} Kebab case string
   */
  static toKebabCase(str) {
    return str
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase()
      .replace(/[\s_]+/g, '-');
  }

  /**
   * Pad string to specific width
   * @param {string} str - String to pad
   * @param {number} width - Target width
   * @param {string} padChar - Padding character
   * @returns {string} Padded string
   */
  static pad(str, width, padChar = ' ') {
    if (str.length >= width) return str;
    return str + padChar.repeat(width - str.length);
  }

  /**
   * Wrap text at specific column
   * @param {string} text - Text to wrap
   * @param {number} width - Maximum width
   * @param {string} indent - Indentation for wrapped lines
   * @returns {string} Wrapped text
   */
  static wrap(text, width = 80, indent = '    ') {
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = '';

    words.forEach(word => {
      if ((currentLine + word).length <= width) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    });

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.join('\n' + indent);
  }
}

/**
 * Object utilities
 */
export class ObjectUtils {
  /**
   * Deep merge objects
   * @param {Object} target - Target object
   * @param {...Object} sources - Source objects
   * @returns {Object} Merged object
   */
  static deepMerge(target, ...sources) {
    if (!sources.length) return target;

    const source = sources.shift();

    if (this.isObject(target) && this.isObject(source)) {
      for (const key in source) {
        if (this.isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          this.deepMerge(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return this.deepMerge(target, ...sources);
  }

  /**
   * Check if value is object
   * @param {*} item - Item to check
   * @returns {boolean} True if object
   */
  static isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * Get nested property safely
   * @param {Object} obj - Object to search
   * @param {string} path - Property path
   * @param {*} defaultValue - Default value
   * @returns {*} Property value or default
   */
  static get(obj, path, defaultValue = null) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : defaultValue;
    }, obj);
  }

  /**
   * Set nested property
   * @param {Object} obj - Target object
   * @param {string} path - Property path
   * @param {*} value - Value to set
   */
  static set(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    
    const target = keys.reduce((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key];
    }, obj);
    
    target[lastKey] = value;
  }
}

/**
 * Validation utilities
 */
export class ValidationUtils {
  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid
   */
  static isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate repository format (owner/repo)
   * @param {string} repo - Repository string
   * @returns {boolean} True if valid
   */
  static isValidRepo(repo) {
    const repoRegex = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
    return repoRegex.test(repo);
  }

  /**
   * Parse repository string
   * @param {string} repo - Repository string
   * @returns {Object|null} Parsed repository
   */
  static parseRepo(repo) {
    if (!this.isValidRepo(repo)) {
      return null;
    }

    const [owner, name] = repo.split('/');
    return { owner, name };
  }
}