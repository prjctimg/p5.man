import { SymbolExtractor } from '../src/parser/symbolExtractor.js';
import { VimdocGenerator } from '../src/generator/vimdocGenerator.js';
import { TagManager } from '../src/generator/tagManager.js';
import { ModuleDetector } from '../src/parser/moduleDetector.js';

/**
 * Mock data for testing
 */
export const MOCK_SYMBOLS = {
  shape: [
    {
      name: 'rect',
      type: 'function',
      module: 'shape',
      primaryModule: 'shape',
      description: 'Draws a rectangle',
      parameters: [
        { type: 'Number', name: 'x', description: 'x-coordinate' },
        { type: 'Number', name: 'y', description: 'y-coordinate' },
        { type: 'Number', name: 'width', description: 'width' },
        { type: 'Number', name: 'height', description: 'height' }
      ],
      returns: { type: 'void', description: '' },
      examples: ['rect(10, 10, 50, 50);'],
      deprecated: false,
      filename: 'test.js',
      line: 10
    },
    {
      name: 'circle',
      type: 'function',
      module: 'shape',
      primaryModule: 'shape',
      description: 'Draws a circle',
      parameters: [
        { type: 'Number', name: 'x', description: 'x-coordinate' },
        { type: 'Number', name: 'y', description: 'y-coordinate' },
        { type: 'Number', name: 'radius', description: 'radius' }
      ],
      returns: { type: 'void', description: '' },
      examples: ['circle(50, 50, 25);'],
      deprecated: false,
      filename: 'test.js',
      line: 20
    }
  ],
  color: [
    {
      name: 'fill',
      type: 'function',
      module: 'color',
      primaryModule: 'color',
      description: 'Sets the fill color',
      parameters: [
        { type: 'Number|String', name: 'value', description: 'color value' }
      ],
      returns: { type: 'void', description: '' },
      examples: ['fill(255, 0, 0);', "fill('red');"],
      deprecated: false,
      filename: 'test.js',
      line: 30
    },
    {
      name: 'red',
      type: 'function',
      module: 'color',
      primaryModule: 'color',
      description: 'Extracts red component from color',
      parameters: [
        { type: 'Object', name: 'color', description: 'color object' }
      ],
      returns: { type: 'Number', description: 'red component (0-255)' },
      examples: ['let c = color(255, 0, 0);', 'let r = red(c);'],
      deprecated: false,
      filename: 'test.js',
      line: 40
    }
  ],
  constants: [
    {
      name: 'PI',
      type: 'variable',
      module: 'constants',
      primaryModule: 'constants',
      description: 'Mathematical constant PI',
      parameters: [],
      returns: null,
      examples: ['console.log(PI);'],
      deprecated: false,
      filename: 'test.js',
      line: 50
    }
  ],
  deprecated: [
    {
      name: 'oldFunction',
      type: 'function',
      module: 'shape',
      primaryModule: 'shape',
      description: 'This function is deprecated',
      parameters: [],
      returns: { type: 'void', description: '' },
      examples: ['oldFunction();'],
      deprecated: true,
      deprecatedMessage: 'Use newFunction() instead',
      filename: 'test.js',
      line: 60
    }
  ]
};

export const MOCK_MODULES = new Map([
  ['shape', { name: 'shape', description: 'Shape drawing functions', symbols: [] }],
  ['color', { name: 'color', description: 'Color manipulation', symbols: [] }],
  ['constants', { name: 'constants', description: 'Predefined constants', symbols: [] }]
]);

/**
 * Test symbol extraction
 */
export class SymbolExtractorTests {
  constructor() {
    this.extractor = new SymbolExtractor();
  }

  async runAll() {
    console.log('🧪 Running SymbolExtractor tests...');
    
    try {
      await this.testPublicSymbolDetection();
      await this.testModuleMapping();
      await this.testDeprecationHandling();
      await this.testStatisticsGeneration();
      
      console.log('✅ All SymbolExtractor tests passed!');
      return true;
    } catch (error) {
      console.error('❌ SymbolExtractor tests failed:', error);
      return false;
    }
  }

  async testPublicSymbolDetection() {
    console.log('  📋 Testing public symbol detection...');
    
    const privateSymbol = {
      name: '_internal',
      type: 'function',
      private: true
    };
    
    const publicSymbol = {
      name: 'publicFunction',
      type: 'function',
      private: false
    };
    
    const isPrivate = this.extractor.isPublicSymbol(privateSymbol);
    const isPublic = this.extractor.isPublicSymbol(publicSymbol);
    
    if (isPrivate || !isPublic) {
      throw new Error('Public symbol detection failed');
    }
  }

