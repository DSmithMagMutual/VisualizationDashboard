import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Helper function to fetch and organize data for a project
async function fetchProjectData(projectKey: string) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const maxResults = 1000;
  let startAt = 0;
  let allIssues: any[] = [];
  let total = 0;
  let parentKeys = new Set<string>();
  
  // First pass: fetch all issues for the project
  do {
    // Use a simpler JQL query that's more likely to work across different projects
    const jql = `project = ${projectKey} ORDER BY created DESC`;
    const url = `${baseUrl}/api/jira?endpoint=search&jql=${encodeURIComponent(jql)}&startAt=${startAt}&maxResults=${maxResults}&fields=summary,status,issuetype,parent,customfield_10014,assignee,customfield_10001,issuelinks,subtasks`;
    
    console.log(`Fetching from: ${url}`);
    const res = await fetch(url);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Jira API error for ${projectKey}:`, res.status, errorText);
      throw new Error(`Failed to fetch issues from Jira for ${projectKey}: ${res.status} ${res.statusText}`);
    }
    
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
      const url = `${baseUrl}/api/jira?endpoint=search&jql=${encodeURIComponent(jql)}&fields=summary,status,issuetype,parent,customfield_10014,assignee,customfield_10001,issuelinks,subtasks`;
      
      try {
        const res = await fetch(url);
        if (!res.ok) {
          console.warn(`Failed to fetch parent batch for ${projectKey}:`, res.status, res.statusText);
          continue;
        }
        const data = await res.json();
        if (data.issues) {
          allIssues = allIssues.concat(data.issues);
        }
      } catch (error) {
        console.warn(`Error fetching parent batch for ${projectKey}:`, error);
        continue;
      }
    }
  }
  
  return allIssues;
}

// Helper function to organize issues into columns (iterations)
function organizeIssuesIntoColumns(issues: any[]) {
  const columns: Record<string, any[]> = {
    '4.1': [],
    '4.2': [],
    '4.3': [],
    '4.4': [],
    '4.5IP': [],
    'uncommitted': []
  };
  
  // Group issues by iteration (customfield_10014)
  issues.forEach(issue => {
    const iteration = issue.fields.customfield_10014 || 'uncommitted';
    const columnKey = iteration.toString();
    
    if (!columns[columnKey]) {
      columns[columnKey] = [];
    }
    
    // Extract relationship information
    const relationships = {
      blockedBy: [] as string[],
      blocks: [] as string[],
      related: [] as string[],
      subtasks: [] as string[]
    };
    
    // Process issue links
    if (issue.fields.issuelinks) {
      issue.fields.issuelinks.forEach((link: any) => {
        if (link.inwardIssue) {
          // This issue is blocked by the inward issue
          if (link.type.inward === 'is blocked by') {
            relationships.blockedBy.push(link.inwardIssue.key);
          } else {
            relationships.related.push(link.inwardIssue.key);
          }
        }
        if (link.outwardIssue) {
          // This issue blocks the outward issue
          if (link.type.outward === 'blocks') {
            relationships.blocks.push(link.outwardIssue.key);
          } else {
            relationships.related.push(link.outwardIssue.key);
          }
        }
      });
    }
    
    // Process subtasks
    if (issue.fields.subtasks) {
      issue.fields.subtasks.forEach((subtask: any) => {
        relationships.subtasks.push(subtask.key);
      });
    }
    
    // Create epic structure with relationships
    const epic = {
      key: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status.name,
      statusCategory: issue.fields.status.statusCategory.name,
      team: issue.fields.assignee?.displayName || 'Unassigned',
      url: `https://jira.atlassian.com/browse/${issue.key}`,
      relationships,
      stories: []
    };
    
    columns[columnKey].push(epic);
  });
  
  return columns;
}

export async function POST(request: NextRequest) {
  try {
    console.log('Starting full data refresh...');
    
    const publicDir = path.join(process.cwd(), 'public');
    const results: { [key: string]: any } = {};
    const errors: { [key: string]: string } = {};
    const filesUpdated: string[] = [];
    
    // Fetch data for each project individually to handle failures gracefully
    const projects = [
      { key: 'ADVICE', filename: 'board-saveAdvice.json' },
      { key: 'PDD', filename: 'board-savePDD.json' }
    ];
    
    for (const project of projects) {
      try {
        console.log(`Fetching data for project: ${project.key}`);
        const issues = await fetchProjectData(project.key);
        
        if (issues && issues.length > 0) {
          const columns = organizeIssuesIntoColumns(issues);
          
          // Save the data to JSON file
          await fs.writeFile(
            path.join(publicDir, project.filename),
            JSON.stringify({ columns }, null, 2)
          );
          
          results[project.key] = {
            issues: issues.length,
            columns: Object.keys(columns).length
          };
          filesUpdated.push(project.filename);
          
          console.log(`Successfully updated ${project.filename} with ${issues.length} issues`);
        } else {
          errors[project.key] = 'No issues found';
          console.log(`No issues found for project: ${project.key}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors[project.key] = errorMessage;
        console.error(`Failed to fetch data for project ${project.key}:`, errorMessage);
      }
    }
    
    // Check if we successfully updated at least one file
    if (filesUpdated.length === 0) {
      throw new Error('Failed to refresh any data. All projects failed.');
    }
    
    console.log('Data refresh completed');
    
    return NextResponse.json({
      success: true,
      message: `Data refreshed successfully. Updated ${filesUpdated.length} of ${projects.length} projects.`,
      timestamp: new Date().toISOString(),
      filesUpdated,
      results,
      errors: Object.keys(errors).length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error during data refresh:', error);
    return NextResponse.json(
      { 
        error: 'Failed to refresh data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 