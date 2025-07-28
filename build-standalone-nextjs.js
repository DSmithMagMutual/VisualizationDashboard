#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Configuration for Next.js builds
const CONFIG = {
  buildDir: './out', // Next.js static export directory
  outputFile: './standalone.html',
  maxAssetSize: 1024 * 1024, // 1MB
  skipExtensions: ['.map', '.txt', '.md', '.log', '.json'],
  inlineExtensions: ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'],
  compress: true,
  showProgress: true,
  // Next.js specific settings
  handleNextJS: true,
  includeStaticAssets: true,
  processChunks: true
};

class NextJSStandaloneBuilder {
  constructor(config = {}) {
    this.config = { ...CONFIG, ...config };
    this.assets = new Map();
    this.inlinedCount = 0;
    this.skippedCount = 0;
    this.errors = [];
    this.chunkMap = new Map();
    this.chunkReplacements = new Map();
  }

  log(message, type = 'info') {
    if (this.config.showProgress) {
      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      const prefix = type === 'error' ? '❌' : type === 'warn' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
      console.log(`${prefix} [${timestamp}] ${message}`);
    }
  }

  async readFile(filePath, encoding = null) {
    try {
      return await fs.readFile(filePath, encoding);
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
      '.css': 'text/css',
      '.js': 'application/javascript',
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
    
    if (fileSize > this.config.maxAssetSize) {
      this.log(`Skipping large file: ${relativePath} (${(fileSize / 1024 / 1024).toFixed(2)}MB)`, 'warn');
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
      const content = await this.readFile(filePath, 'utf8');
      if (!content) return;
      
      const processedContent = await this.processCSSContent(content, path.dirname(filePath));
      this.assets.set(relativePath, processedContent);
      this.inlinedCount++;
      this.log(`Processed CSS: ${relativePath}`);
    } catch (error) {
      this.errors.push(`Failed to process CSS ${relativePath}: ${error.message}`);
    }
  }

  async processCSSContent(content, cssDir) {
    // Process url() references in CSS
    const urlRegex = /url\(['"]?([^'")\s]+)['"]?\)/g;
    return await this.replaceUrls(content, urlRegex, cssDir);
  }

  async processJS(filePath, relativePath) {
    try {
      const content = await this.readFile(filePath, 'utf8');
      if (!content) return;
      
      // Handle Next.js chunks
      if (this.config.handleNextJS && relativePath.includes('_next/static/chunks/')) {
        const chunkId = this.extractChunkId(filePath);
        if (chunkId) {
          this.chunkMap.set(chunkId, content);
          this.chunkReplacements.set(`/_next/static/chunks/${path.basename(filePath)}`, content);
        }
      }
      
      this.assets.set(relativePath, content);
      this.inlinedCount++;
      this.log(`Processed JS: ${relativePath}`);
    } catch (error) {
      this.errors.push(`Failed to process JS ${relativePath}: ${error.message}`);
    }
  }

  extractChunkId(filePath) {
    const match = path.basename(filePath).match(/^(\d+)-/);
    return match ? match[1] : null;
  }

  async processBinaryAsset(filePath, relativePath) {
    try {
      const base64 = await this.convertToBase64(filePath);
      if (base64) {
        this.assets.set(relativePath, base64);
        this.inlinedCount++;
        this.log(`Processed binary asset: ${relativePath}`);
      }
    } catch (error) {
      this.errors.push(`Failed to process binary asset ${relativePath}: ${error.message}`);
    }
  }

  async replaceUrls(content, regex, baseDir) {
    let match;
    let result = content;
    
    while ((match = regex.exec(content)) !== null) {
      const url = match[1];
      if (url.startsWith('data:') || url.startsWith('http') || url.startsWith('//')) {
        continue; // Skip data URLs and external URLs
      }
      
      const assetPath = path.resolve(baseDir, url);
      const relativeAssetPath = path.relative(this.config.buildDir, assetPath);
      
      if (this.assets.has(relativeAssetPath)) {
        const replacement = this.assets.get(relativeAssetPath);
        result = result.replace(match[0], `url("${replacement}")`);
      }
    }
    
    return result;
  }

  async findIndexHTML() {
    const indexPaths = [
      path.join(this.config.buildDir, 'index.html'),
      path.join(this.config.buildDir, 'demo', 'index.html'),
      path.join(this.config.buildDir, 'dependency-graph', 'index.html')
    ];
    
    for (const indexPath of indexPaths) {
      try {
        await fs.access(indexPath);
        this.log(`Found index.html at: ${indexPath}`);
        return indexPath;
      } catch {
        continue;
      }
    }
    
    throw new Error('No index.html found in build directory');
  }

  async buildStandaloneHTML() {
    this.log('Starting Next.js standalone HTML build...');
    
    // Check if build directory exists
    try {
      await fs.access(this.config.buildDir);
    } catch {
      throw new Error(`Build directory not found: ${this.config.buildDir}`);
    }
    
    // Find all files
    const files = await this.getAllFiles(this.config.buildDir);
    this.log(`Found ${files.length} files to process`);
    
    // Process all assets
    for (const file of files) {
      if (!this.shouldSkipFile(file)) {
        await this.processAsset(file);
      }
    }
    
    // Find and process index.html
    const indexPath = await this.findIndexHTML();
    const indexContent = await this.readFile(indexPath, 'utf8');
    
    if (!indexContent) {
      throw new Error('Failed to read index.html');
    }
    
    // Create standalone HTML
    const standaloneHTML = await this.createStandaloneHTML(indexContent);
    
    // Write output file
    await fs.writeFile(this.config.outputFile, standaloneHTML);
    
    // Post-process to remove any remaining external script tags
    let finalHTML = standaloneHTML;
    finalHTML = finalHTML.replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, '');
    finalHTML = finalHTML.replace(/<script[^>]*src="[^"]*"[^>]*>/g, '');
    
    // Write the cleaned version
    await fs.writeFile(this.config.outputFile, finalHTML);
    
    // Log results
    const outputSize = (finalHTML.length / 1024 / 1024).toFixed(2);
    this.log(`Build completed successfully!`, 'success');
    this.log(`Output file: ${this.config.outputFile}`);
    this.log(`Final size: ${outputSize}MB`);
    this.log(`Assets inlined: ${this.inlinedCount}`);
    this.log(`Assets skipped: ${this.skippedCount}`);
    
    if (this.errors.length > 0) {
      this.log(`Errors encountered: ${this.errors.length}`, 'warn');
      this.errors.forEach(error => this.log(`  ${error}`, 'error'));
    }
    
    return finalHTML;
  }

