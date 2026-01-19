#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const P5ManGenerator = require('../generate.js');

class DocumentationTester {
  constructor() {
    this.testResults = [];
    this.generator = new P5ManGenerator();
  }

  runTest(testName, testFunction) {
    console.log(`\n🧪 Running test: ${testName}`);
    try {
      const result = testFunction();
      if (result === true || result === undefined) {
        console.log(`✅ ${testName} - PASSED`);
        this.testResults.push({ name: testName, status: 'PASSED', error: null });
      } else {
        console.log(`❌ ${testName} - FAILED: ${result}`);
        this.testResults.push({ name: testName, status: 'FAILED', error: result });
      }
    } catch (error) {
      console.log(`❌ ${testName} - ERROR: ${error.message}`);
      this.testResults.push({ name: testName, status: 'ERROR', error: error.message });
    }
  }

  // Test 1: JSDoc parser properly filters tags from descriptions
  testJSDocParserFiltering() {
    // Create mock JSDoc content
    const mockJSDoc = `/**
 * This is the function description
 * @param {Number} x The x coordinate
 * @param {Number} y The y coordinate  
 * @return {Boolean} True if successful
 * @example
 * function test() {
 *   return true;
 * }
 */`;

    // Write temporary file
    const tempFile = path.join(__dirname, 'temp_test.js');
    fs.writeFileSync(tempFile, mockJSDoc);

    // Parse the file
    this.generator.modules = { 'Test': { file: 'test.txt', functions: [] } };
    
    // Simulate parsing
    const lines = mockJSDoc.split('\n');
    let currentComment = null;
    let inDocComment = false;
    let inExample = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line === '/**') {
        inDocComment = true;
        currentComment = {
          description: '',
          method: 'testFunction',
          params: [],
          returns: '',
          example: '',
          module: 'Test',
          file: tempFile
        };
        continue;
      }
      
      if (inDocComment && line === '*/') {
        inDocComment = false;
        break;
      }
      
