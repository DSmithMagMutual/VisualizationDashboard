// Version utility for the Tauri app
export const APP_VERSION = '1.1.1';

// Function to get version from package.json (for future use)
export const getAppVersion = async (): Promise<string> => {
  try {
    // In a Tauri app, we could potentially read this from the backend
    // For now, we'll return the hardcoded version
    return APP_VERSION;
  } catch (error) {
    console.warn('Could not load version from package.json:', error);
    return APP_VERSION;
  }
};

// Function to get version info for display
export const getVersionInfo = () => {
  return {
    version: APP_VERSION,
    buildDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
    environment: import.meta.env.MODE || 'development'
  };
}; 