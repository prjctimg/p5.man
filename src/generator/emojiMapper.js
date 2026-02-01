/**
 * Emoji mapping for p5.js modules and symbol types
 */
export const EMOJI_MAP = {
  // Module emojis
  modules: {
    'shape': '📐',
    'color': '🎨',
    'typography': '📝',
    'image': '🖼️',
    'transform': '🔄',
    'environment': '🌍',
    '3d': '🎮',
    'rendering': '🖥️',
    'math': '🔢',
    'io': '📁',
    'events': '🎭',
    'data': '📊',
    'structure': '🏗️',
    'dom': '🌐',
    'constants': '📋'
  },

  // Symbol type emojis
  symbolTypes: {
    'function': '⚡',
    'class': '🏛️',
    'property': '🔧',
    'variable': '📌',
    'constant': '📌',
    'method': '⚡'
  },

  // Parameter type emojis
  parameterTypes: {
    'Number': '🔢',
    'String': '📝',
    'Boolean': '☑️',
    'Array': '📚',
    'Object': '📦',
    'Function': '⚡',
    'Element': '🌐',
    'Constant': '📋'
  },

  // Special purpose emojis
  special: {
    'deprecated': '⚠️',
    'experimental': '🧪',
    'important': '❗',
    'note': '📝',
    'example': '💡',
    'tip': '💡',
    'warning': '⚠️'
  }
};

/**
 * Get emoji for module name
 * @param {string} moduleName - Module name
 * @returns {string} Module emoji
 */
export function getModuleEmoji(moduleName) {
  return EMOJI_MAP.modules[moduleName] || '📄';
}

/**
 * Get emoji for symbol type
 * @param {string} symbolType - Symbol type
 * @returns {string} Symbol type emoji
 */
export function getSymbolTypeEmoji(symbolType) {
  return EMOJI_MAP.symbolTypes[symbolType] || '📌';
}

/**
 * Get emoji for parameter type
 * @param {string} paramType - Parameter type
 * @returns {string} Parameter type emoji
 */
export function getParameterTypeEmoji(paramType) {
  return EMOJI_MAP.parameterTypes[paramType] || '🔢';
}

/**
 * Get emoji for special purpose
 * @param {string} purpose - Special purpose
 * @returns {string} Special purpose emoji
 */
export function getSpecialEmoji(purpose) {
  return EMOJI_MAP.special[purpose] || '📝';
}

/**
 * Generate emoji prefix for symbol documentation
 * @param {Object} symbol - Symbol object
 * @returns {string} Emoji prefix string
 */
export function generateEmojiPrefix(symbol) {
  const moduleEmoji = getModuleEmoji(symbol.primaryModule || symbol.module);
  const typeEmoji = getSymbolTypeEmoji(symbol.type);
  const deprecatedEmoji = symbol.deprecated ? getSpecialEmoji('deprecated') : '';
  
  return `${moduleEmoji} ${typeEmoji} ${deprecatedEmoji}`.trim();
}

/**
 * Format parameter with emoji
 * @param {Object} param - Parameter object
 * @returns {string} Formatted parameter with emoji
 */
export function formatParameterWithEmoji(param) {
  const typeEmoji = getParameterTypeEmoji(param.type);
  const optional = param.optional ? '[optional]' : '';
  return `${typeEmoji} \`${param.name}\`${optional} (${param.type})`;
}

/**
 * Format return value with emoji
 * @param {Object} ret - Return object
 * @returns {string} Formatted return value with emoji
 */
export function formatReturnWithEmoji(ret) {
  if (!ret || ret.type === 'void') {
    return '';
  }
  
  const typeEmoji = getParameterTypeEmoji(ret.type);
  return `${typeEmoji} Returns ${ret.type}${ret.description ? ': ' + ret.description : ''}`;
}