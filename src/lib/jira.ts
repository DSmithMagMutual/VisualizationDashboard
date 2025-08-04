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
    // Clean up the base URL
    this.baseUrl = config.baseUrl
      .replace(/\/rest\/api\/3\/?$/, '')  // Remove /rest/api/3 if present
      .replace(/\/$/, '');                // Remove trailing slash
    
    // Use browser-compatible base64 encoding
    this.auth = btoa(`${config.email}:${config.apiToken}`);
    
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
      const url = `${this.baseUrl}/${cleanEndpoint}`;
      
      // Log request details
      console.log('Making direct Jira API request:', {
        url,
        endpoint: cleanEndpoint,
        params
      });
      
      const response = await axios.get(url, {
        params,
        headers: {
          'Authorization': `Basic ${this.auth}`,
          'Accept': 'application/json'
        },
        timeout: 10000
      });

      console.log('Jira API response:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Log detailed error information
        console.error('Jira API Error:', {
          message: error.message,
          code: error.code,
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url
        });

        // Handle specific error cases
        if (error.code === 'ECONNREFUSED') {
          throw new Error('Could not connect to Jira. Please check if the server is accessible and your network connection.');
        } else if (error.code === 'ETIMEDOUT') {
          throw new Error('Connection to Jira timed out. Please check your network connection.');
        } else if (error.response?.status === 404) {
          throw new Error(`Jira API endpoint not found: ${endpoint}. Please check your endpoint.`);
        } else if (error.response?.status === 401) {
          throw new Error('Authentication failed. Please check your email and API token.');
        } else if (error.response?.status === 403) {
          throw new Error('Access forbidden. Please check your API token permissions.');
        } else if (!error.response) {
          throw new Error(`Network error: ${error.message}. Please check your network connection.`);
        }
      }
      throw error;
    }
  }

  // Test connection with a simple endpoint
  async testConnection() {
    return this.request('rest/api/2/myself');
  }

  // Sprint related functions
  async getActiveSprint(boardId: number) {
    return this.request('rest/agile/1.0/board/' + boardId + '/sprint', {
      state: 'active'
    });
  }

  async getSprintIssues(sprintId: number) {
    return this.request('rest/agile/1.0/sprint/' + sprintId + '/issue', {
      fields: 'summary,status,assignee,priority,issuetype,storypoints'
    });
  }

  // Board related functions
  async getBoards() {
    return this.request('rest/agile/1.0/board');
  }

  // Project related functions
  async getProjects() {
    return this.request('rest/api/2/project');
  }

  // Team related functions
  async getTeamMembers(projectKey: string) {
    return this.request('rest/api/2/user/assignable/search', {
      project: projectKey
    });
  }

  // Issue related functions
  async getIssuesByJQL(jql: string) {
    return this.request('rest/api/2/search', {
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