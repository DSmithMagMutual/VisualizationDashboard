#!/bin/bash

# Script to trigger Windows build workflow using GitHub API
echo "🚀 Triggering Windows build workflow via GitHub API..."

# Repository details
REPO="DSmithMagMutual/VisualizationDashboard"
WORKFLOW_FILE="build-windows.yml"
BRANCH="Demo-Tauri"

# Check if we can access the repository
echo "📡 Checking repository access..."
if curl -s "https://api.github.com/repos/$REPO" | grep -q "Not Found"; then
    echo "❌ Repository not found or not accessible"
    exit 1
fi

echo "✅ Repository accessible"

# Try to trigger the workflow
echo "🔨 Triggering workflow: $WORKFLOW_FILE on branch: $BRANCH"

# Create the workflow dispatch payload
PAYLOAD=$(cat <<EOF
{
  "ref": "$BRANCH"
}
EOF
)

# Trigger the workflow
RESPONSE=$(curl -s -w "%{http_code}" -X POST \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  "https://api.github.com/repos/$REPO/actions/workflows/$WORKFLOW_FILE/dispatches")

HTTP_CODE="${RESPONSE: -3}"
RESPONSE_BODY="${RESPONSE%???}"

if [ "$HTTP_CODE" = "204" ]; then
    echo "✅ Windows build workflow triggered successfully!"
    echo "📊 Check the progress at: https://github.com/$REPO/actions"
    echo "🔍 Look for 'Build Windows App' workflow"
else
    echo "❌ Failed to trigger workflow (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
    echo ""
    echo "💡 Manual trigger instructions:"
    echo "1. Go to: https://github.com/$REPO/actions"
    echo "2. Click 'Build Windows App' workflow"
    echo "3. Click 'Run workflow' button"
    echo "4. Select branch: $BRANCH"
    echo "5. Click 'Run workflow'"
fi 