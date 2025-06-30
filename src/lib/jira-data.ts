import { JiraUser, JiraIssue, JiraSearchResponse } from '../types/jira';

export interface ProcessedJiraData {
  userMetrics: {
    assignee: string;
    totalIssues: number;
    completedIssues: number;
    inProgressIssues: number;
    storyPoints: number;
    completedStoryPoints: number;
    averageResolutionTime: number;
    codeReviewCount: number;
    bugFixCount: number;
    techDebtCount: number;
  };
  teamMetrics: {
    teamName: string;
    totalIssues: number;
    completedIssues: number;
    averageResolutionTime: number;
    collaborationScore: number;
  }[];
  timeSeriesData: {
    month: string;
    completedIssues: number;
    storyPoints: number;
    codeReviews: number;
    bugFixes: number;
    techDebt: number;
  }[];
}

const calculateTimeSeriesData = (issues: JiraIssue[]): ProcessedJiraData['timeSeriesData'] => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentDate = new Date();
  const last6Months = months.slice(currentDate.getMonth() - 5, currentDate.getMonth() + 1);
  
  return last6Months.map(month => {
    const monthIssues = issues.filter(issue => {
      const issueDate = new Date(issue.fields.created);
      return months[issueDate.getMonth()] === month;
    });
    
    return {
      month,
      completedIssues: monthIssues.filter(issue => issue.fields.status.statusCategory.key === 'done').length,
      storyPoints: monthIssues.reduce((sum, issue) => sum + (issue.fields.customfield_10016 || 0), 0),
      codeReviews: monthIssues.filter(issue => issue.fields.issuetype.name === 'Code Review').length,
      bugFixes: monthIssues.filter(issue => issue.fields.issuetype.name === 'Bug').length,
      techDebt: monthIssues.filter(issue => issue.fields.labels.includes('tech-debt')).length
    };
  });
};

const calculateTeamMetrics = (issues: JiraIssue[]): ProcessedJiraData['teamMetrics'] => {
  const teams = new Set<string>();
  issues.forEach(issue => {
    issue.fields.components.forEach(component => {
      teams.add(component.name);
    });
  });
  
  return Array.from(teams).map(teamName => {
    const teamIssues = issues.filter(issue => 
      issue.fields.components.some(component => component.name === teamName)
    );
    
    const completedIssues = teamIssues.filter(issue => 
      issue.fields.status.statusCategory.key === 'done'
    );
    
    const resolutionTimes = completedIssues.map(issue => {
      const created = new Date(issue.fields.created);
      const resolved = new Date(issue.fields.resolutiondate || '');
      return (resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24); // Convert to days
    });
    
    const averageResolutionTime = resolutionTimes.length > 0
      ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
      : 0;
    
    return {
      teamName,
      totalIssues: teamIssues.length,
      completedIssues: completedIssues.length,
      averageResolutionTime,
      collaborationScore: Math.min(100, Math.round((completedIssues.length / teamIssues.length) * 100))
    };
  });
};

export const processJiraData = (jiraData: JiraSearchResponse): ProcessedJiraData => {
  const issues = jiraData.issues;
  const currentUser = issues[0]?.fields.assignee?.displayName || 'Current User';
  
  const userIssues = issues.filter(issue => 
    issue.fields.assignee?.displayName === currentUser
  );
  
  const completedIssues = userIssues.filter(issue => 
    issue.fields.status.statusCategory.key === 'done'
  );
  
  const inProgressIssues = userIssues.filter(issue => 
    issue.fields.status.statusCategory.key === 'indeterminate'
  );
  
  const storyPoints = userIssues.reduce((sum, issue) => 
    sum + (issue.fields.customfield_10016 || 0), 0
  );
  
  const completedStoryPoints = completedIssues.reduce((sum, issue) => 
    sum + (issue.fields.customfield_10016 || 0), 0
  );
  
  const resolutionTimes = completedIssues.map(issue => {
    const created = new Date(issue.fields.created);
    const resolved = new Date(issue.fields.resolutiondate || '');
    return (resolved.getTime() - created.getTime()) / (1000 * 60 * 60 * 24); // Convert to days
  });
  
  const averageResolutionTime = resolutionTimes.length > 0
    ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
    : 0;
  
  return {
    userMetrics: {
      assignee: currentUser,
      totalIssues: userIssues.length,
      completedIssues: completedIssues.length,
      inProgressIssues: inProgressIssues.length,
      storyPoints,
      completedStoryPoints,
      averageResolutionTime,
      codeReviewCount: userIssues.filter(issue => issue.fields.issuetype.name === 'Code Review').length,
      bugFixCount: userIssues.filter(issue => issue.fields.issuetype.name === 'Bug').length,
      techDebtCount: userIssues.filter(issue => issue.fields.labels.includes('tech-debt')).length
    },
    teamMetrics: calculateTeamMetrics(issues),
    timeSeriesData: calculateTimeSeriesData(userIssues)
  };
};

export const fetchJiraData = async (): Promise<ProcessedJiraData> => {
  try {
    // Fetch data from your Jira API endpoint
    const response = await fetch('/api/jira-proxy?endpoint=rest/api/2/search');
    const data = await response.json();
    
    // Process the raw Jira data
    return processJiraData(data);
  } catch (error) {
    console.error('Error fetching Jira data:', error);
    throw error;
  }
}; 