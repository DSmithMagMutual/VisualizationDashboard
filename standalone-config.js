// Standalone HTML Build Configuration
// Copy this file and modify as needed for your project

module.exports = {
  // Build settings
  buildDir: './out', // Next.js static export directory
  outputFile: './standalone.html',
  
  // Asset size limits
  maxAssetSize: 1024 * 1024, // 1MB - skip assets larger than this
  
  // File filtering
  skipExtensions: [
    '.map',    // Source maps
    '.txt',    // Text files
    '.md',     // Markdown files
    '.log',    // Log files
    '.json',   // JSON files (optional)
    '.xml'     // XML files
  ],
  
  // File types to inline
  inlineExtensions: [
    '.css',    // Stylesheets
    '.js',     // JavaScript
    '.png',    // Images
    '.jpg',    // Images
    '.jpeg',   // Images
    '.gif',    // Images
    '.svg',    // Vector graphics
    '.ico',    // Icons
    '.woff',   // Web fonts
    '.woff2',  // Web fonts
    '.ttf',    // TrueType fonts
    '.eot'     // Embedded OpenType fonts
  ],
  
  // Build options
  compress: true,        // Enable compression
  showProgress: true,    // Show build progress
  
  // Next.js specific settings
  handleNextJS: true,           // Optimize for Next.js builds
  includeStaticAssets: true,    // Include static assets
  processChunks: true,          // Handle Next.js chunks
  
  // Custom processing hooks (optional)
  hooks: {
    // Called before processing each asset
    beforeProcessAsset: (filePath, relativePath) => {
      // Return false to skip this file
      // Return true to process normally
      return true;
    },
    
    // Called after processing each asset
    afterProcessAsset: (filePath, relativePath, asset) => {
      // Modify the asset if needed
      return asset;
    },
    
    // Called before writing the final HTML
    beforeWriteHTML: (html) => {
      // Modify the HTML if needed
      return html;
    }
  },
  
  // Custom MIME types (optional)
  mimeTypes: {
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm'
  },
  
  // HTML template customization (optional)
  htmlTemplate: {
    // Custom head content
    headExtra: `
    <meta name="generator" content="Standalone HTML Builder" />
    <meta name="robots" content="noindex, nofollow" />
    `,
    
    // Custom body content
    bodyExtra: `
    <!-- Standalone HTML generated on ${new Date().toISOString()} -->
    `,
    
    // Custom favicon
    favicon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⚛️</text></svg>'
  }
};

// Example usage:
// const config = require('./standalone-config');
// const StandaloneBuilder = require('./build-standalone-nextjs.js');
// const builder = new StandaloneBuilder(config);
// builder.buildStandaloneHTML(); 