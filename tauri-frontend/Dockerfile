# Multi-stage build for Tauri apps
FROM rust:1.77 as base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libwebkit2gtk-4.0-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    patchelf \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# Install Windows target
RUN rustup target add x86_64-pc-windows-msvc

# Install mingw-w64 for Windows builds
RUN apt-get update && apt-get install -y mingw-w64

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY src-tauri/Cargo.toml ./src-tauri/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build for all platforms
RUN npm run tauri build -- --target x86_64-pc-windows-msvc
RUN npm run tauri build -- --target x86_64-unknown-linux-gnu
RUN npm run tauri build

# Output directory
VOLUME /app/src-tauri/target/release/bundle 