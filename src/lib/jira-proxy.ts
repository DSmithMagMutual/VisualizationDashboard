import fs from 'fs';
import path from 'path';

// Remove all fs/path/cache logic from this file. Only keep Jira fetch logic.

async function fetchFromJiraDirectly(projectKey: string) {
  const maxResults = 1000;
  let startAt = 0;
  let allIssues: any[] = [];
  let total = 0;
  let parentKeys = new Set<string>();
  // First pass: fetch all issues for the project
  do {
    const res = await fetch(`/api/jira?endpoint=search&jql=project=${projectKey} ORDER BY rank ASC&startAt=${startAt}&maxResults=${maxResults}&fields=summary,status,issuetype,parent,customfield_10014,assignee,customfield_10001`);
    if (!res.ok) throw new Error('Failed to fetch issues from Jira');
    const data = await res.json();
    if (data.issues) {
      allIssues = allIssues.concat(data.issues);
      // Collect parent keys from children
      data.issues.forEach((issue: any) => {
        const parentKey = issue.fields.parent?.key;
        if (parentKey) parentKeys.add(parentKey);
      });
    }
    total = data.total || 0;
    startAt += maxResults;
  } while (allIssues.length < total);
  // Second pass: fetch any missing parents
  const existingKeys = new Set(allIssues.map(i => i.key));
  const missingParentKeys = Array.from(parentKeys).filter(k => !existingKeys.has(k));
  if (missingParentKeys.length > 0) {
    // Fetch missing parents in batches of 50 (Jira JQL limit)
    for (let i = 0; i < missingParentKeys.length; i += 50) {
      const batch = missingParentKeys.slice(i, i + 50);
      const jql = `key in (${batch.map(k => `'${k}'`).join(',')})`;
      const res = await fetch(`/api/jira?endpoint=search&jql=${encodeURIComponent(jql)}&fields=summary,status,issuetype,parent,customfield_10014,assignee,customfield_10001`);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.issues) {
        allIssues = allIssues.concat(data.issues);
      }
    }
  }
  return { issues: allIssues, total: allIssues.length };
}

export async function getAllIssuesWithFields(projectKey: string, useCache = true, onBatch?: (batch: any[]) => void) {
  const res = await fetch(`/api/jira-cache?projectKey=${projectKey}&useCache=${useCache ? '1' : '0'}`);
  if (res.ok) {
    const data = await res.json();
    if (onBatch && Array.isArray(data.issues)) onBatch(data.issues);
    return data;
  }
  if (res.status === 404) {
    // Cache miss: fetch from Jira, then POST to cache
    const jiraData = await fetchFromJiraDirectly(projectKey);
    await fetch('/api/jira-cache', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issues: jiraData.issues }),
    });
    if (onBatch && Array.isArray(jiraData.issues)) onBatch(jiraData.issues);
    return jiraData;
  }
  throw new Error('Failed to fetch issues (cache API)');
} 