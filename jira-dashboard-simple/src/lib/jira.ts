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
    this.baseUrl = config.baseUrl.replace(/\/rest\/api\/3\/?$/, '').replace(/\/$/, '');
    this.auth = btoa(`${config.email}:${config.apiToken}`);
  }

  private async request(endpoint: string, params: any = {}) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const fullUrl = `${this.baseUrl}/rest/api/3/${cleanEndpoint}`;
    
    try {
      const response = await axios.get(fullUrl, {
        headers: {
          'Authorization': `Basic ${this.auth}`,
          'Accept': 'application/json'
        },
        params
      });
      return response.data;
    } catch (error) {
      console.error('Jira API Error:', error);
      throw error;
    }
  }

  async getProjects() {
    return this.request('project');
  }

  async getBoards() {
    return this.request('agile/1.0/board');
  }

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

  async getTeamMembers(projectKey: string) {
    return this.request('user/assignable/search', {
      project: projectKey
    });
  }
}

export default JiraClient; 