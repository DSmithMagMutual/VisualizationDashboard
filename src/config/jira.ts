export const jiraConfig = {
  baseUrl: process.env.NEXT_PUBLIC_JIRA_BASE_URL || '',
  email: process.env.NEXT_PUBLIC_JIRA_EMAIL || '',
  apiToken: process.env.NEXT_PUBLIC_JIRA_API_TOKEN || '',
  boardId: parseInt(process.env.NEXT_PUBLIC_JIRA_BOARD_ID || '0'),
  projectKey: process.env.NEXT_PUBLIC_JIRA_PROJECT_KEY || ''
}; 