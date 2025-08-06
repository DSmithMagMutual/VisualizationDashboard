import { invoke } from '@tauri-apps/api/core';

export interface JiraConfig {
  base_url: string;
  email: string;
  api_token: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    status: {
      name: string;
    };
    issuetype: {
      name: string;
    };
    assignee?: {
      displayName: string;
    };
    parent?: {
      key: string;
    };
    customfield_10014?: string; // Team field
    customfield_10001?: string; // Sprint field
    issuelinks?: {
      id: string;
      type: {
        id: string;
        name: string;
        inward: string;
        outward: string;
      };
      outwardIssue?: {
        key: string;
        fields: {
          summary: string;
          status: {
            name: string;
          };
          issuetype: {
            name: string;
          };
        };
      };
      inwardIssue?: {
        key: string;
        fields: {
          summary: string;
          status: {
            name: string;
          };
          issuetype: {
            name: string;
          };
        };
      };
    }[];
  };
}

export interface JiraResponse {
  issues: JiraIssue[];
  total: number;
}

export interface BoardData {
  columns: {
    [key: string]: any[];
  };
  lastUpdated?: string;
  source?: 'jira' | 'static';
  projectKey?: string;
}

// Test Jira connection
export async function testJiraConnection(config: JiraConfig): Promise<{ success: boolean; message: string }> {
  try {
    const result = await invoke('test_jira_connection', { config });
    return result as { success: boolean; message: string };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Save Jira configuration
export async function saveJiraConfig(config: JiraConfig): Promise<void> {
  try {
    await invoke('save_jira_config', { config });
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to save configuration');
  }
}

// Load Jira configuration
export async function loadJiraConfig(): Promise<JiraConfig | null> {
  try {
    const result = await invoke('load_jira_config');
    return result as JiraConfig | null;
  } catch (error) {
    console.error('Failed to load Jira config:', error);
    return null;
  }
}

// Fetch Jira data for a project
export async function fetchJiraData(config: JiraConfig, projectKey: string): Promise<JiraResponse> {
  try {
    const result = await invoke('fetch_jira_data', { config, projectKey });
    return result as JiraResponse;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch Jira data');
  }
}

// Transform Jira data to board format
export function transformJiraDataToBoard(jiraData: JiraResponse, projectKey?: string): BoardData {
  const boardData: BoardData = {
    columns: {
      '4.1': [],
      '4.2': [],
      '4.3': [],
      '4.4': [],
      '4.5IP': [],
      'uncommitted': []
    },
    lastUpdated: new Date().toISOString(),
    source: 'jira',
    projectKey
  };

  // Group issues by sprint/iteration
  const issuesBySprint: { [key: string]: JiraIssue[] } = {};
  
  jiraData.issues.forEach(issue => {
    const sprint = issue.fields.customfield_10001 || 'uncommitted';
    if (!issuesBySprint[sprint]) {
      issuesBySprint[sprint] = [];
    }
    issuesBySprint[sprint].push(issue);
  });

  // Transform issues into board cards
  Object.entries(issuesBySprint).forEach(([sprint, issues]) => {
    const columnKey = mapSprintToColumn(sprint);
    
    // Group issues by parent (epics)
    const issuesByParent: { [key: string]: JiraIssue[] } = {};
    issues.forEach(issue => {
      const parentKey = issue.fields.parent?.key || issue.key;
      if (!issuesByParent[parentKey]) {
        issuesByParent[parentKey] = [];
      }
      issuesByParent[parentKey].push(issue);
    });

    // Create board cards
    Object.entries(issuesByParent).forEach(([parentKey, childIssues]) => {
      const parentIssue = childIssues.find(issue => issue.key === parentKey) || childIssues[0];
      
      const card = {
        id: parentKey,
        title: parentIssue.fields.summary,
        team: parentIssue.fields.customfield_10014 || 'Unknown Team',
        stories: childIssues.map(issue => {
          // Process relationship data
          const relationships = {
            relatesTo: [] as string[],
            blocks: [] as string[],
            blockedBy: [] as string[]
          };

          if (issue.fields.issuelinks) {
            issue.fields.issuelinks.forEach(link => {
              const relatedIssue = link.outwardIssue || link.inwardIssue;
              if (relatedIssue) {
                const relationshipType = link.type.name.toLowerCase();
                const issueKey = relatedIssue.key;
                
                if (relationshipType.includes('relates to') || relationshipType.includes('related')) {
                  relationships.relatesTo.push(issueKey);
                } else if (relationshipType.includes('blocks')) {
                  if (link.outwardIssue) {
                    relationships.blocks.push(issueKey);
                  } else {
                    relationships.blockedBy.push(issueKey);
                  }
                } else if (relationshipType.includes('blocked by')) {
                  if (link.outwardIssue) {
                    relationships.blockedBy.push(issueKey);
                  } else {
                    relationships.blocks.push(issueKey);
                  }
                }
              }
            });
          }

          return {
            id: issue.key,
            title: issue.fields.summary,
            status: issue.fields.status.name,
            type: issue.fields.issuetype.name,
            assignee: issue.fields.assignee?.displayName || 'Unassigned',
            team: issue.fields.customfield_10014 || 'Unknown Team',
            relationships
          };
        })
      };

      if (!boardData.columns[columnKey]) {
        boardData.columns[columnKey] = [];
      }
      boardData.columns[columnKey].push(card);
    });
  });

  return boardData;
}

// Map sprint names to column keys
function mapSprintToColumn(sprint: string): string {
  const sprintLower = sprint.toLowerCase();
  
  if (sprintLower.includes('4.1') || sprintLower.includes('iteration 4.1')) return '4.1';
  if (sprintLower.includes('4.2') || sprintLower.includes('iteration 4.2')) return '4.2';
  if (sprintLower.includes('4.3') || sprintLower.includes('iteration 4.3')) return '4.3';
  if (sprintLower.includes('4.4') || sprintLower.includes('iteration 4.4')) return '4.4';
  if (sprintLower.includes('4.5ip') || sprintLower.includes('iteration 4.5ip')) return '4.5IP';
  
  return 'uncommitted';
}

// Fetch and transform Jira data for a project
export async function fetchAndTransformJiraData(projectKey: string): Promise<BoardData> {
  const config = await loadJiraConfig();
  if (!config) {
    throw new Error('Jira configuration not found. Please configure Jira settings first.');
  }

  const jiraData = await fetchJiraData(config, projectKey);
  return transformJiraDataToBoard(jiraData, projectKey);
}

// Fetch individual card data from Jira
export async function fetchCardData(issueKey: string): Promise<any> {
  const config = await loadJiraConfig();
  if (!config) {
    throw new Error('Jira configuration not found. Please configure Jira settings first.');
  }

  try {
    const result = await invoke('fetch_card_data', { config, issueKey });
    return result;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch card data');
  }
}

// Save board data to JSON file
export async function saveBoardData(boardData: any, fileName: string): Promise<void> {
  try {
    await invoke('save_board_data', { boardData, fileName });
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to save board data');
  }
}

// Load saved board data from JSON file
export async function loadBoardData(fileName: string): Promise<any | null> {
  try {
    const result = await invoke('load_board_data', { fileName });
    return result;
  } catch (error) {
    console.error('Failed to load board data:', error);
    return null;
  }
} 