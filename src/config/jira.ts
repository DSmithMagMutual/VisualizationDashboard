export const jiraConfig = {
  baseUrl: import.meta.env.VITE_JIRA_BASE_URL || '',
  email: import.meta.env.VITE_JIRA_EMAIL || '',
  apiToken: import.meta.env.VITE_JIRA_API_TOKEN || '',
  boardId: parseInt(import.meta.env.VITE_JIRA_BOARD_ID || '0'),
  projectKey: import.meta.env.VITE_JIRA_PROJECT_KEY || ''
}; 