  async createStandaloneHTML(indexContent) {
    // More robust HTML processing that handles minified content
    let content = indexContent;
    
    // Remove external script tags with various patterns
    const scriptPatterns = [
      /<script[^>]*src="[^"]*"[^>]*><\/script>/g,
      /<script[^>]*src="[^"]*"[^>]*>/g,
      /<script[^>]*src='[^']*'[^>]*><\/script>/g,
      /<script[^>]*src='[^']*'[^>]*>/g,
      /<script[^>]*src="[^"]*"[^>]*\/>/g,
      /<script[^>]*src='[^']*'[^>]*\/>/g
    ];
    
    scriptPatterns.forEach(pattern => {
      content = content.replace(pattern, '');
    });
    
    // Remove external link tags with various patterns
    const linkPatterns = [
      /<link[^>]*href="(?!data:)[^"]*"[^>]*>/g,
      /<link[^>]*href='(?!data:)[^']*'[^>]*>/g,
      /<link[^>]*rel="preload"[^>]*>/g,
      /<link[^>]*rel='preload'[^>]*>/g,
      /<link[^>]*rel="stylesheet"[^>]*>/g,
      /<link[^>]*rel='stylesheet'[^>]*>/g,
      /<link[^>]*href="[^"]*"[^>]*\/>/g,
      /<link[^>]*href='[^']*'[^>]*\/>/g
    ];
    
    linkPatterns.forEach(pattern => {
      content = content.replace(pattern, '');
    });
    
    // Extract existing styles and scripts
    const styleMatches = indexContent.match(/<style[^>]*>([\s\S]*?)<\/style>/g) || [];
    const scriptMatches = indexContent.match(/<script[^>]*>([\s\S]*?)<\/script>/g) || [];
    
    // Collect all CSS content
    let allCSS = '';
    for (const [relativePath, assetContent] of this.assets) {
      if (relativePath.endsWith('.css')) {
        allCSS += `/* ${relativePath} */\n${assetContent}\n\n`;
      }
    }
    
    // Collect all JS content and create a mapping for chunk replacement
    let allJS = '';
    const jsChunks = new Map();
    
    for (const [relativePath, assetContent] of this.assets) {
      if (relativePath.endsWith('.js')) {
        // Store chunks for later replacement
        if (relativePath.includes('_next/static/chunks/')) {
          jsChunks.set(`/_next/static/chunks/${path.basename(relativePath)}`, assetContent);
        }
        allJS += `/* ${relativePath} */\n${assetContent}\n\n`;
      }
    }
    
    // Create a webpack-like loader that handles chunk loading
    const webpackLoader = `
// Webpack chunk loader for standalone mode
(function() {
  const chunkCache = new Map();
  const loadedChunks = new Set();
  
  // Store all chunks in memory
  const chunks = ${JSON.stringify(Object.fromEntries(jsChunks))};
  
  // Wait for webpack to be available
  function waitForWebpack() {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.__webpack_require__) {
        resolve();
        return;
      }
      
      // Check every 100ms for webpack
      const checkInterval = setInterval(() => {
        if (typeof window !== 'undefined' && window.__webpack_require__) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 5000);
    });
  }
  
  // Override webpack's chunk loading
  waitForWebpack().then(() => {
    if (typeof window !== 'undefined' && window.__webpack_require__) {
      const originalE = window.__webpack_require__.e;
      window.__webpack_require__.e = function(chunkId) {
        return new Promise(function(resolve, reject) {
          if (loadedChunks.has(chunkId)) {
            resolve();
            return;
          }
          
          // Find the chunk by ID
          const chunkKey = Object.keys(chunks).find(key => key.includes(chunkId));
          if (chunkKey && chunks[chunkKey]) {
            try {
              // Execute the chunk code
              const script = document.createElement('script');
              script.textContent = chunks[chunkKey];
              document.head.appendChild(script);
              loadedChunks.add(chunkId);
              resolve();
            } catch (error) {
              reject(error);
            }
          } else {
            // If chunk not found, try to resolve anyway (might be already loaded)
            console.warn('Chunk not found:', chunkId);
            loadedChunks.add(chunkId);
            resolve();
          }
        });
      };
    }
  });
  
  // Handle dynamic imports
  if (typeof window !== 'undefined') {
    window.__webpack_chunk_load__ = function(chunkId) {
      return Promise.resolve();
    };
  }
  
  // Override fetch for chunk loading
  if (typeof window !== 'undefined') {
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
      // Check if this is a request for a webpack chunk
      if (typeof url === 'string' && url.includes('_next/static/chunks/')) {
        const chunkKey = Object.keys(chunks).find(key => url.includes(key.split('/').pop()));
        if (chunkKey && chunks[chunkKey]) {
          // Return a mock response with the chunk content
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(chunks[chunkKey]),
            json: () => Promise.resolve({ code: chunks[chunkKey] })
          });
        }
      }
      // For other requests, use the original fetch
      return originalFetch.apply(this, arguments);
    };
  }
})();
`;
    
    // Create standalone HTML structure
    const standaloneHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚛️</text></svg>" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Standalone Next.js App" />
    <title>Jira Dashboard</title>
    <style>
