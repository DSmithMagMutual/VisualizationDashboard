/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_JIRA_BASE_URL: string
  readonly VITE_JIRA_EMAIL: string
  readonly VITE_JIRA_API_TOKEN: string
  readonly VITE_JIRA_BOARD_ID: string
  readonly VITE_JIRA_PROJECT_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 