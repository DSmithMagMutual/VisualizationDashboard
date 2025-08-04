#!/bin/bash

# 🚀 Quick Tauri Build Script
# For rapid development iterations

echo "🚀 Quick Tauri Build..."

# Build for current platform (macOS)
echo "📱 Building for macOS..."
npm run tauri:build

# Build for Windows
echo "🪟 Building for Windows..."
npm run tauri:build -- --target x86_64-pc-windows-gnu

echo "✅ Quick build completed!"
echo ""
echo "📁 Build outputs:"
echo "   macOS: src-tauri/target/release/bundle/"
echo "   Windows: src-tauri/target/x86_64-pc-windows-gnu/release/app.exe" 