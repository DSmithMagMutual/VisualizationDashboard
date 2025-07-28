# 🚀 Quick Setup Guide

## 1. Build Your Standalone HTML File

### For Next.js (Your Current Project)

```bash
# Build and create standalone HTML
npm run build-standalone

# Or export to static files first, then create standalone
npm run export-standalone
```

### For Create React App

```bash
# Build and create standalone HTML
npm run build-standalone-cra
```

## 2. Validate Your Build

```bash
# Validate the generated standalone HTML file
npm run validate-standalone

# Or validate a specific file
node validate-standalone.js your-file.html
```

## 3. Test Your Standalone File

1. **Open the file**: Double-click `standalone.html` or open it in any browser
2. **Test offline**: Disconnect from the internet and refresh the page
3. **Share**: Send the `standalone.html` file to others - it will work on their computers

## 4. Customize (Optional)

```bash
# Use custom build directory
node build-standalone-nextjs.js --build-dir ./dist --output ./my-app.html

# Increase max asset size
node build-standalone-nextjs.js --max-size 5

# Suppress progress output
node build-standalone-nextjs.js --quiet
```

## 5. Troubleshooting

### Common Issues

**Build fails with "No index.html found"**
```bash
# Make sure you've built the project first
npm run build
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

## 📁 Generated Files

After running the build, you'll have:
- `standalone.html` - Your complete application in a single file
- Build logs showing what was processed

## 🎯 What's Included

✅ **All CSS styles** - Inlined as `<style>` tags  
✅ **All JavaScript** - Inlined as `<script>` tags  
✅ **Images** - Converted to base64 data URLs  
✅ **Fonts** - Inlined as base64 data URLs  
✅ **Complete functionality** - Works offline without a server  

## 📊 Expected File Sizes

- **Small app** (< 50 components): 1-3MB
- **Medium app** (50-200 components): 3-8MB  
- **Large app** (> 200 components): 8-15MB+

## 🚨 Limitations

- No server-side features (API calls, SSR, etc.)
- No dynamic imports
- No environment variables
- File size limits in some browsers

## 📖 Full Documentation

See `STANDALONE_BUILD_README.md` for complete documentation, advanced configuration, and troubleshooting.

---

**That's it!** Your React app is now a single HTML file that can run anywhere. 🎉 