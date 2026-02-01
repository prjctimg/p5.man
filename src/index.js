import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { SymbolExtractor } from './parser/symbolExtractor.js';
import { VimdocGenerator } from './generator/vimdocGenerator.js';
import { ZigdocGenerator } from './generator/zigdocGenerator.js';
import { TagManager } from './generator/tagManager.js';
import { GitHubAPIClient } from './github/apiClient.js';
import { ReleaseMonitor } from './github/releaseMonitor.js';
import { RepoOperations } from './github/repoOperations.js';
import { logger, errorHandler, PerformanceMonitor } from './utils/logger.js';
import { FileUtils, ValidationUtils } from './utils/helpers.js';

// Load environment variables
dotenv.config();

/**
 * Main application class for multi-language p5.js Documentation Automation
 */
class P5DocumentationAutomation {
  constructor() {
    this.config = this.loadConfig();
    this.logger = logger;
    this.errorHandler = errorHandler;
    this.perfMonitor = new PerformanceMonitor();
    this.tagManager = new TagManager();
    this.currentLanguage = process.env.TARGET_LANGUAGE || this.config.defaultLanguage || 'javascript';
  }

  /**
   * Load configuration from config.json and environment
   * @returns {Object} Configuration object
   */
  loadConfig() {
    try {
      const configPath = path.join(process.cwd(), 'config.json');
      const configData = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configData);
      
      // Override with environment variables
      return {
        ...config,
        p5Repo: process.env.P5_REPO || config.p5Repo,
        p5nvimRepo: process.env.P5_NVIM_REPO || config.p5nvimRepo,
        targetBranch: process.env.TARGET_BRANCH || config.targetBranch,
        outputDir: process.env.OUTPUT_DIR || config.outputDir,
        githubToken: process.env.GITHUB_TOKEN,
        p5nvimToken: process.env.P5_NVIM_TOKEN,
        debug: process.env.DEBUG === 'true'
      };
    } catch (error) {
      this.logger.error('Failed to load configuration', error);
      process.exit(1);
    }
  }

  /**
   * Validate configuration
   * @returns {boolean} True if configuration is valid
   */
  validateConfig() {
    const { githubToken, p5nvimToken, p5Repo, p5nvimRepo } = this.config;
    
    if (!githubToken) {
      this.logger.error('GITHUB_TOKEN environment variable is required');
      return false;
    }
    
    if (!p5nvimToken) {
      this.logger.error('P5_NVIM_TOKEN environment variable is required');
      return false;
    }
    
    if (!ValidationUtils.isValidRepo(p5Repo)) {
      this.logger.error('Invalid p5.js repository format');
      return false;
    }
    
    if (!ValidationUtils.isValidRepo(p5nvimRepo)) {
      this.logger.error('Invalid p5.nvim repository format');
      return false;
    }
    
    return true;
  }

  /**
   * Clone p5.js repository
   * @param {string} targetDir - Target directory
   * @returns {Promise<string>} Repository path
   */
  async cloneP5Repository(targetDir) {
    this.logger.operationStart('Cloning p5.js repository');
    
    try {
      await FileUtils.ensureDir(targetDir);
      
      // Use simple-git to clone
      const { default: git } = await import('simple-git');
      
      await git().clone(this.config.p5Repo, targetDir);
      
      this.logger.operationComplete('Cloning p5.js repository');
      return path.join(targetDir, this.config.p5Repo.split('/')[1]);
    } catch (error) {
      this.logger.operationFail('Cloning p5.js repository', error);
      throw error;
    }
  }

  /**
   * Extract symbols from p5.js source
   * @param {string} sourceDir - p5.js source directory
   * @returns {Promise<Object>} Extracted symbols
   */
  async extractSymbols(sourceDir) {
    this.logger.operationStart('Extracting symbols');
    this.perfMonitor.start('symbolExtraction');
    
    try {
      const extractor = new SymbolExtractor();
      const result = await extractor.extractAll(sourceDir);
      
      this.perfMonitor.end('symbolExtraction');
      
      const stats = {
        totalSymbols: result.symbols.size,
        totalModules: result.modules.size,
        deprecated: extractor.getDeprecatedSymbols().length
      };
      
      this.logger.operationComplete('Extracting symbols', { stats });
      
      return result;
    } catch (error) {
      this.logger.operationFail('Extracting symbols', error);
      throw error;
    }
  }

  /**
   * Generate documentation files
   * @param {Object} symbolsData - Symbols and modules data
   * @param {string} outputDir - Output directory
   * @returns {Promise<Map>} Generated files
   */
  async generateDocumentation(symbolsData, outputDir) {
    this.logger.operationStart(`Generating ${this.currentLanguage} documentation`);
    this.perfMonitor.start('documentationGeneration');
    
    try {
      let generator;
      
      // Select generator based on language
      if (this.currentLanguage === 'zig') {
        generator = new ZigdocGenerator(this.config);
      } else {
        generator = new VimdocGenerator(this.config);
      }
      
      // Resolve conflicts in tags
      this.tagManager.addModuleTags(symbolsData.symbolsByModule);
      this.tagManager.resolveConflicts();
      
      const generatedFiles = await generator.generateAllFiles(
        symbolsData.symbolsByModule, 
        outputDir
      );
      
      this.perfMonitor.end('documentationGeneration');
      
      this.logger.operationComplete(`Generating ${this.currentLanguage} documentation`, {
        files: generatedFiles.size,
        tags: this.tagManager.size(),
        language: this.currentLanguage
      });
      
      return generatedFiles;
    } catch (error) {
      this.logger.operationFail(`Generating ${this.currentLanguage} documentation`, error);
      throw error;
    }
  }

  /**
   * Commit documentation to p5.nvim repository
   * @param {Map} generatedFiles - Generated files
   * @param {string} version - p5.js version
   * @returns {Promise<Object>} Commit result
   */
  async commitToRepository(generatedFiles, version) {
    this.logger.operationStart('Committing to p5.nvim repository');
    
    try {
      const repoOps = new RepoOperations(
        this.config.p5nvimToken, 
        this.config.p5nvimRepo
      );
      
      const commitMessage = `Update p5.js documentation to version ${version}`;
      const result = await repoOps.commitDocumentation(
        generatedFiles, 
        commitMessage
      );
      
      this.logger.operationComplete('Committing to p5.nvim repository', {
        pullRequest: result.pullRequest?.html_url
      });
      
      return result;
    } catch (error) {
      this.logger.operationFail('Committing to p5.nvim repository', error);
      throw error;
    }
  }

  /**
   * Print operation summary
   * @param {Object} symbolsData - Symbols data
   * @param {Map} generatedFiles - Generated files
   * @param {number} duration - Total duration
   */
  printSummary(symbolsData, generatedFiles, duration) {
    const languageConfig = this.config.languages[this.currentLanguage];
    const languageEmoji = languageConfig ? languageConfig.emoji : '📄';
    
    console.log('\n📊 SUMMARY');
    console.log('=' .repeat(50));
    console.log(`${languageEmoji} Target Language: ${this.currentLanguage.toUpperCase()}`);
    console.log(`📦 Total modules: ${symbolsData.modules.size}`);
    console.log(`🔤 Total symbols: ${symbolsData.symbols.size}`);
    console.log(`📄 Generated files: ${generatedFiles.size}`);
    console.log(`🏷️  Generated tags: ${this.tagManager.size()}`);
    console.log(`⏱️  Total time: ${duration}ms`);
    console.log('=' .repeat(50));
    
    // Generated files list
    generatedFiles.forEach((filepath, module) => {
      const extension = path.extname(filepath);
      console.log(`  ${module}: ${filepath} (${extension})`);
    });
  }

  /**
   * Setup release monitoring
   */
  async setupMonitoring() {
    if (!this.config.githubToken) {
      this.logger.error('GitHub token required for monitoring');
      return;
    }
    
    const monitor = new ReleaseMonitor(
      this.config.githubToken,
      this.config.p5Repo
    );
    
    monitor.startMonitoring(async (release) => {
      this.logger.info(`New release detected: ${release.tag_name}`);
      await this.run();
    });
  }

  /**
   * Main automation workflow
   */
  async run() {
    const startTime = Date.now();
    
    try {
      this.logger.start('p5.js Multi-Language Documentation Automation');
      
      // Validate configuration
      if (!this.validateConfig()) {
        process.exit(1);
      }
      
      // Validate language selection
      if (!this.config.languages[this.currentLanguage]) {
        this.logger.error(`Unsupported language: ${this.currentLanguage}`);
        this.logger.error(`Supported languages: ${Object.keys(this.config.languages).join(', ')}`);
        process.exit(1);
      }
      
      // Clone p5.js repository
      const tempDir = path.join(process.cwd(), 'temp');
      const p5SourceDir = await this.cloneP5Repository(tempDir);
      
      // Extract symbols
      const symbolsData = await this.extractSymbols(p5SourceDir);
      
      // Generate documentation
      const outputDir = path.join(process.cwd(), this.config.outputDir);
      const generatedFiles = await this.generateDocumentation(symbolsData, outputDir);
      
      // Get version from package.json
      const packagePath = path.join(p5SourceDir, 'package.json');
      const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      const version = packageData.version;
      
      // Commit to repository (only for Vim output)
      if (this.config.p5nvimToken && this.currentLanguage === 'javascript') {
        await this.commitToRepository(generatedFiles, version);
      }
      
      const duration = Date.now() - startTime;
      this.logger.complete(`${this.currentLanguage} documentation automation completed successfully in ${duration}ms`);
      
      // Print summary
      this.printSummary(symbolsData, generatedFiles, duration);
      
    } catch (error) {
      this.logger.error('Documentation automation failed', error);
      process.exit(1);
    } finally {
      // Cleanup temporary directory
      try {
        const tempDir = path.join(process.cwd(), 'temp');
        if (await FileUtils.exists(tempDir)) {
          await FileUtils.cleanDirectory(tempDir);
        }
      } catch (cleanupError) {
        this.logger.warn('Failed to cleanup temporary directory:', cleanupError.message);
      }
    }
  }
}

