Jira Dashboard - Windows Installation Guide
===========================================

Version: 1.1.1

REQUIREMENTS:
- Windows 10 (version 1803+) or Windows 11
- No additional software installation required

INSTALLATION:
1. Extract all files from the ZIP to a folder of your choice
   (e.g., C:\Program Files\Jira Dashboard or your Desktop)

2. Make sure both files are in the same folder:
   - app.exe
   - WebView2Loader.dll

3. Double-click "app.exe" to run the application

IMPORTANT NOTES:
- Keep both files (app.exe and WebView2Loader.dll) in the same folder
- You can create a shortcut to app.exe on your desktop for easy access
- The app will create a configuration folder at: %APPDATA%\jira-dashboard

FIRST TIME SETUP:
1. When you first run the app, you'll need to configure your Jira connection:
   - Click the settings/configuration button
   - Enter your Jira URL (e.g., https://yourcompany.atlassian.net)
   - Enter your email address
   - Enter your Jira API token (create one at: https://id.atlassian.com/manage-profile/security/api-tokens)

TROUBLESHOOTING:
- If the app won't start, make sure both files are in the same folder
- If you see an error about WebView2, you may need to install Microsoft Edge WebView2 Runtime:
  https://developer.microsoft.com/microsoft-edge/webview2/

SUPPORT:
For issues or questions, please contact your development team.

