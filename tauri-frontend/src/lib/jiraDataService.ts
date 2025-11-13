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
    customfield_12078?: number; // Story Points
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
      
      // Sum story points across child issues (and include parent if it has points)
      const parentStoryPoints = typeof parentIssue.fields.customfield_12078 === 'number' ? parentIssue.fields.customfield_12078 : 0;
      const childrenStoryPoints = childIssues
        .filter(ci => ci.key !== parentIssue.key)
        .reduce((sum, ci) => {
          const sp = typeof ci.fields.customfield_12078 === 'number' ? ci.fields.customfield_12078 : 0;
          return sum + sp;
        }, 0);
      const totalStoryPoints = parentStoryPoints + childrenStoryPoints;
      
      const card = {
        id: parentKey,
        title: parentIssue.fields.summary,
        team: parentIssue.fields.customfield_10014 || 'Unknown Team',
        storyPoints: Number.isFinite(totalStoryPoints) && totalStoryPoints > 0 ? totalStoryPoints : undefined,
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
            storyPoints: typeof issue.fields.customfield_12078 === 'number' ? issue.fields.customfield_12078 : undefined,
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

// Fetch child issues for a parent card
export async function fetchChildIssues(parentKey: string): Promise<any> {
  const config = await loadJiraConfig();
  if (!config) {
    throw new Error('Jira configuration not found. Please configure Jira settings first.');
  }

  try {
    const result = await invoke('fetch_child_issues', { config, parentKey });
    return result;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch child issues');
  }
}

// Save board data to JSON file (private directory - deprecated)
export async function saveBoardData(boardData: any, fileName: string): Promise<void> {
  try {
    await invoke('save_board_data', { boardData, fileName });
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to save board data');
  }
}

// Save board data to Downloads directory
export async function saveBoardDataToPublic(boardData: any, fileName: string): Promise<string> {
  try {
    // Use Tauri command to save to Downloads directory
    const filePath = await invoke<string>('save_board_data_to_public', { boardData, fileName });
    return filePath;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to save board data to Downloads');
  }
}

// Log action to board-specific log file
export async function logBoardAction(
  boardKey: string,
  action: 'add_card' | 'delete_card' | 'move_card' | 'rename_iteration' | 'change_iteration_date',
  data: {
    cardKey?: string;
    cardSummary?: string;
    fromIteration?: string;
    toIteration?: string;
    iterationKey?: string;
    oldValue?: string;
    newValue?: string;
    [key: string]: any;
  }
): Promise<void> {
  try {
    // Get log file name based on board key
    const logFileName = `${boardKey}-log.json`;
    
    // Read existing logs
    let logs: Array<{
      timestamp: string;
      action: string;
      data: any;
    }> = [];
    
    try {
      const existingLogs = await invoke<any>('load_board_data', { fileName: logFileName });
      if (existingLogs && Array.isArray(existingLogs)) {
        logs = existingLogs;
      }
    } catch (error) {
      // Log file doesn't exist yet, start with empty array
      console.log(`Creating new log file: ${logFileName}`);
    }
    
    // Add new log entry
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      data
    };
    
    logs.push(logEntry);
    
    // Save updated logs
    await invoke('save_board_data_to_public', { 
      boardData: logs, 
      fileName: logFileName 
    });
    
    console.log(`Logged action: ${action} for board ${boardKey}`);
  } catch (error) {
    console.error(`Failed to log action for board ${boardKey}:`, error);
    // Don't throw - logging failures shouldn't break the app
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

// Test function to check a specific child issue
export async function testChildIssue(parentKey: string, childKey: string): Promise<any> {
  const config = await loadJiraConfig();
  if (!config) {
    throw new Error('Jira configuration not found. Please configure Jira settings first.');
  }

  try {
    const result = await invoke('test_child_issue_query', { config, parentKey, childKey });
    return result;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to test child issue');
  }
}

// Create a new sub-task
export async function createSubtask(parentKey: string, summary: string, description?: string, assigneeEmail?: string, priority?: string): Promise<any> {
  const config = await loadJiraConfig();
  if (!config) {
    throw new Error('Jira configuration not found. Please configure Jira settings first.');
  }

  try {
    const result = await invoke('create_subtask', { 
      config, 
      parentKey, 
      summary, 
      description: description || null, 
      assigneeEmail: assigneeEmail || null, 
      priority: priority || null 
    });
    return result;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to create sub-task');
  }
}

// Get issue with its children
export async function getIssueWithChildren(issueKey: string): Promise<any> {
  const config = await loadJiraConfig();
  if (!config) {
    throw new Error('Jira configuration not found. Please configure Jira settings first.');
  }

  try {
    const result = await invoke('get_issue_with_children', { config, issueKey });
    return result;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch issue with children');
  }
}

// Update a sub-task
export async function updateSubtask(subtaskKey: string, summary?: string, description?: string, assigneeEmail?: string, priority?: string): Promise<void> {
  const config = await loadJiraConfig();
  if (!config) {
    throw new Error('Jira configuration not found. Please configure Jira settings first.');
  }

  try {
    await invoke('update_subtask', { 
      config, 
      subtaskKey, 
      summary: summary || null, 
      description: description || null, 
      assigneeEmail: assigneeEmail || null, 
      priority: priority || null 
    });
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to update sub-task');
  }
} 