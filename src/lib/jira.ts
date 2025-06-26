import axios from 'axios';

interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
}

class JiraClient {
  private baseUrl: string;
  private auth: string;

  constructor(config: JiraConfig) {
    // Remove any trailing slashes and /rest/api/3 from the base URL
    this.baseUrl = config.baseUrl.replace(/\/rest\/api\/3\/?$/, '').replace(/\/$/, '');
    this.auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
    
    // Log configuration (without sensitive data)
    console.log('Jira Client initialized with:', {
      baseUrl: this.baseUrl,
      email: config.email,
      hasToken: !!config.apiToken,
      authHeader: `Basic ${this.auth.substring(0, 10)}...`
    });
  }

  private async request(endpoint: string, params: any = {}) {
    try {
      // Remove leading slash from endpoint if present
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
      
      // Construct the full URL
      const fullUrl = `${this.baseUrl}/rest/api/3/${cleanEndpoint}`;
      
      // Log request details
      console.log('Making Jira API request:', {
        url: fullUrl,
        endpoint,
        params,
        headers: {
          'Authorization': 'Basic [REDACTED]',
          'Accept': 'application/json'
        }
      });
      
      const response = await axios.get(fullUrl, {
        headers: {
          'Authorization': `Basic ${this.auth}`,
          'Accept': 'application/json'
        },
        params
      });

      console.log('Jira API response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Jira API Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          method: error.config?.method,
          baseURL: error.config?.baseURL,
          headers: {
            ...error.config?.headers,
            'Authorization': '[REDACTED]'
          }
        });
      }
      throw error;
    }
  }

  // Sprint related functions
  async getActiveSprint(boardId: number) {
    return this.request(`agile/1.0/board/${boardId}/sprint`, {
      state: 'active'
    });
  }

  async getSprintIssues(sprintId: number) {
    return this.request(`agile/1.0/sprint/${sprintId}/issue`, {
      fields: 'summary,status,assignee,priority,issuetype,storypoints'
    });
  }

  // Board related functions
  async getBoards() {
    return this.request('agile/1.0/board');
  }

  // Project related functions
  async getProjects() {
    return this.request('project');
  }

  // Team related functions
  async getTeamMembers(projectKey: string) {
    return this.request('user/assignable/search', {
      project: projectKey
    });
  }

  // Issue related functions
  async getIssuesByJQL(jql: string) {
    return this.request('search', {
      jql,
      fields: 'summary,status,assignee,priority,issuetype,storypoints,created,updated'
    });
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