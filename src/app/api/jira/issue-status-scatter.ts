import { NextRequest, NextResponse } from 'next/server';

function getJiraAuthHeaders() {
  const base64 = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
  return {
    'Authorization': `Basic ${base64}`,
    'Accept': 'application/json',
  };
}

// Helper to fetch all issues for a project (paginated, with changelog)
async function fetchAllIssuesWithChangelog(projectKey: string) {
  let startAt = 0;
  const maxResults = 50;
  let issues: any[] = [];
  let total = 0;
  do {
    const res = await fetch(
      `${process.env.JIRA_BASE_URL}/rest/api/3/search?jql=project=${projectKey}&fields=key,status,created&expand=changelog&startAt=${startAt}&maxResults=${maxResults}`,
      { headers: getJiraAuthHeaders() }
    );
    if (!res.ok) throw new Error('Failed to fetch issues');
    const data = await res.json();
    issues = issues.concat(data.issues);
    total = data.total;
    startAt += maxResults;
  } while (issues.length < total);
  return issues;
}

// For each issue, find the current status and how long it's been in that status
function getStatusAndDaysInStatus(issue: any) {
  const changelog = issue.changelog?.histories || [];
  let lastStatus = issue.fields.status?.name || 'Unknown';
  let lastStatusTime = new Date(issue.fields.created).getTime();
  for (const history of changelog) {
    for (const item of history.items) {
      if (item.field === 'status') {
        if (item.toString) {
          lastStatus = item.toString;
          lastStatusTime = new Date(history.created).getTime();
        }
      }
    }
  }
  const now = Date.now();
  const daysInStatus = (now - lastStatusTime) / (1000 * 60 * 60 * 24);
  return {
    key: issue.key,
    status: lastStatus,
    daysInStatus: Math.round(daysInStatus * 10) / 10,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectKey = searchParams.get('project') || 'JPP';
  try {
    const issues = await fetchAllIssuesWithChangelog(projectKey);
    const result = issues.map(getStatusAndDaysInStatus);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 