// Tauri commands will be used for API calls
// For now, we'll provide placeholder implementations

class JiraClient {
  constructor() {
    console.log('Jira Client initialized - using Tauri backend for API calls');
  }

  // Test connection using Tauri backend
  async testConnection() {
    // TODO: Implement when Tauri is properly configured
    console.log('Testing connection - not yet implemented');
    return { success: true, message: 'Connection test not yet implemented' };
  }

  // Sprint related functions - using Tauri backend
  async getActiveSprint(_boardId: number) {
    // This would need to be implemented in the Tauri backend
    // For now, return empty data
    console.warn('getActiveSprint not yet implemented in Tauri backend');
    return { values: [] };
  }

  async getSprintIssues(_sprintId: number) {
    // This would need to be implemented in the Tauri backend
    console.warn('getSprintIssues not yet implemented in Tauri backend');
    return { issues: [] };
  }

  // Board related functions
  async getBoards() {
    // This would need to be implemented in the Tauri backend
    console.warn('getBoards not yet implemented in Tauri backend');
    return { values: [] };
  }

  // Project related functions
  async getProjects() {
    // This would need to be implemented in the Tauri backend
    console.warn('getProjects not yet implemented in Tauri backend');
    return [];
  }

  // Team related functions
  async getTeamMembers(_projectKey: string) {
    // This would need to be implemented in the Tauri backend
    console.warn('getTeamMembers not yet implemented in Tauri backend');
    return { values: [] };
  }

  // Issue related functions
  async getIssuesByJQL(_jql: string) {
    // This would need to be implemented in the Tauri backend
    console.warn('getIssuesByJQL not yet implemented in Tauri backend');
    return { issues: [] };
  }
}

// Data transformation functions
export const transformSprintData = (sprintData: any) => {
  const issues = sprintData.issues || [];
  return {
    completed: issues.filter((issue: any) => issue.fields.status.name === 'Done').length,
    inProgress: issues.filter((issue: any) => 
      ['In Progress', 'In Review'].includes(issue.fields.status.name)
    ).length,
    planned: issues.filter((issue: any) => 
      ['To Do', 'Backlog'].includes(issue.fields.status.name)
    ).length
  };
};

export const transformFeatureStatus = (issues: any[]) => {
  return {
    completed: issues.filter(issue => issue.fields.status.name === 'Done').length,
    inProgress: issues.filter(issue => 
      ['In Progress', 'In Review'].includes(issue.fields.status.name)
    ).length,
    blocked: issues.filter(issue => issue.fields.status.name === 'Blocked').length
  };
};

export const transformTeamMetrics = (issues: any[], teamMembers: any[]) => {
  const memberUtilization = teamMembers.map(member => {
    const assignedIssues = issues.filter(issue => 
      issue.fields.assignee?.emailAddress === member.emailAddress
    );
    return {
      name: member.displayName,
      value: (assignedIssues.length / issues.length) * 100
    };
  });

  return memberUtilization;
};

export default JiraClient; 