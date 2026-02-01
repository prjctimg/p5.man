# p5.js Documentation Automation

Converts p5.js JSDoc comments to Neovim help pages with automatic deployment.

## Overview

This automation system:

🎯 **Extracts all public API symbols** from p5.js source code  
📝 **Generates Vim documentation** with proper formatting and emojis  
🏷️ **Creates deduplicated tags** for Vim help system  
🚀 **Commits to p5.nvim repository** via GitHub API  
👀 **Monitors p5.js releases** for automatic updates  

## Features

✅ **Comprehensive Symbol Coverage**
- All functions with `@method` tags
- All classes with `@class` tags  
- All properties with `@property` tags
- All variables and constants
- Complete parameter and return type information

✅ **Module-Based Organization**
- 15 separate documentation files (one per module)
- Structured by p5.js reference organization
- Proper Vim help tags with module prefixes

✅ **Smart Symbol Mapping**
- Automatic module detection from `@module` declarations
- Fallback heuristics for unmapped symbols
- `@for` tag support for class method associations

✅ **Enhanced Documentation**
- Thematic emoji mapping (📐 Shape, 🎨 Color, 🎭 Events, etc.)
- Deprecation warnings with clear alternatives
- Code examples and source references
- Proper Vim formatting and syntax

✅ **Automated Deployment**
- GitHub API integration for p5.nvim repository
- Pull request creation for review
- Branch management and cleanup
- Release-triggered automation

## Installation

```bash
# Clone the repository
git clone https://github.com/prjctimg/automata.git
cd automata

# Install dependencies
npm install

# Copy environment template
cp .env.template .env

# Edit .env with your tokens
nano .env
```

## Configuration

### Required Environment Variables

```bash
# GitHub token with repository access
GITHUB_TOKEN=your_github_token_here

# Token for p5.nvim repository (write access)
P5_NVIM_TOKEN=your_p5_nvim_token_here
```

### Optional Variables

```bash
# Target branch (default: main)
TARGET_BRANCH=main

# Enable debug logging
DEBUG=true

# Custom repositories
P5_REPO=processing/p5.js
P5_NVIM_REPO=prjctimg/p5.nvim
```

## Usage

### Generate Documentation

```bash
# Generate documentation from latest p5.js
npm start

# With debug logging
DEBUG=true npm start
```

### Monitor Releases

```bash
# Start monitoring for new p5.js releases
npm run monitor
```

### Manual Trigger

```bash
# Force regeneration (GitHub Actions)
gh workflow run p5.yml -f force=true
```

## Output Structure

Generated files follow this structure in `p5.nvim/doc/`:

```
📐 p5-shape.txt        - Shape functions (2D/3D primitives, curves)
🎨 p5-color.txt        - Color creation and manipulation  
📝 p5-typography.txt   - Text rendering and fonts
🖼️ p5-image.txt        - Image handling and pixels
🔄 p5-transform.txt     - Coordinate transformations
🌍 p5-environment.txt  - Canvas properties and environment
🎮 p5-3d.txt           - 3D graphics and WebGL
🖥️ p5-rendering.txt    - Canvas setup and rendering
🔢 p5-math.txt         - Math functions and vectors
📁 p5-io.txt           - Input/output operations
🎭 p5-events.txt        - Event handling system
📊 p5-data.txt          - Data structures and handling
🏗️ p5-structure.txt     - Program flow and structure
🌐 p5-dom.txt           - DOM manipulation
📋 p5-constants.txt     - Predefined constants
🏷️ tags                 - Vim help tags file
```

## Module Coverage

### Shape Module (📐)
- 2D Primitives: `rect()`, `circle()`, `ellipse()`, `line()`, etc.
- 3D Primitives: `box()`, `sphere()`, `cone()`, `cylinder()`, etc.
- Attributes: `rectMode()`, `ellipseMode()`, `strokeWeight()`, etc.
- Curves: `bezier()`, `curve()`, `bezierVertex()`, etc.
- Vertex: `beginShape()`, `endShape()`, `vertex()`, etc.

### Color Module (🎨)
- Creation: `color()`, `fill()`, `stroke()`
- Reading: `red()`, `green()`, `blue()`, `alpha()`, etc.
- Setting: `background()`, `colorMode()`, `noFill()`, etc.

[... and so on for all 15 modules]

## Symbol Filtering

**Included:**
- ✅ Public API symbols
- ✅ Functions with `@method` tags
- ✅ Classes with `@class` tags
- ✅ Properties with `@property` tags
- ✅ Global variables (mouseX, frameCount, etc.)
- ✅ Deprecated symbols (with warnings)

**Excluded:**
- ❌ Private/internal symbols (starting with `_`)
- ❌ Symbols marked `@private`
- ❌ Implementation details
- ❌ Helper functions

## Deployment

### Automatic (Recommended)
1. **Release Triggered**: Runs automatically on new p5.js releases
2. **Pull Request**: Creates PR for review before merging
3. **Tag Management**: Generates and resolves duplicate tags
4. **Backup**: Creates backup files before changes

### Manual
```bash
# Force manual run
npm run generate

# Generate with custom p5.js version
P5_VERSION=1.9.0 npm start
```

## Development

### Testing
```bash
# Run comprehensive test suite
npm test

# Run specific test categories
npm run test:parser
npm run test:generator
npm run test:integration

# Generate test coverage
npm run test:coverage
```

### Code Quality
```bash
# Lint code
npm run lint

# Format code  
npm run format
```

## Troubleshooting

### Common Issues

**Error: "GITHUB_TOKEN not found"**
- Ensure `.env` file exists with required tokens
- Check GitHub Actions secrets are configured

**Error: "Failed to clone repository"**
- Check internet connection
- Verify repository access permissions
- Ensure sufficient disk space

**Error: "No symbols extracted"**
- Verify p5.js source is valid
- Check if source code structure has changed
- Run with DEBUG=true for detailed logs

### Debug Mode

Enable detailed logging:
```bash
DEBUG=true npm start
```

This provides:
- Detailed parsing progress
- Symbol extraction statistics  
- Error stack traces
- Performance metrics

## GitHub Actions

The automation runs via GitHub Actions with these triggers:

1. **Release Published**: Automatic on new p5.js releases
2. **Manual Dispatch**: On-demand with force option
3. **Scheduled**: Weekly cleanup and maintenance

### Workflow Steps

1. Checkout repository
2. Setup Node.js environment
3. Install dependencies
4. Clone p5.js source
5. Extract symbols and generate documentation
6. Validate generated files
7. Commit to p5.nvim repository
8. Create pull request

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Ensure all tests pass
6. Submit pull request

## License

MIT License - see LICENSE file for details

## Support

- **Issues**: [GitHub Issues](https://github.com/prjctimg/automata/issues)
- **Discussions**: [GitHub Discussions](https://github.com/prjctimg/automata/discussions)
- **Email**: Create issue for private matters

---

Generated by p5.js Documentation Automation  
Last updated: 2025-01-31