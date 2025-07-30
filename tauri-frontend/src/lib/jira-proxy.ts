// Tauri commands will be used for fetching data
// For now, we'll use the existing data service

async function fetchFromJiraDirectly(projectKey: string) {
  // TODO: Implement when Tauri is properly configured
  console.log('Fetching from Jira for project:', projectKey);
  return { issues: [], total: 0 };
}

export async function getAllIssuesWithFields(projectKey: string, _useCache = true, onBatch?: (batch: any[]) => void) {
  try {
    // For now, always fetch live data through Tauri
    // You can implement caching later if needed
    const jiraData = await fetchFromJiraDirectly(projectKey);
    if (onBatch && Array.isArray(jiraData.issues)) {
      onBatch(jiraData.issues);
    }
    return jiraData;
  } catch (error) {
    console.error('Error fetching issues:', error);
    throw error;
  }
}

export async function getAllProjectIssues(_boardName?: string) { 
  return []; 
}

export async function getProjectIssues(projectKey?: string) { 
  if (!projectKey) return { issues: [] };
  // TODO: Implement when Tauri is properly configured
  console.log('Getting project issues for:', projectKey);
  return { issues: [] };
}

export async function getProjectData(projectKey?: string) { 
  if (!projectKey) return {};
  // TODO: Implement when Tauri is properly configured
  console.log('Getting project data for:', projectKey);
  return {};
}

export async function getTeamMembers(_teamKey?: string) { 
  return { values: [] }; 
} 