/**
 * CLI entry point
 */
async function main() {
  const automation = new P5DocumentationAutomation();
  
  // Check command line arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--monitor')) {
    await automation.setupMonitoring();
    return;
  }
  
  if (args.includes('--help')) {
    const supportedLanguages = Object.keys(automation.config.languages).join(', ');
    const defaultLanguage = automation.config.defaultLanguage || 'javascript';
    
    console.log(`
p5.js Multi-Language Documentation Automation

USAGE:
  node src/index.js [options]

OPTIONS:
  --monitor        Start release monitoring mode
  --help          Show this help message
  --force         Force regeneration regardless of releases
  --lang LANGUAGE  Target language (${supportedLanguages})

LANGUAGE SUPPORT:
  --lang javascript  Generate Vim documentation (default)
  --lang zig        Generate Zig documentation

ENVIRONMENT VARIABLES:
  GITHUB_TOKEN    GitHub API token (required)
  P5_NVIM_TOKEN  Token for p5.nvim repository (required for commits)
  DEBUG           Enable debug logging (optional)
  TARGET_LANGUAGE  Target language (optional, default: ${defaultLanguage})

EXAMPLES:
  node src/index.js                          # Generate Vim documentation
  node src/index.js --lang zig                # Generate Zig documentation
  node src/index.js --monitor                  # Start monitoring for new releases
  DEBUG=true node src/index.js                 # Run with debug logging
  TARGET_LANGUAGE=zig node src/index.js         # Set Zig language
`);
    return;
  }
  
  // Run main automation
  await automation.run();
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}