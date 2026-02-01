import fs from 'fs/promises';
import path from 'path';
import { JSDocParser } from './index.js';

/**
 * Handles detection and mapping of module declarations
 */
export class ModuleDetector {
  constructor() {
    this.parser = new JSDocParser();
    this.moduleMappings = new Map();
    this.submoduleMappings = new Map();
  }

  /**
   * Detect modules from a directory of JavaScript files
   * @param {string} directory - Directory path to scan
   * @returns {Promise<Map>} Map of detected modules
   */
  async detectModules(directory) {
    const modules = new Map();
    
    try {
      const files = await this.getJavaScriptFiles(directory);
      
      for (const file of files) {
        const content = await fs.readFile(file, 'utf8');
        const result = this.parser.parse(content, file);
        
        if (result.modules.size > 0) {
          result.modules.forEach((module, name) => {
            if (!modules.has(name)) {
              modules.set(name, module);
            }
          });
        }
      }
      
      // Create module mappings for symbol resolution
      this.createModuleMappings(modules);
      
      return modules;
    } catch (error) {
      console.error('Error detecting modules:', error);
      return new Map();
    }
  }

  /**
   * Get all JavaScript files from directory recursively
   * @param {string} directory - Directory to scan
   * @returns {Promise<string[]>} Array of file paths
   */
  async getJavaScriptFiles(directory) {
    const files = [];
    
    async function scan(dir) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          await scan(fullPath);
        } else if (entry.isFile() && /\.(js|jsx|ts|tsx)$/.test(entry.name)) {
          files.push(fullPath);
        }
      }
    }
    
    await scan(directory);
    return files;
  }

  /**
   * Create mappings for module resolution
   * @param {Map} modules - Map of detected modules
   */
  createModuleMappings(modules) {
    modules.forEach((module, name) => {
      this.moduleMappings.set(name.toLowerCase(), name);
      
      if (module.submodule) {
        this.submoduleMappings.set(
          `${name.toLowerCase()}.${module.submodule.toLowerCase()}`, 
          name
        );
      }
    });
  }

  /**
   * Resolve module name from various possible inputs
   * @param {string} moduleName - Module name to resolve
   * @returns {string|null} Resolved module name
   */
  resolveModule(moduleName) {
    const normalized = moduleName.toLowerCase();
    return this.moduleMappings.get(normalized) || null;
  }

  /**
   * Map symbol to its primary module
   * @param {Object} symbol - Symbol object
   * @returns {string|null} Primary module name
   */
  mapSymbolToModule(symbol) {
    // First check if symbol has explicit module
    if (symbol.module && this.moduleMappings.has(symbol.module.toLowerCase())) {
      return symbol.module;
    }
    
    // Check @for tag for class membership
    if (symbol.forClass) {
      const className = symbol.forClass.replace(/^p5\./, '');
      // Look for class definition in modules
      for (const [moduleName, moduleData] of this.moduleMappings) {
        const classSymbols = moduleData.symbols.filter(symKey => 
          symKey.includes(`.${className}`)
        );
        if (classSymbols.length > 0) {
          return moduleData.name;
        }
      }
    }
    
    // Fallback to symbol name heuristics
    return this.resolveModuleFromSymbolName(symbol.name);
  }

  /**
   * Resolve module from symbol name using heuristics
   * @param {string} symbolName - Symbol name
   * @returns {string|null} Likely module name
   */
  resolveModuleFromSymbolName(symbolName) {
    // Define patterns for common symbol groupings
    const modulePatterns = {
      shape: [
        'arc', 'circle', 'ellipse', 'line', 'point', 'quad', 'rect', 'square', 'triangle',
        'box', 'cone', 'cylinder', 'sphere', 'torus', 'plane', 'ellipsoid',
        'bezier', 'curve', 'beginShape', 'endShape', 'vertex',
        'ellipseMode', 'rectMode', 'strokeWeight', 'strokeCap', 'strokeJoin',
        'beginGeometry', 'endGeometry', 'buildGeometry'
      ],
      color: [
        'background', 'fill', 'noFill', 'stroke', 'noStroke',
        'color', 'colorMode', 'alpha', 'red', 'green', 'blue', 'hue', 'saturation',
        'brightness', 'lightness', 'lerpColor', 'blendMode'
      ],
      typography: [
        'text', 'textFont', 'textSize', 'textAlign', 'textLeading', 'textStyle',
        'textWidth', 'textAscent', 'textDescent', 'loadFont'
      ],
      image: [
        'image', 'imageMode', 'loadImage', 'createImage', 'saveCanvas',
        'get', 'set', 'pixels', 'loadPixels', 'updatePixels',
        'copy', 'blend', 'filter', 'tint', 'noTint'
      ],
      transform: [
        'push', 'pop', 'translate', 'rotate', 'scale', 'shearX', 'shearY',
        'applyMatrix', 'resetMatrix', 'rotateX', 'rotateY', 'rotateZ'
      ],
      environment: [
        'createCanvas', 'resizeCanvas', 'width', 'height', 'frameRate', 'frameCount',
        'deltaTime', 'mouseX', 'mouseY', 'pmouseX', 'pmouseY', 'mouseButton',
        'keyIsPressed', 'key', 'keyCode', 'cursor', 'noCursor',
        'fullscreen', 'windowWidth', 'windowHeight', 'displayWidth', 'displayHeight'
      ],
      '3d': [
        'camera', 'createCamera', 'perspective', 'ortho', 'frustum',
        'ambientLight', 'directionalLight', 'pointLight', 'spotLight',
        'lights', 'noLights', 'loadShader', 'createShader', 'shader',
        'normalMaterial', 'specularMaterial', 'metalness', 'shininess'
      ],
      rendering: [
        'createGraphics', 'drawingContext', 'setAttributes', 'pixelDensity',
        'clearDepth', 'blendMode', 'createFramebuffer'
      ],
      math: [
        'abs', 'ceil', 'floor', 'round', 'constrain', 'map', 'norm', 'lerp',
        'dist', 'mag', 'sqrt', 'pow', 'exp', 'log', 'sin', 'cos', 'tan',
        'asin', 'acos', 'atan', 'atan2', 'degrees', 'radians', 'angleMode',
        'noise', 'noiseDetail', 'noiseSeed', 'random', 'randomGaussian', 'randomSeed',
        'createVector'
      ],
      io: [
        'loadJSON', 'loadStrings', 'loadTable', 'loadXML', 'save', 'saveJSON',
        'saveStrings', 'saveTable', 'httpGet', 'httpPost', 'httpDo'
      ],
      events: [
        'setup', 'draw', 'preload', 'mousePressed', 'mouseReleased', 'mouseMoved',
        'mouseDragged', 'mouseClicked', 'doubleClicked', 'mouseWheel',
        'keyPressed', 'keyReleased', 'keyTyped', 'touchStarted', 'touchMoved', 'touchEnded',
        'deviceMoved', 'deviceTurned', 'deviceShaken'
      ],
      data: [
        'append', 'arrayCopy', 'concat', 'reverse', 'shorten', 'shuffle', 'sort',
        'splice', 'subset', 'join', 'match', 'matchAll', 'split', 'splitTokens', 'trim',
        'boolean', 'byte', 'char', 'float', 'hex', 'int', 'str', 'unchar', 'unhex',
        'createStringDict', 'createNumberDict', 'storeItem', 'getItem', 'removeItem', 'clearStorage'
      ],
      structure: [
        'loop', 'noLoop', 'isLooping', 'redraw', 'push', 'pop', 'remove'
      ],
      dom: [
        'createElement', 'createDiv', 'createP', 'createImg', 'createInput', 'createButton',
        'createSlider', 'createSelect', 'createRadio', 'createCheckbox', 'createVideo',
        'createAudio', 'createCapture', 'select', 'selectAll', 'removeElements'
      ],
      constants: [
        'PI', 'HALF_PI', 'QUARTER_PI', 'TAU', 'TWO_PI', 'DEGREES', 'RADIANS',
        'AUTO', 'LEFT', 'RIGHT', 'CENTER', 'TOP', 'BOTTOM', 'BASELINE',
        'P2D', 'WEBGL', 'HSB', 'RGB', 'ARGB'
      ]
    };
    
    const name = symbolName.toLowerCase();
    
    for (const [module, symbols] of Object.entries(modulePatterns)) {
      if (symbols.some(sym => sym.toLowerCase() === name)) {
        return module;
      }
    }
    
    return null;
  }

  /**
   * Get module information
   * @param {string} moduleName - Module name
   * @returns {Object|null} Module information
   */
  getModuleInfo(moduleName) {
    return this.moduleMappings.get(moduleName.toLowerCase()) || null;
  }

  /**
   * Get all detected modules
   * @returns {Map} All modules
   */
  getAllModules() {
    return this.moduleMappings;
  }
}