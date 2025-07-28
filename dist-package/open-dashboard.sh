#!/bin/bash

echo "Opening Jira Dashboard..."
echo ""
echo "If the dashboard doesn't open automatically, please:"
echo "1. Double-click on 'standalone.html'"
echo "2. Or drag 'standalone.html' into your web browser"
echo ""

# Try to open with default browser
if command -v open >/dev/null 2>&1; then
    # macOS
    open standalone.html
elif command -v xdg-open >/dev/null 2>&1; then
    # Linux
    xdg-open standalone.html
elif command -v sensible-browser >/dev/null 2>&1; then
    # Debian/Ubuntu
    sensible-browser standalone.html
else
    echo "Could not automatically open browser."
    echo "Please manually open 'standalone.html' in your web browser."
fi

echo "Dashboard should now be opening in your default browser."
echo ""
read -p "Press Enter to continue..." 