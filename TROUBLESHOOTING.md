# Troubleshooting Dashboard Issues

## Infinite Loading Widgets

If your widgets are stuck in an infinite loading state, this is likely due to missing or incorrect Jira configuration.

### 1. Check Environment Variables

Create a `.env.local` file in your project root with the following variables:

```bash
# Your Jira instance URL (e.g., https://yourcompany.atlassian.net)
JIRA_BASE_URL=https://yourcompany.atlassian.net

# Your Jira email address
JIRA_EMAIL=your-email@company.com

# Your Jira API token (not your password)
# Generate this at: https://id.atlassian.com/manage-profile/security/api-tokens
JIRA_API_TOKEN=your-api-token-here
```

### 2. Generate Jira API Token

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Give it a name (e.g., "Dashboard API")
4. Copy the token and add it to your `.env.local` file

### 3. Verify Jira URL

Make sure your `JIRA_BASE_URL` is correct:
- For cloud instances: `https://yourcompany.atlassian.net`
- For server instances: `https://your-jira-server.com`

### 4. Check Browser Console

Open your browser's developer tools (F12) and check the Console tab for any error messages. The widgets now include better error reporting and will show specific error messages.

### 5. Test Jira Connection

Use the "Test Jira Connection" button on the dashboard to verify your configuration is working.

### 6. Restart Development Server

After adding environment variables, restart your development server:

```bash
npm run dev
```

### Common Error Messages

- **"Request timed out"**: Check your Jira URL and network connection
- **"Jira configuration not found"**: Missing environment variables
- **"No active board selected"**: Select a board from the dropdown
- **"No issues found"**: The selected project has no issues or you don't have access

### Debug Information

The widgets now include console logging to help debug issues. Check the browser console for:
- Project names being fetched
- API responses
- Error details

If you continue to have issues, check the browser console for specific error messages and ensure your Jira credentials have the necessary permissions to access the projects and boards. 