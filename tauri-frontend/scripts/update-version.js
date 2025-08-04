#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to update version in package.json
function updatePackageJson(version) {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageJson.version = version;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`Updated package.json version to ${version}`);
}

// Function to update version in Cargo.toml
function updateCargoToml(version) {
  const cargoTomlPath = path.join(__dirname, '..', 'src-tauri', 'Cargo.toml');
  let cargoToml = fs.readFileSync(cargoTomlPath, 'utf8');
  cargoToml = cargoToml.replace(/version = "[\d.]+"/, `version = "${version}"`);
  fs.writeFileSync(cargoTomlPath, cargoToml);
  console.log(`Updated Cargo.toml version to ${version}`);
}

// Function to update version in version.ts
function updateVersionTs(version) {
  const versionTsPath = path.join(__dirname, '..', 'src', 'utils', 'version.ts');
  let versionTs = fs.readFileSync(versionTsPath, 'utf8');
  versionTs = versionTs.replace(/export const APP_VERSION = '[\d.]+'/, `export const APP_VERSION = '${version}'`);
  fs.writeFileSync(versionTsPath, versionTs);
  console.log(`Updated version.ts APP_VERSION to ${version}`);
}

// Main function
function main() {
  const newVersion = process.argv[2];
  
  if (!newVersion) {
    console.error('Please provide a version number (e.g., node update-version.js 1.0.1)');
    process.exit(1);
  }

  // Validate version format (simple check)
  if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
    console.error('Version must be in format X.Y.Z (e.g., 1.0.1)');
    process.exit(1);
  }

  try {
    updatePackageJson(newVersion);
    updateCargoToml(newVersion);
    updateVersionTs(newVersion);
    console.log(`\n✅ Successfully updated version to ${newVersion} across all files!`);
  } catch (error) {
    console.error('Error updating version:', error);
    process.exit(1);
  }
}

main(); 