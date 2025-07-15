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

export async function getAllProjectIssues(projectKey: string) {
  const maxResults = 1000;
  const firstRes = await fetch(`/api/jira?endpoint=search&jql=project=${projectKey}&startAt=0&maxResults=${maxResults}`);
  if (!firstRes.ok) throw new Error('Failed to fetch project issues');
  const firstData = await firstRes.json();
  let allIssues = firstData.issues;
  const total = firstData.total;

  if (total <= maxResults) return allIssues;

  // Calculate how many more pages we need
  const pages = [];
  for (let startAt = maxResults; startAt < total; startAt += maxResults) {
    pages.push(startAt);
  }

  // Fetch remaining pages in parallel, but limit concurrency
  const concurrency = 3;
  const results: any[] = [];
  for (let i = 0; i < pages.length; i += concurrency) {
    const batch = pages.slice(i, i + concurrency).map(startAt =>
      fetch(`/api/jira?endpoint=search&jql=project=${projectKey}&startAt=${startAt}&maxResults=${maxResults}`)
        .then(res => {
          if (!res.ok) throw new Error('Failed to fetch project issues');
          return res.json();
        })
        .then(data => data.issues)
    );
    const batchResults = await Promise.all(batch);
    results.push(...batchResults.flat());
  }

  return allIssues.concat(results);
}

export async function getProjectData(projectKey: string) {
  const res = await fetch(`/api/jira?endpoint=project/${projectKey}`);
  if (!res.ok) throw new Error('Failed to fetch project data');
  return res.json();
}

export async function getTeamMembers(projectKey: string) {
  let allUsers: any[] = [];
  let startAt = 0;
  const maxResults = 1000;
  let fetched = 0;

  while (true) {
    const res = await fetch(`/api/jira?endpoint=user/assignable/search&project=${projectKey}&startAt=${startAt}&maxResults=${maxResults}`);
    if (!res.ok) throw new Error('Failed to fetch assignable users');
    const data = await res.json();
    if (Array.isArray(data)) {
      allUsers = allUsers.concat(data);
      fetched = data.length;
      if (fetched < maxResults) break; // last page
      startAt += maxResults;
    } else {
      break; // Defensive: if Jira returns non-array, stop
    }
  }

  return allUsers;
} 