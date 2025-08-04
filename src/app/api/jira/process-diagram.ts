import { NextRequest, NextResponse } from 'next/server';

function getJiraAuthHeaders() {
  const base64 = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
  return {
    'Authorization': `Basic ${base64}`,
    'Accept': 'application/json',
  };
}

// Helper to fetch all issues for a project (paginated)
async function fetchAllIssues(projectKey: string) {
  let startAt = 0;
  const maxResults = 50;
  let issues: any[] = [];
  let total = 0;
  do {
    const res = await fetch(
      `${process.env.JIRA_BASE_URL}/rest/api/3/search?jql=project=${projectKey}&fields=key&expand=changelog&startAt=${startAt}&maxResults=${maxResults}`,
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

// Helper to extract status transitions from changelog
function extractTransitions(issue: any) {
  const transitions: { from: string; to: string; time: number }[] = [];
  let lastStatus = null;
  let lastTime = new Date(issue.fields.created).getTime();
  for (const history of issue.changelog.histories) {
    for (const item of history.items) {
      if (item.field === 'status') {
        const from = item.fromString || lastStatus || 'Created';
        const to = item.toString;
        const time = new Date(history.created).getTime();
        transitions.push({ from, to, time });
        lastStatus = to;
        lastTime = time;
      }
    }
  }
  return transitions;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectKey = searchParams.get('project') || 'JPP';
  try {
    const issues = await fetchAllIssues(projectKey);
    const nodeCounts: Record<string, number> = {};
    const edgeStats: Record<string, { count: number; totalDuration: number }> = {};
    for (const issue of issues) {
      let prevStatus = 'Created';
      let prevTime = new Date(issue.fields.created).getTime();
      for (const history of issue.changelog.histories) {
        for (const item of history.items) {
          if (item.field === 'status') {
            const toStatus = item.toString;
            const time = new Date(history.created).getTime();
            // Node count
            nodeCounts[toStatus] = (nodeCounts[toStatus] || 0) + 1;
            // Edge stats
            const edgeKey = `${prevStatus}->${toStatus}`;
            const duration = (time - prevTime) / (1000 * 60 * 60 * 24); // days
            if (!edgeStats[edgeKey]) edgeStats[edgeKey] = { count: 0, totalDuration: 0 };
            edgeStats[edgeKey].count += 1;
            edgeStats[edgeKey].totalDuration += duration;
            // Prepare for next
            prevStatus = toStatus;
            prevTime = time;
          }
        }
      }
      // Final node (current status)
      nodeCounts[prevStatus] = (nodeCounts[prevStatus] || 0) + 1;
    }
    // Format nodes and edges
    const nodes = Object.entries(nodeCounts).map(([id, count]) => ({ id, count }));
    const edges = Object.entries(edgeStats).map(([key, val]) => {
      const [source, target] = key.split('->');
      return {
        source,
        target,
        count: val.count,
        avgDurationDays: Math.round((val.totalDuration / val.count) * 10) / 10,
      };
    });
    return NextResponse.json({ nodes, edges });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
} 