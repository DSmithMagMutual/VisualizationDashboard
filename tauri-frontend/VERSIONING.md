# Versioning System

This Tauri application includes a comprehensive versioning system that displays the current version in the bottom right corner of the application window.

## Current Version

The application is currently at version **1.0.0**.

## Version Display

The version is displayed in the bottom right corner of the application window as a small, semi-transparent overlay. When you hover over it, a tooltip shows additional information including:

- Version number
- Environment (development/production)
- Build date

## Files That Track Version

The version is maintained in the following files:

1. **`package.json`** - Frontend package version
2. **`src-tauri/Cargo.toml`** - Rust backend version
3. **`src/utils/version.ts`** - Version utility for the frontend

## Updating the Version

To update the version across all files, use the provided script:

```bash
npm run version:update <new-version>
```

Example:
```bash
npm run version:update 1.0.1
```

This will automatically update:
- `package.json` version field
- `Cargo.toml` version field
- `src/utils/version.ts` APP_VERSION constant

## Manual Version Updates

If you need to update versions manually, ensure you update all three files to maintain consistency:

1. Update `package.json`:
   ```json
   {
     "version": "1.0.1"
   }
   ```

2. Update `src-tauri/Cargo.toml`:
   ```toml
   [package]
   version = "1.0.1"
   ```

3. Update `src/utils/version.ts`:
   ```typescript
   export const APP_VERSION = '1.0.1';
   ```

## Version Format

Versions should follow semantic versioning (SemVer) format: `X.Y.Z`

- **X** - Major version (breaking changes)
- **Y** - Minor version (new features, backward compatible)
- **Z** - Patch version (bug fixes, backward compatible)

## Version Display Component

The version is displayed using the `VersionDisplay` component located at `src/components/VersionDisplay.tsx`. This component:

- Shows the version in the bottom right corner
- Provides a tooltip with additional information
- Uses a semi-transparent background with blur effect
- Is positioned as a fixed overlay that doesn't interfere with the main UI

## Build Integration

When building the application for distribution, the version information is automatically included in the build artifacts. The version displayed in the application will match the version specified in the configuration files. 