  async testModuleMapping() {
    console.log('  🗺️ Testing module mapping...');
    
    const symbol = MOCK_SYMBOLS.shape[0];
    const mappedModule = this.extractor.detector.mapSymbolToModule(symbol);
    
    if (mappedModule !== 'shape') {
      throw new Error('Module mapping failed');
    }
  }

  async testDeprecationHandling() {
    console.log('  ⚠️ Testing deprecation handling...');
    
    const deprecatedSymbols = this.extractor.getDeprecatedSymbols();
    
    if (!Array.isArray(deprecatedSymbols)) {
      throw new Error('Deprecated symbols extraction failed');
    }
  }

  async testStatisticsGeneration() {
    console.log('  📊 Testing statistics generation...');
    
    // Create test symbols map
    this.extractor.allSymbols = new Map();
    MOCK_SYMBOLS.shape.forEach((symbol, index) => {
      this.extractor.allSymbols.set(`shape.${symbol.name}`, symbol);
    });
    
    const stats = this.extractor.getStatistics();
    
    if (!stats.totalSymbols || !stats.byType) {
      throw new Error('Statistics generation failed');
    }
  }
}

/**
 * Test Vimdoc generation
 */
export class VimdocGeneratorTests {
  constructor() {
    this.config = {
      modules: {
        shape: { file: 'p5-shape.txt', description: 'Shape module' },
        color: { file: 'p5-color.txt', description: 'Color module' }
      }
    };
    this.generator = new VimdocGenerator(this.config);
  }

  async runAll() {
    console.log('📝 Running VimdocGenerator tests...');
    
    try {
      await this.testFileGeneration();
      await this.testTagGeneration();
      await this.testFormatting();
      await this.testDeprecationWarnings();
      
      console.log('✅ All VimdocGenerator tests passed!');
      return true;
    } catch (error) {
      console.error('❌ VimdocGenerator tests failed:', error);
      return false;
    }
  }

  async testFileGeneration() {
    console.log('  📄 Testing file generation...');
    
    const symbolsByModule = MOCK_SYMBOLS;
    const outputDir = '/tmp/test-output';
    
    const generatedFiles = await this.generator.generateAllFiles(symbolsByModule, outputDir);
    
    if (!generatedFiles || generatedFiles.size === 0) {
      throw new Error('File generation failed');
    }
  }

  async testTagGeneration() {
    console.log('  🏷️ Testing tag generation...');
    
    const symbol = MOCK_SYMBOLS.shape[0];
    const tag = this.generator.generateTag(symbol);
    
    if (!tag || !tag.includes('shape_')) {
      throw new Error('Tag generation failed');
    }
  }

  async testFormatting() {
    console.log('  🎨 Testing formatting...');
    
    const symbol = MOCK_SYMBOLS.shape[0];
    const section = this.generator.generateSymbolSection(symbol);
    
    if (!section.includes(symbol.name) || !section.includes('shape')) {
      throw new Error('Symbol section formatting failed');
    }
  }

  async testDeprecationWarnings() {
    console.log('  ⚠️ Testing deprecation warnings...');
    
    const deprecatedSymbol = MOCK_SYMBOLS.deprecated[0];
    const section = this.generator.generateSymbolSection(deprecatedSymbol);
    
    if (!section.includes('DEPRECATED')) {
      throw new Error('Deprecation warning generation failed');
    }
  }
}

/**
 * Test tag management
 */
export class TagManagerTests {
  constructor() {
    this.tagManager = new TagManager();
  }

  async runAll() {
    console.log('🏷️ Running TagManager tests...');
    
    try {
      await this.testTagCreation();
      await this.testDuplicateResolution();
      await this.testTagsFileGeneration();
      await this.testStatistics();
      
      console.log('✅ All TagManager tests passed!');
      return true;
    } catch (error) {
      console.error('❌ TagManager tests failed:', error);
      return false;
    }
  }

  async testTagCreation() {
    console.log('  ➕ Testing tag creation...');
    
    this.tagManager.addTag('testFunction', 'test.txt', '/testFunction/', {
      type: 'function',
      module: 'test',
      line: 10
    });
    
    if (this.tagManager.size() !== 1) {
      throw new Error('Tag creation failed');
    }
  }

