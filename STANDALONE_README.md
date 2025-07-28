# Jira Dashboard - Standalone Build

This project includes a standalone build system that bundles your entire Next.js application into a single HTML file that can be shared and run offline.

## 🚀 Quick Start

### Build Standalone HTML File

```bash
npm run build-standalone
```

This command will:
1. Build your Next.js application
2. Bundle all assets (CSS, JS, images, fonts) into a single HTML file
3. Create `standalone.html` in your project root

### What You Get

- **`standalone.html`** - A single 3MB file containing your complete application
- **Fully self-contained** - No external dependencies or server required
- **Offline capable** - Works without internet connection
- **Cross-platform** - Runs on any device with a modern browser

## 📁 File Details

- **Size:** ~3MB (reasonable for a dashboard application)
- **Assets included:** 42 files inlined (CSS, JS, fonts, images)
- **Features:** All pages and functionality from your original app

## 🎯 How to Use

1. **Share the file:** Simply send `standalone.html` to anyone
2. **Run anywhere:** Double-click to open in any modern browser
3. **No installation:** Works immediately without setup

## 🔧 Customization

### Custom Output Location

```bash
node build-standalone-nextjs.js --output ./my-dashboard.html
```

### Custom Build Directory

```bash
node build-standalone-nextjs.js --build-dir ./custom-build
```

### Show Help

```bash
node build-standalone-nextjs.js --help
```

## ✅ What's Included

Your standalone bundle includes:
- Main dashboard with Jira integration
- Demo kanban board with sample data
- Dependency graph visualization
- Rich text editor (RTE) page
- All Material-UI components and styling
- Sample JSON data files

## 🚨 Limitations

- **No server-side features:** API calls, SSR, etc. won't work
- **No dynamic imports:** All code must be available at build time
- **No environment variables:** All config must be baked in

## 🎉 Success!

Your app is now ready to be distributed as a single file! The standalone HTML file contains everything needed to run your Jira Dashboard application offline. 