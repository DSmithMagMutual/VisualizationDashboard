# 🚀 Tauri Build Guide

## Quick Commands

### Build for Both Platforms (Recommended)
```bash
npm run build:all
```
This creates a complete distribution package with both macOS and Windows builds.

### Quick Build (Development)
```bash
npm run build:quick
```
This builds both platforms quickly without creating distribution packages.

### Build Individual Platforms
```bash
npm run build:macos    # macOS only
npm run build:windows  # Windows only
```

## 📁 Build Outputs

### macOS Builds
- **App Bundle**: `src-tauri/target/release/bundle/macos/Jira Dashboard.app`
- **DMG Installer**: `src-tauri/target/release/bundle/dmg/Jira Dashboard_0.1.0_x64.dmg`

### Windows Builds
- **Executable**: `src-tauri/target/x86_64-pc-windows-gnu/release/app.exe`
- **Dependency**: `src-tauri/target/x86_64-pc-windows-gnu/release/WebView2Loader.dll`

### Distribution Packages (from build:all)
- **Windows ZIP**: `builds/[timestamp]/Jira-Dashboard-Windows.zip`
- **macOS ZIP**: `builds/[timestamp]/Jira-Dashboard-macOS.zip`

## 🔄 Development Workflow

### 1. Make Changes
Edit your React/TypeScript code in the `src/` directory.

### 2. Test Locally
```bash
npm run tauri:dev
```

### 3. Build for Distribution
```bash
npm run build:all
```

### 4. Distribute
- **Windows users**: Send `Jira-Dashboard-Windows.zip`
- **macOS users**: Send `Jira-Dashboard-macOS.zip`

## ⚡ Quick Iteration

For rapid development:
```bash
npm run build:quick
```

This builds both platforms without creating distribution packages.

## 🛠️ Troubleshooting

### Build Fails
1. **Clean and rebuild**:
   ```bash
   rm -rf src-tauri/target
   npm run build:all
   ```

2. **Update dependencies**:
   ```bash
   npm install
   cargo update
   ```

### Windows Build Issues
- Ensure you have the Windows target: `rustup target add x86_64-pc-windows-gnu`
- The Windows installer (NSIS) requires a Windows machine

### macOS Build Issues
- Ensure you have Xcode Command Line Tools: `xcode-select --install`

## 📦 Distribution

### For Windows Users
1. Extract `Jira-Dashboard-Windows.zip`
2. Run `app.exe`
3. No installation required!

### For macOS Users
1. Open `Jira Dashboard.app` directly, OR
2. Mount the DMG file and drag to Applications

## 🔧 Advanced Options

### Custom Build Directory
```bash
BUILDS_DIR="my-builds" npm run build:all
```

### Build with Debug Info
```bash
cargo build --release --target x86_64-pc-windows-gnu
```

### Clean Build
```bash
cargo clean
npm run build:all
```

## 📋 Prerequisites

- **Node.js** (v16+)
- **Rust** (latest stable)
- **Tauri CLI**: `cargo install tauri-cli`
- **Windows Target**: `rustup target add x86_64-pc-windows-gnu`
- **Xcode Command Line Tools** (macOS)

## 🎯 Best Practices

1. **Always test locally** before building for distribution
2. **Use version control** to track changes
3. **Test on both platforms** when possible
4. **Keep builds organized** with timestamps
5. **Document breaking changes** in your release notes 