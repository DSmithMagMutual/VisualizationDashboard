# Standalone HTML Build System

This system allows you to bundle your React/Next.js application into a single, self-contained HTML file that can be downloaded and run offline in any browser.

## 🚀 Quick Start

### For Next.js Applications (Recommended)

```bash
# Build and create standalone HTML file
npm run build-standalone

# Or export to static files first, then create standalone
npm run export-standalone
```

### For Create React App

```bash
# Build and create standalone HTML file
npm run build-standalone-cra
```

## 📁 Generated Files

After running the build process, you'll get:

- `standalone.html` - Your complete application in a single file
- Build logs showing what was processed and any warnings

## 🎯 Features

### ✅ What's Included

- **All CSS styles** - Inlined as `<style>` tags
- **All JavaScript** - Inlined as `<script>` tags  
- **Images** - Converted to base64 data URLs
- **Fonts** - Inlined as base64 data URLs
- **Icons** - Converted to base64 or SVG data URLs
- **Complete functionality** - Works offline without a server

### ⚙️ Configuration Options

The build scripts support several command-line options:

```bash
# Basic usage
node build-standalone-nextjs.js

# Custom build directory and output file
node build-standalone-nextjs.js --build-dir ./dist --output ./my-app.html

# Increase max asset size (default: 1MB)
node build-standalone-nextjs.js --max-size 5

# Suppress progress output
node build-standalone-nextjs.js --quiet

# Show help
node build-standalone-nextjs.js --help
```

## 📊 File Size Expectations

### Typical Sizes

- **Small app** (< 50 components): 1-3MB
- **Medium app** (50-200 components): 3-8MB  
- **Large app** (> 200 components): 8-15MB+

### Size Optimization

The build system automatically:

- **Skips large files** (> 1MB by default) to prevent bloated output
- **Excludes unnecessary files** (.map, .txt, .md, .log)
- **Processes only supported formats** (CSS, JS, images, fonts)
- **Shows detailed size breakdown** in the build output

## 🔧 Advanced Configuration

### Customizing Build Settings

You can modify the configuration in the build scripts:

```javascript
const CONFIG = {
  buildDir: './out',           // Build directory
  outputFile: './standalone.html', // Output file
  maxAssetSize: 1024 * 1024,   // Max file size (1MB)
  skipExtensions: ['.map', '.txt', '.md', '.log', '.json'],
  inlineExtensions: ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot'],
  compress: true,               // Enable compression
  showProgress: true           // Show build progress
};
```

### Handling Large Assets

If you have large assets that need to be included:

```bash
# Increase max size to 5MB
node build-standalone-nextjs.js --max-size 5
```

Or modify the script to handle specific files differently.

## 🚨 Limitations & Considerations

### Browser Limitations

- **File size limits**: Some browsers have limits on data URL size
- **Memory usage**: Large files may cause memory issues in older browsers
- **Loading time**: Very large files may take time to load

### Application Limitations

- **No server-side features**: API calls, SSR, etc. won't work
- **No dynamic imports**: All code must be available at build time
- **No environment variables**: All config must be baked in

### Recommended Use Cases

✅ **Perfect for**:
- Static dashboards
- Documentation sites
- Portfolio websites
- Offline-capable apps
- Demo applications
- Internal tools

❌ **Not suitable for**:
- Apps requiring server-side rendering
- Applications with heavy API dependencies
- Real-time applications
- Apps requiring environment-specific configuration

## 🛠️ Troubleshooting

### Common Issues

**Build fails with "No index.html found"**
```bash
# Make sure you've built the project first
npm run build
# Then run the standalone build
npm run build-standalone
```

**File is too large**
```bash
# Check what's being included
node build-standalone-nextjs.js --quiet
# Look for large assets in the output
```

**Assets not loading**
- Check that all assets are in the build directory
- Verify file paths in your CSS/JS
- Ensure assets aren't being skipped due to size

### Debug Mode

To see detailed processing information:

```bash
# Run with verbose output (default)
node build-standalone-nextjs.js

# Check the build output for warnings and errors
```

## 📋 Build Process Details

### Step-by-Step Process

1. **Scan build directory** - Find all files in the build output
2. **Filter assets** - Skip unsupported or large files
3. **Process CSS** - Inline styles and resolve asset references
4. **Process JavaScript** - Inline scripts and handle dependencies
5. **Convert assets** - Convert images/fonts to base64
6. **Build HTML** - Combine everything into a single file
7. **Write output** - Save the standalone HTML file

### Asset Processing

- **CSS files**: Inlined with resolved asset references
- **JavaScript files**: Inlined in dependency order
- **Images**: Converted to base64 data URLs
- **Fonts**: Converted to base64 data URLs
- **Other assets**: Skipped or converted based on configuration

## 🎨 Customization Examples

### Custom Build Script

```javascript
const StandaloneBuilder = require('./build-standalone-nextjs.js');

const builder = new StandaloneBuilder({
  buildDir: './custom-build',
  outputFile: './my-app.html',
  maxAssetSize: 2 * 1024 * 1024, // 2MB
  skipExtensions: ['.map', '.txt', '.md', '.log', '.json', '.xml'],
  showProgress: false
});

builder.buildStandaloneHTML()
  .then(result => {
    console.log(`Build completed: ${result.outputFile}`);
  })
  .catch(error => {
    console.error('Build failed:', error);
  });
```

### Integration with CI/CD

```yaml
# GitHub Actions example
- name: Build Standalone
  run: |
    npm run build
    node build-standalone-nextjs.js --output ./dist/standalone.html
  env:
    NODE_ENV: production
```

## 📞 Support

If you encounter issues:

1. Check the build output for specific error messages
2. Verify your build directory contains the expected files
3. Try running with `--quiet` to see only errors
4. Check file sizes and ensure they're within limits

## 🔄 Updates

To update the build system:

1. Replace the build scripts with newer versions
2. Update configuration as needed
3. Test with your specific application
4. Update any custom configurations

---

**Note**: This system is designed for Next.js applications but can be adapted for other React build systems. The `build-standalone.js` script is the generic version, while `build-standalone-nextjs.js` is optimized for Next.js builds. 