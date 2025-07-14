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
    // Get assignable users for the project
    const res = await fetch(`/api/jira?endpoint=user/assignable/search&project=${projectKey}`);
    if (res.ok) {
      const data = await res.json();
      // Return the array directly since assignable users endpoint returns an array
      return data;
    }
  } catch (error) {
    console.warn('Failed to fetch assignable users, will extract from project issues');
  }
  
  // Fallback: return empty array - we'll extract team members from project issues
  return [];
} 