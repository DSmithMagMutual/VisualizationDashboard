#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Configuration
const CONFIG = {
  buildDir: './build',
  outputFile: './standalone.html',
  maxAssetSize: 1024 * 1024, // 1MB - skip assets larger than this
  skipExtensions: ['.map', '.txt', '.md', '.log'],
  inlineExtensions: ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'],
  compress: true,
  showProgress: true
};

class StandaloneBuilder {
  constructor(config = {}) {
    this.config = { ...CONFIG, ...config };
    this.assets = new Map();
    this.inlinedCount = 0;
    this.skippedCount = 0;
    this.errors = [];
  }

  log(message, type = 'info') {
    if (this.config.showProgress) {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
      console.log(`${prefix} [${timestamp}] ${message}`);
    }
  }

  async readFile(filePath) {
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      this.errors.push(`Failed to read ${filePath}: ${error.message}`);
      return null;
    }
  }

  async getAllFiles(dir, fileList = []) {
    try {
      const files = await fs.readdir(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isDirectory()) {
          await this.getAllFiles(filePath, fileList);
        } else {
          fileList.push(filePath);
        }
      }
      
      return fileList;
    } catch (error) {
      this.errors.push(`Failed to scan directory ${dir}: ${error.message}`);
      return fileList;
    }
  }

  shouldSkipFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return this.config.skipExtensions.includes(ext);
  }

  shouldInlineFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return this.config.inlineExtensions.includes(ext);
  }

  async getFileSize(filePath) {
    try {
      const stat = await fs.stat(filePath);
      return stat.size;
    } catch {
      return 0;
    }
  }

  async convertToBase64(filePath) {
    try {
      const buffer = await this.readFile(filePath);
      if (!buffer) return null;
      
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = this.getMimeType(ext);
      return `data:${mimeType};base64,${buffer.toString('base64')}`;
    } catch (error) {
      this.errors.push(`Failed to convert ${filePath} to base64: ${error.message}`);
      return null;
    }
  }

  getMimeType(ext) {
    const mimeTypes = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  async processAsset(filePath) {
    const relativePath = path.relative(this.config.buildDir, filePath);
    const fileSize = await this.getFileSize(filePath);
    
    // Skip files that are too large
    if (fileSize > this.config.maxAssetSize) {
      this.log(`Skipping large file: ${relativePath} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`, 'warn');
      this.skippedCount++;
      return;
    }

    // Skip files we don't want to process
    if (this.shouldSkipFile(filePath)) {
      this.log(`Skipping file: ${relativePath}`, 'warn');
      this.skippedCount++;
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.css') {
      await this.processCSS(filePath, relativePath);
    } else if (ext === '.js') {
      await this.processJS(filePath, relativePath);
    } else if (this.shouldInlineFile(filePath)) {
      await this.processBinaryAsset(filePath, relativePath);
    } else {
      this.log(`Skipping unsupported file: ${relativePath}`, 'warn');
      this.skippedCount++;
    }
  }

  async processCSS(filePath, relativePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const processedContent = await this.processCSSContent(content, path.dirname(filePath));
      this.assets.set(relativePath, { type: 'css', content: processedContent });
      this.inlinedCount++;
      this.log(`Processed CSS: ${relativePath}`);
    } catch (error) {
      this.errors.push(`Failed to process CSS ${relativePath}: ${error.message}`);
    }
  }

  async processCSSContent(content, cssDir) {
    // Handle @import statements and url() references
    let processedContent = content;
    
    // Process url() references
    const urlRegex = /url\(['"]?([^'")\s]+)['"]?\)/g;
    processedContent = await this.replaceUrls(processedContent, urlRegex, cssDir);
    
    return processedContent;
  }

  async processJS(filePath, relativePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      this.assets.set(relativePath, { type: 'js', content });
      this.inlinedCount++;
      this.log(`Processed JS: ${relativePath}`);
    } catch (error) {
      this.errors.push(`Failed to process JS ${relativePath}: ${error.message}`);
    }
  }

  async processBinaryAsset(filePath, relativePath) {
    try {
      const base64 = await this.convertToBase64(filePath);
      if (base64) {
        this.assets.set(relativePath, { type: 'binary', content: base64 });
        this.inlinedCount++;
        this.log(`Processed binary asset: ${relativePath}`);
      }
    } catch (error) {
      this.errors.push(`Failed to process binary asset ${relativePath}: ${error.message}`);
    }
  }

  async replaceUrls(content, regex, baseDir) {
    let match;
    let processedContent = content;
    
    while ((match = regex.exec(content)) !== null) {
      const [fullMatch, url] = match;
      
      // Skip data URLs and external URLs
      if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
        continue;
      }
      
      const assetPath = path.resolve(baseDir, url);
      const relativeAssetPath = path.relative(this.config.buildDir, assetPath);
      
      // Check if we have this asset
      if (this.assets.has(relativeAssetPath)) {
        const asset = this.assets.get(relativeAssetPath);
        const replacement = `url("${asset.content}")`;
        processedContent = processedContent.replace(fullMatch, replacement);
      }
    }
    
    return processedContent;
  }

  async findIndexHTML() {
    const indexFiles = ['index.html', 'Index.html', 'INDEX.HTML'];
    
    for (const fileName of indexFiles) {
      const filePath = path.join(this.config.buildDir, fileName);
      try {
        await fs.access(filePath);
        return filePath;
      } catch {
        continue;
      }
    }
    
    throw new Error('No index.html file found in build directory');
  }

  async buildStandaloneHTML() {
    this.log('Starting standalone HTML build...');
    
    // Check if build directory exists
    try {
      await fs.access(this.config.buildDir);
    } catch {
      throw new Error(`Build directory not found: ${this.config.buildDir}`);
    }

    // Find and read index.html
    const indexPath = await this.findIndexHTML();
    const indexContent = await fs.readFile(indexPath, 'utf8');
    
    this.log(`Found index.html at: ${indexPath}`);

    // Get all files in build directory
    const allFiles = await this.getAllFiles(this.config.buildDir);
    this.log(`Found ${allFiles.length} files to process`);

    // Process all assets
    for (const filePath of allFiles) {
      if (path.basename(filePath) !== 'index.html') {
        await this.processAsset(filePath);
      }
    }

    // Build the standalone HTML
    const standaloneHTML = await this.createStandaloneHTML(indexContent);
    
    // Write the output file
    await fs.writeFile(this.config.outputFile, standaloneHTML);
    
    // Get final file size
    const finalSize = await this.getFileSize(this.config.outputFile);
    
    this.log(`Build completed successfully!`, 'success');
    this.log(`Output file: ${this.config.outputFile}`);
    this.log(`Final size: ${(finalSize / 1024 / 1024).toFixed(2)}MB`);
    this.log(`Assets inlined: ${this.inlinedCount}`);
    this.log(`Assets skipped: ${this.skippedCount}`);
    
    if (this.errors.length > 0) {
      this.log(`Warnings/Errors: ${this.errors.length}`, 'warn');
      this.errors.forEach(error => this.log(`  ${error}`, 'warn'));
    }
    
    return {
      outputFile: this.config.outputFile,
      size: finalSize,
      inlinedCount: this.inlinedCount,
      skippedCount: this.skippedCount,
      errors: this.errors
    };
  }

  async createStandaloneHTML(indexContent) {
    // Extract the HTML structure
    const headMatch = indexContent.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    const bodyMatch = indexContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    
    if (!headMatch || !bodyMatch) {
      throw new Error('Could not parse index.html structure');
    }
    
    const headContent = headMatch[1];
    const bodyContent = bodyMatch[1];
    
    // Extract title
    const titleMatch = indexContent.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : 'React App';
    
    // Build CSS content
    const cssContent = [];
    for (const [path, asset] of this.assets) {
      if (asset.type === 'css') {
        cssContent.push(`/* ${path} */`);
        cssContent.push(asset.content);
      }
    }
    
    // Build JS content
    const jsContent = [];
    for (const [path, asset] of this.assets) {
      if (asset.type === 'js') {
        jsContent.push(`// ${path}`);
        jsContent.push(asset.content);
      }
    }
    
    // Create the standalone HTML
    const standaloneHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚛️</text></svg>" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Standalone React App" />
    <title>${title}</title>
    <style>
${cssContent.join('\n\n')}
    </style>
</head>
<body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root">${bodyContent}</div>
    <script>
${jsContent.join('\n\n')}
    </script>
</body>
</html>`;

    return standaloneHTML;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const config = { ...CONFIG };
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--build-dir':
        config.buildDir = args[++i];
        break;
      case '--output':
        config.outputFile = args[++i];
        break;
      case '--max-size':
        config.maxAssetSize = parseInt(args[++i]) * 1024 * 1024;
        break;
      case '--no-compress':
        config.compress = false;
        break;
      case '--quiet':
        config.showProgress = false;
        break;
      case '--help':
        console.log(`
Standalone HTML Builder

Usage: node build-standalone.js [options]

Options:
  --build-dir <path>    Build directory (default: ./build)
  --output <file>       Output file (default: ./standalone.html)
  --max-size <mb>       Max asset size in MB (default: 1)
  --no-compress         Disable compression
  --quiet               Suppress progress output
  --help                Show this help

Examples:
  node build-standalone.js
  node build-standalone.js --build-dir ./dist --output ./app.html
  node build-standalone.js --max-size 5 --quiet
        `);
        return;
    }
  }
  
  try {
    const builder = new StandaloneBuilder(config);
    const result = await builder.buildStandaloneHTML();
    
    console.log('\n🎉 Standalone HTML build completed successfully!');
    console.log(`📁 Output: ${result.outputFile}`);
    console.log(`📊 Size: ${(result.size / 1024 / 1024).toFixed(2)}MB`);
    console.log(`📦 Assets inlined: ${result.inlinedCount}`);
    console.log(`⏭️  Assets skipped: ${result.skippedCount}`);
    
    if (result.errors.length > 0) {
      console.log(`⚠️  Warnings: ${result.errors.length}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = StandaloneBuilder; 