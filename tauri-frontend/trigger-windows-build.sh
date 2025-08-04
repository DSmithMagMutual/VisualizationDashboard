#!/bin/bash

# Script to trigger Windows build workflow
echo "🚀 Triggering Windows build workflow..."

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "Please install it from: https://cli.github.com/"
    echo "Or manually trigger the workflow from GitHub Actions tab"
    exit 1
fi

# Trigger the workflow
gh workflow run build-windows.yml

if [ $? -eq 0 ]; then
    echo "✅ Windows build workflow triggered successfully!"
    echo "📊 Check the progress at: https://github.com/DSmithMagMutual/VisualizationDashboard/actions"
else
    echo "❌ Failed to trigger workflow"
    echo "💡 You can also manually trigger it from the GitHub Actions tab"
fi 