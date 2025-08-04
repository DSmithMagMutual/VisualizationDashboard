# Local Data System

This Tauri application now uses a local data system that stores JSON board data in the user's local application data directory.

## How It Works

### First Run Initialization
When the app runs for the first time, it automatically:

1. **Creates a data directory** in the user's application data folder
2. **Copies JSON files** from the app's resources to the local data directory
3. **Sets up the data system** for future use

### Data Directory Location

The data directory is created in the standard application data location for each platform:

- **macOS**: `~/Library/Application Support/app/data/`
- **Windows**: `%APPDATA%\app\data\`
- **Linux**: `~/.local/share/app/data/`

### Available Data Files

The following JSON files are automatically copied to the data directory:

- `board-saveAdvice.json` - Board Save Advice (ADVICE) data
- `board-savePDD.json` - Board Save PDD data

## Accessing the Data

### Through the App
- Use the **"Open Data Folder"** button in the Demo Page to open the data directory in your file explorer
- The app automatically reads from the local data directory instead of the public folder

### Direct File Access
You can directly access and modify the JSON files in the data directory:

1. Click the **"Open Data Folder"** button in the app
2. Navigate to the opened folder
3. Edit the JSON files as needed
4. The app will read the updated files on the next data load

## Data Management

### Automatic Updates
- The app only copies files if they don't already exist in the data directory
- Existing files are preserved and not overwritten
- You can manually replace files in the data directory

### File Structure
The JSON files contain board data with the following structure:
```json
{
  "columns": {
    "4.1": [...],
    "4.2": [...],
    "4.3": [...],
    "4.4": [...],
    "4.5IP": [...],
    "uncommitted": [...]
  }
}
```

## Technical Details

### Tauri Commands
The following Tauri commands are available for data management:

- `initialize_data_directory()` - Creates the data directory
- `copy_json_files_to_data_directory()` - Copies JSON files from resources
- `read_json_file_from_data_directory(file_name)` - Reads a JSON file
- `list_data_directory_files()` - Lists all JSON files
- `open_data_directory()` - Opens the data directory in file explorer
- `get_data_directory_path()` - Gets the path to the data directory

### Frontend Integration
The app uses the `localDataService.ts` module to interact with the local data system:

- `initializeDataSystem()` - Initializes the entire data system
- `loadDataSource(sourceKey)` - Loads data from a specific source
- `openDataDirectory()` - Opens the data directory
- `getDataDirectoryPath()` - Gets the data directory path

## Benefits

1. **Persistent Storage** - Data persists between app updates
2. **User Control** - Users can directly access and modify data files
3. **Platform Independence** - Works consistently across all platforms
4. **Automatic Setup** - No manual configuration required
5. **Backup Friendly** - Easy to backup and restore data

## Troubleshooting

### Data Not Loading
If data is not loading properly:

1. Check if the data directory exists
2. Verify that JSON files are present in the data directory
3. Check the browser console for error messages
4. Try clicking the "Open Data Folder" button to verify the location

### Missing Files
If JSON files are missing:

1. The app will attempt to copy them from the original resources
2. If that fails, you may need to manually copy files from the app's public directory
3. Check the app logs for any error messages during initialization

### Permission Issues
If you encounter permission issues:

1. Ensure the app has write permissions to the application data directory
2. On macOS, check System Preferences > Security & Privacy
3. On Windows, run the app as administrator if needed
4. On Linux, check file permissions in the data directory 