      if (inDocComment && line.startsWith('*')) {
        const content = line.substring(1).trim();
        
        if (content.startsWith('@param ')) {
          const paramMatch = content.match(/@param \{([^}]+)\}\s+(\w+)\s+(.*)/);
          if (paramMatch) {
            currentComment.params.push({
              type: paramMatch[1],
              name: paramMatch[2],
              description: paramMatch[3]
            });
          }
          inExample = false;
        } else if (content.startsWith('@return ')) {
          const returnMatch = content.match(/@return \{([^}]+)\}\s+(.*)/);
          if (returnMatch) {
            currentComment.returns = `${returnMatch[1]} - ${returnMatch[2]}`;
          }
          inExample = false;
        } else if (content.startsWith('@example')) {
          inExample = true;
          currentComment.example = '';
        } else if (content.startsWith('@')) {
          inExample = false;
        } else if (inExample) {
          if (content.startsWith(' ')) {
            currentComment.example += content.substring(1) + '\n';
          } else {
            currentComment.example += content + '\n';
          }
        } else {
          currentComment.description += content + ' ';
        }
      }
    }

    // Clean up
    fs.unlinkSync(tempFile);

    // Verify results
    const description = currentComment.description.trim();
    const hasParamTags = description.includes('@param');
    const hasReturnTags = description.includes('@return');
    const hasExampleTags = description.includes('@example');

    if (hasParamTags || hasReturnTags || hasExampleTags) {
      return `Description contains JSDoc tags: ${description}`;
    }

    if (currentComment.params.length !== 2) {
      return `Expected 2 parameters, got ${currentComment.params.length}`;
    }

    if (!currentComment.returns) {
      return 'Return value not parsed correctly';
    }

    if (!currentComment.example) {
      return 'Example not parsed correctly';
    }

    return true;
  }

  // Test 2: Example content separation
  testExampleSeparation() {
    const mockFunction = {
      method: 'testFunction',
      description: 'This is a clean description without tags',
      params: [],
      returns: 'Boolean - True if successful',
      example: 'function test() {\n  return true;\n}'
    };

    const helpContent = this.generator.generateFunctionHelp(mockFunction, 'Test');
    
    // Check that example has its own section
    const hasExampleSection = helpContent.includes('💡 Example:');
    const hasExampleTag = helpContent.includes('*p5.testFunction()-example*');
    const hasCodeBlock = helpContent.includes('>\n');

    if (!hasExampleSection) {
      return 'Example section not found';
    }

    if (!hasExampleTag) {
      return 'Example tag not found';
    }

    if (!hasCodeBlock) {
      return 'Example code block not formatted correctly';
    }

    // Check that example doesn't appear in description
    const descriptionLines = helpContent.split('\n').slice(0, 10);
    const descriptionText = descriptionLines.join(' ');
    const exampleInDescription = descriptionText.includes('function test()');

    if (exampleInDescription) {
      return 'Example content found in description section';
    }

    return true;
  }

  // Test 3: Line number tracking
  testLineNumberTracking() {
    // Create mock module data
    const mockModuleData = {
      file: 'test.txt',
      functions: [
        { method: 'function1', lineNumber: 10 },
        { method: 'function2', lineNumber: 25 }
      ]
    };

    // Create mock content with function headers
    const mockContent = `Test Module Content

🔧 function1()                                                *tag*
─────────────────
📝 Description

🔧 function2()                                                *tag*
─────────────────  
📝 Description`;

    const tempFile = path.join(__dirname, 'test_line_numbers.txt');
    fs.writeFileSync(tempFile, mockContent);

    // Test line number extraction
    this.generator.updateFunctionLineNumbers(tempFile, mockModuleData);

    const lineNumbers = mockModuleData.functionLineNumbers;
    
    // Clean up
    fs.unlinkSync(tempFile);

    if (!lineNumbers || lineNumbers.size === 0) {
      return 'No line numbers extracted';
    }

    if (!lineNumbers.has('function1') || !lineNumbers.has('function2')) {
      return 'Not all functions found in line number map';
    }

    const line1 = lineNumbers.get('function1');
    const line2 = lineNumbers.get('function2');

    if (line1 >= line2) {
      return `Line numbers incorrect: function1 at ${line1}, function2 at ${line2}`;
    }

    return true;
  }

  // Test 4: HTML to Markdown conversion
  testHtmlToMarkdownConversion() {
    const testHtml = 'This is <strong>bold</strong> and <em>italic</em> text with <code>code</code>';
    const expectedMarkdown = 'This is **bold** and *italic* text with `code`';
    
    const result = this.generator.convertHtmlToMarkdown(testHtml);
    
    if (result !== expectedMarkdown) {
      return `Expected "${expectedMarkdown}", got "${result}"`;
    }

    return true;
  }

  // Test 5: Module guessing logic
  testModuleGuessing() {
    const testCases = [
      { path: '/src/shape/primitive.js', expected: 'Shape' },
      { path: '/src/color/color_conversion.js', expected: 'Color' },
      { path: '/src/typography/text.js', expected: 'Typography' },
      { path: '/src/webgl/camera.js', expected: '3D' },
      { path: '/src/math/vector.js', expected: 'Math' },
      { path: '/src/events/mouse.js', expected: 'Events' }
    ];

    for (const testCase of testCases) {
      const result = this.generator.guessModule(testCase.path);
      if (result !== testCase.expected) {
        return `Path "${testCase.path}" expected module "${testCase.expected}", got "${result}"`;
      }
    }

    return true;
  }

  // Test 6: Tag qualification logic
  testTagQualification() {
    const conflictingFunctions = ['clear', 'print', 'save', 'load', 'get', 'set'];
    const nonConflictingFunctions = ['ellipse', 'rect', 'line', 'fill'];

    for (const func of conflictingFunctions) {
      if (!this.generator.shouldQualifyTag(func)) {
        return `Function "${func}" should be qualified but isn't`;
      }
    }

    for (const func of nonConflictingFunctions) {
      if (this.generator.shouldQualifyTag(func)) {
        return `Function "${func}" should not be qualified but is`;
      }
    }

    return true;
  }

  // Test 7: Duplicate function removal
  testDuplicateFunctionRemoval() {
    const mockFunctions = [
      { method: 'test()', description: 'First' },
      { method: 'test()', description: 'Duplicate' },
      { method: 'other()', description: 'Other' },
      { method: 'test', description: 'Without parentheses' },
      { method: 'other()', description: 'Another duplicate' }
    ];

    const uniqueFunctions = this.generator.removeDuplicateFunctions(mockFunctions);
    
    if (uniqueFunctions.length !== 2) {
      return `Expected 2 unique functions, got ${uniqueFunctions.length}`;
    }

    const methods = uniqueFunctions.map(f => f.method.replace(/\(\)$/, ''));
    if (!methods.includes('test') || !methods.includes('other')) {
      return 'Expected functions not found after deduplication';
    }

    return true;
  }

  // Test 8: Neovim help file format validation
  testNeovimHelpFormat() {
    const mockModule = {
      'Test': {
        file: 'p5-test.txt',
        description: 'Test module for validation',
        functions: [
          {
            method: 'testFunction',
            description: 'A test function description',
            params: [{ type: 'Number', name: 'x', description: 'X coordinate' }],
            returns: 'Boolean - Result',
            example: 'testFunction(10);'
          }
        ]
      }
    };

    this.generator.modules = mockModule;
    const content = this.generator.generateModuleHelp('Test', mockModule['Test'], '1.0.0');

    // Check for required neovim help file format elements
    const hasHeader = content.includes('*p5.test*\t');
    const hasHelpTopic = content.includes('*help-topic*');
    const hasFunctionTag = content.includes('*p5.testFunction()*');
    const hasTableOfContents = content.includes('*p5.test-contents*');
    const hasSeparator = content.includes('==============================================================================');

    if (!hasHeader) {
      return 'Missing neovim help file header';
    }

    if (!hasHelpTopic) {
      return 'Missing help-topic declaration';
    }

    if (!hasFunctionTag) {
      return 'Missing function tag for navigation';
    }

    if (!hasTableOfContents) {
      return 'Missing table of contents tag';
    }

    if (!hasSeparator) {
      return 'Missing separator line';
    }

    // Validate emoji formatting (should be properly spaced)
    const emojiSections = content.match(/[🔧📝📋↩️💡🔗]/g);
    if (!emojiSections || emojiSections.length < 5) {
      return 'Insufficient emoji formatting in help file';
    }

    return true;
  }

  async runAllTests() {
    console.log('🚀 Starting p5.man Documentation Tests\n');

    // Run all tests
    this.runTest('JSDoc Parser Tag Filtering', () => this.testJSDocParserFiltering());
    this.runTest('Example Content Separation', () => this.testExampleSeparation());
    this.runTest('Line Number Tracking', () => this.testLineNumberTracking());
    this.runTest('HTML to Markdown Conversion', () => this.testHtmlToMarkdownConversion());
    this.runTest('Module Guessing Logic', () => this.testModuleGuessing());
    this.runTest('Tag Qualification Logic', () => this.testTagQualification());
    this.runTest('Duplicate Function Removal', () => this.testDuplicateFunctionRemoval());
    this.runTest('Neovim Help Format Validation', () => this.testNeovimHelpFormat());

    // Print summary
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const errors = this.testResults.filter(r => r.status === 'ERROR').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`💥 Errors: ${errors}`);
    console.log(`📈 Total: ${this.testResults.length}`);

    if (failed > 0 || errors > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'FAILED' || r.status === 'ERROR')
        .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed!');
      process.exit(0);
    }
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const tester = new DocumentationTester();
  tester.runAllTests().catch(console.error);
}

module.exports = DocumentationTester;