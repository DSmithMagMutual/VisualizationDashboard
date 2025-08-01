# Jira Dashboard - Tauri App

A clean, Tauri-only version of the Jira Dashboard with enhanced dependency graph visualization.

## Features

- **Dependency Graph Visualization** with relationship types:
  - Red arrows: "Blocked by" relationships
  - Orange arrows: "Blocks" relationships  
  - Blue dashed lines: "Related to" relationships
  - Gray lines: Epic-to-story relationships

- **Test Data**: Includes "Test Relationships (Demo)" to showcase all relationship types

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start development**:
   ```bash
   npm run tauri dev
   ```

3. **Build for production**:
   ```bash
   npm run tauri build
   ```

## Testing the Dependency Graph

1. Open the Tauri app
2. Navigate to "Dependency Graph" 
3. Select "Test Relationships (Demo)" from the data source dropdown
4. Explore the visual relationships between issues

## Project Structure

- `src/` - React frontend code
- `src-tauri/` - Rust backend code
- `public/` - Static assets and data files
  - `test-relationships.json` - Demo data with relationship examples
  - `board-saveAdvice.json` - Real Jira data (ADVICE project)
  - `board-savePDD.json` - Real Jira data (PDD project)

## Data Sources

- **Test Relationships (Demo)**: Shows all relationship types with test data
- **Board Save Advice (ADVICE)**: Real Jira project data
- **Board Save PDD**: Real Jira project data 