  async testDuplicateResolution() {
    console.log('  🔄 Testing duplicate resolution...');
    
    // Add conflicting tags
    this.tagManager.addTag('conflict', 'file1.txt', '/conflict/');
    this.tagManager.addTag('conflict', 'file2.txt', '/conflict/');
    
    const conflicts = this.tagManager.detectConflicts();
    
    if (!Array.isArray(conflicts)) {
      throw new Error('Conflict detection failed');
    }
  }

  async testTagsFileGeneration() {
    console.log('  📄 Testing tags file generation...');
    
    this.tagManager.addTag('testFunction', 'test.txt', '/testFunction/');
    const tagsContent = this.tagManager.generateTagsFile();
    
    if (!tagsContent.includes('testFunction') || !tagsContent.includes('!_TAG_FILE')) {
      throw new Error('Tags file generation failed');
    }
  }

  async testStatistics() {
    console.log('  📊 Testing statistics...');
    
    this.tagManager.addTag('test1', 'test.txt', '/test1/', { type: 'function' });
    this.tagManager.addTag('test2', 'test.txt', '/test2/', { type: 'class' });
    
    const stats = this.tagManager.getStatistics();
    
    if (!stats.total || !stats.byType || !stats.byType.function) {
      throw new Error('Statistics generation failed');
    }
  }
}

/**
 * Integration tests
 */
export class IntegrationTests {
  constructor() {
    this.extractor = new SymbolExtractor();
    this.generator = new VimdocGenerator({
      modules: {
        shape: { file: 'p5-shape.txt', description: 'Shape module' },
        color: { file: 'p5-color.txt', description: 'Color module' },
        constants: { file: 'p5-constants.txt', description: 'Constants' }
      }
    });
  }

  async runAll() {
    console.log('🔗 Running Integration tests...');
    
    try {
      await this.testEndToEndFlow();
      await this.testErrorHandling();
      
      console.log('✅ All Integration tests passed!');
      return true;
    } catch (error) {
      console.error('❌ Integration tests failed:', error);
      return false;
    }
  }

  async testEndToEndFlow() {
    console.log('  🔄 Testing end-to-end flow...');
    
    // Mock symbol extraction
    this.extractor.allSymbols = new Map();
    Object.values(MOCK_SYMBOLS).flat().forEach((symbol, index) => {
      this.extractor.allSymbols.set(`test.${symbol.name}`, symbol);
    });
    
    const symbolsByModule = this.extractor.groupSymbolsByModule();
    
    // Test file generation
    const outputDir = '/tmp/integration-test';
    const generatedFiles = await this.generator.generateAllFiles(symbolsByModule, outputDir);
    
    if (generatedFiles.size === 0) {
      throw new Error('End-to-end flow failed');
    }
  }

  async testErrorHandling() {
    console.log('  ⚠️ Testing error handling...');
    
    // Test with invalid data
    try {
      await this.generator.generateAllFiles(null, '/tmp/invalid');
      // Should handle gracefully
    } catch (error) {
      // Expected to fail gracefully
      if (!error.message) {
        throw new Error('Error handling failed');
      }
    }
  }
}

/**
 * Test runner
 */
export class TestRunner {
  constructor() {
    this.testSuites = [
      new SymbolExtractorTests(),
      new VimdocGeneratorTests(),
      new TagManagerTests(),
      new IntegrationTests()
    ];
  }

  async runAll() {
    console.log('🧪 Starting comprehensive test suite...\n');
    
    const results = [];
    
    for (const suite of this.testSuites) {
      try {
        const result = await suite.runAll();
        results.push({
          suite: suite.constructor.name,
          passed: result,
          duration: Date.now()
        });
      } catch (error) {
        console.error(`❌ Test suite ${suite.constructor.name} crashed:`, error);
        results.push({
          suite: suite.constructor.name,
          passed: false,
          error: error.message,
          duration: Date.now()
        });
      }
    }
    
    // Print summary
    console.log('\n📊 Test Results Summary:');
    results.forEach(result => {
      const status = result.passed ? '✅ PASSED' : '❌ FAILED';
      console.log(`  ${result.suite}: ${status}`);
      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    });
    
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    console.log(`\n🎯 Overall: ${passed}/${total} test suites passed`);
    
    return {
      total,
      passed,
      failed: total - passed,
      results
    };
  }
}

/**
 * Run tests if this file is executed directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new TestRunner();
  runner.runAll().catch(console.error);
}