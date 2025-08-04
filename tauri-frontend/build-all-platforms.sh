#!/bin/bash

# Build script for all platforms using Docker
echo "🚀 Building Tauri app for all platforms..."

# Build Docker image
echo "📦 Building Docker image..."
docker build -t tauri-builder .

# Create output directory
mkdir -p builds

# Run container and copy builds
echo "🔨 Building for all platforms..."
docker run --rm -v $(pwd)/builds:/output tauri-builder bash -c "
    cp -r src-tauri/target/release/bundle/* /output/
    echo '✅ Builds completed!'
"

echo "🎉 All builds completed! Check the 'builds' directory for your apps."
echo ""
echo "📁 Available builds:"
ls -la builds/ 