${allCSS}
${styleMatches.join('\n')}
    </style>
</head>
<body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    ${content.match(/<div[^>]*id="__next"[^>]*>[\s\S]*?<\/div>/)?.[0] || '<div id="__next">Loading...</div>'}
    <script>
${webpackLoader}
${allJS}
${scriptMatches.join('\n')}
    </script>
</body>
</html>`;
    
    return standaloneHTML;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const config = { ...CONFIG };
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--build-dir' && args[i + 1]) {
      config.buildDir = args[i + 1];
      i++;
    } else if (arg === '--output' && args[i + 1]) {
      config.outputFile = args[i + 1];
      i++;
    } else if (arg === '--no-compress') {
      config.compress = false;
    } else if (arg === '--quiet') {
      config.showProgress = false;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Next.js Standalone HTML Builder

Usage: node build-standalone-nextjs.js [options]

Options:
  --build-dir <path>    Build directory (default: ./out)
  --output <path>       Output file (default: ./standalone.html)
  --no-compress         Disable compression
  --quiet               Suppress progress output
  --help, -h           Show this help message

Examples:
  node build-standalone-nextjs.js
  node build-standalone-nextjs.js --build-dir ./dist --output ./app.html
`);
      process.exit(0);
    }
  }
  
  try {
    const builder = new NextJSStandaloneBuilder(config);
    await builder.buildStandaloneHTML();
    console.log('\n🎉 Next.js Standalone HTML build completed successfully!');
    console.log(`📁 Output: ${config.outputFile}`);
    console.log(`📊 Size: ${(await fs.stat(config.outputFile)).size / 1024 / 1024}MB`);
    console.log(`📦 Assets inlined: ${builder.inlinedCount}`);
    console.log(`⏭️  Assets skipped: ${builder.skippedCount}`);
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { NextJSStandaloneBuilder, CONFIG }; 