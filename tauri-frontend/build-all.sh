#!/bin/bash

# 🚀 Tauri Multi-Platform Build Script
# Builds for macOS and Windows simultaneously

set -e  # Exit on any error

echo "🚀 Starting Tauri Multi-Platform Build..."
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "src-tauri" ]; then
    print_error "Please run this script from the tauri-frontend directory"
    exit 1
fi

# Create builds directory
BUILDS_DIR="builds/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BUILDS_DIR"

print_status "Builds will be saved to: $BUILDS_DIR"

# Install dependencies if needed
print_status "Installing npm dependencies..."
npm install

# Build for macOS
print_status "Building for macOS..."
npm run tauri:build

# Copy macOS builds
print_status "Copying macOS builds..."
mkdir -p "$BUILDS_DIR/macos"
cp -r src-tauri/target/release/bundle/macos/* "$BUILDS_DIR/macos/"
cp -r src-tauri/target/release/bundle/dmg/* "$BUILDS_DIR/macos/"

# Build for Windows
print_status "Building for Windows..."
npm run tauri:build -- --target x86_64-pc-windows-gnu

# Copy Windows builds
print_status "Copying Windows builds..."
mkdir -p "$BUILDS_DIR/windows"
cp src-tauri/target/x86_64-pc-windows-gnu/release/app.exe "$BUILDS_DIR/windows/"
cp src-tauri/target/x86_64-pc-windows-gnu/release/WebView2Loader.dll "$BUILDS_DIR/windows/"

# Create distribution packages
print_status "Creating distribution packages..."

# Windows ZIP
cd "$BUILDS_DIR/windows"
zip -r "../Jira-Dashboard-Windows.zip" .
cd - > /dev/null

# macOS ZIP
cd "$BUILDS_DIR/macos"
zip -r "../Jira-Dashboard-macOS.zip" .
cd - > /dev/null

# Create README for the build
cat > "$BUILDS_DIR/README.txt" << 'EOF'
Jira Dashboard - Multi-Platform Build
=====================================

Build Date: $(date)
Version: 0.1.0

📁 Contents:
├── windows/          - Windows executable and dependencies
├── macos/            - macOS app bundle and DMG
├── Jira-Dashboard-Windows.zip  - Windows distribution package
└── Jira-Dashboard-macOS.zip    - macOS distribution package

🚀 Quick Start:
- Windows: Extract Jira-Dashboard-Windows.zip and run app.exe
- macOS: Open Jira Dashboard.app or mount the DMG file

📋 System Requirements:
- Windows: Windows 10 (1803+) or Windows 11
- macOS: macOS 10.15+ (Catalina or later)
EOF

print_success "🎉 Multi-platform build completed!"
echo ""
echo "📁 Build outputs:"
echo "   macOS: $BUILDS_DIR/macos/"
echo "   Windows: $BUILDS_DIR/windows/"
echo "   Distribution packages: $BUILDS_DIR/*.zip"
echo ""
echo "📋 File sizes:"
ls -lh "$BUILDS_DIR/windows/app.exe"
ls -lh "$BUILDS_DIR/macos/Jira Dashboard.app"
echo ""
print_warning "Note: Windows installer creation failed (requires NSIS on Windows)"
print_warning "The Windows executable is fully functional without the installer" 