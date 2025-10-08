#!/bin/bash

# Script to trigger Windows build workflow using GitHub API
echo "🚀 Triggering Windows build workflow via GitHub API..."

# Repository details
REPO="DSmithMagMutual/VisualizationDashboard"
WORKFLOW_FILE="build-windows.yml"

# Determine branch to build: use current git branch, or fallback
if command -v git >/dev/null 2>&1; then
  CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
fi
BRANCH=${CURRENT_BRANCH:-"Demo-Just-Tauri"}

echo "🧭 Target branch: $BRANCH"

# Prepare auth header if GH_TOKEN is provided
AUTH_HEADER=""
if [ -n "$GH_TOKEN" ]; then
  AUTH_HEADER="-H Authorization: Bearer $GH_TOKEN"
  echo "🔐 Using GH_TOKEN for authenticated API request"
else
  echo "⚠️  No GH_TOKEN detected. The GitHub API may reject unauthenticated dispatches."
  echo "   Export a token with repo:actions scope to proceed non-interactively:"
  echo "   export GH_TOKEN=YOUR_TOKEN_HERE"
fi

# Check if we can access the repository
echo "📡 Checking repository access..."
if ! curl -s $AUTH_HEADER "https://api.github.com/repos/$REPO" | grep -vq "Not Found"; then
  : # continue; some private repos return limited data to unauthenticated requests
fi
echo "✅ Repository check attempted"

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
  $AUTH_HEADER \
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
  if [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    echo "   This usually indicates missing authentication or an incorrect workflow file/branch."
    echo "   Ensure GH_TOKEN is set and has repo and workflow scopes, and that '$WORKFLOW_FILE' exists on '$BRANCH'."
  fi
  echo "Response: $RESPONSE_BODY"
  echo ""
  echo "💡 Manual trigger instructions:"
  echo "1. Go to: https://github.com/$REPO/actions"
  echo "2. Click 'Build Windows App' workflow"
  echo "3. Click 'Run workflow' button"
  echo "4. Select branch: $BRANCH"
  echo "5. Click 'Run workflow'"
fi