export async function getBoards() {
  const res = await fetch('/api/jira?endpoint=board');
  if (!res.ok) throw new Error('Failed to fetch boards');
  return res.json();
}

export async function getActiveSprint(boardId: number) {
  const res = await fetch(`/api/jira?endpoint=board/${boardId}/sprint&state=active`);
  if (!res.ok) throw new Error('Failed to fetch active sprint');
  return res.json();
}

export async function getSprintIssues(sprintId: number) {
  const res = await fetch(`/api/jira?endpoint=sprint/${sprintId}/issue`);
  if (!res.ok) throw new Error('Failed to fetch sprint issues');
  return res.json();
}

export async function getProjectIssues(projectKey: string) {
  const res = await fetch(`/api/jira?endpoint=search&jql=project=${projectKey}&maxResults=100`);
  if (!res.ok) throw new Error('Failed to fetch project issues');
  return res.json();
}

export async function getProjectData(projectKey: string) {
  const res = await fetch(`/api/jira?endpoint=project/${projectKey}`);
  if (!res.ok) throw new Error('Failed to fetch project data');
  return res.json();
}

export async function getTeamMembers(projectKey: string) {
  try {
    // Try to get project members first
    const res = await fetch(`/api/jira?endpoint=project/${projectKey}/role`);
    if (res.ok) {
      return res.json();
    }
  } catch (error) {
    console.warn('Failed to fetch project members, will extract from project issues');
  }
  
  // Fallback: return empty array - we'll extract team members from project issues
  return { values: [] };
} 