@echo off
echo Installing Jira Dashboard...
echo.

REM Create installation directory
set INSTALL_DIR=%PROGRAMFILES%\Jira Dashboard
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

REM Copy files
copy "app.exe" "%INSTALL_DIR%\"
copy "WebView2Loader.dll" "%INSTALL_DIR%\"

REM Create desktop shortcut
echo Creating desktop shortcut...
powershell "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\Jira Dashboard.lnk'); $Shortcut.TargetPath = '%INSTALL_DIR%\app.exe'; $Shortcut.Save()"

echo.
echo Installation complete!
echo You can now run Jira Dashboard from your desktop or Start menu.
pause 