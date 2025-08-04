export interface JiraUser {
  self: string;
  accountId: string;
  accountType: string;
  emailAddress: string;
  avatarUrls: {
    [key: string]: string;
  };
  displayName: string;
  active: boolean;
  timeZone: string;
  locale: string;
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: string;
    assignee?: JiraUser;
    reporter?: JiraUser;
    status: {
      name: string;
      statusCategory: {
        key: string;
      };
    };
    created: string;
    updated: string;
    resolutiondate?: string;
    customfield_10016?: number; // Story points
    issuetype: {
      name: string;
    };
    priority: {
      name: string;
    };
    labels: string[];
    components: {
      name: string;
    }[];
  };
}

export interface JiraSearchResponse {
  expand: string;
  startAt: number;
  maxResults: number;
  total: number;
  issues: JiraIssue[];
} 