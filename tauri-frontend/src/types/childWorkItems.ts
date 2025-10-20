export interface JiraSubtask {
  id: string;
  key: string;
  fields: {
    summary: string;
    status: {
      name: string;
      statusCategory: { 
        key: string;
        name: string;
      };
    };
    assignee?: {
      displayName: string;
      emailAddress: string;
      avatarUrls: {
        '16x16': string;
        '24x24': string;
        '32x32': string;
        '48x48': string;
      };
    };
    parent: {
      key: string;
      fields: { 
        summary: string;
      };
    };
    issuetype: {
      name: string;
      iconUrl: string;
    };
    priority?: {
      name: string;
      iconUrl: string;
    };
    description?: string;
    created: string;
    updated: string;
  };
}

export interface JiraIssueWithChildren {
  key: string;
  fields: {
    summary: string;
    status: {
      name: string;
      statusCategory: { 
        key: string;
        name: string;
      };
    };
    assignee?: {
      displayName: string;
      emailAddress: string;
    };
    issuetype: {
      name: string;
      iconUrl: string;
    };
    priority?: {
      name: string;
      iconUrl: string;
    };
    description?: string;
    created: string;
    updated: string;
    subtasks?: JiraSubtask[];
  };
  children?: JiraSubtask[];
}

export interface SubtaskCreateData {
  parentKey: string;
  summary: string;
  description?: string;
  assigneeEmail?: string;
  priority?: string;
  issueType?: string;
}

export interface SubtaskImportData {
  parentKey: string;
  summary: string;
  description?: string;
  assigneeEmail?: string;
  priority?: string;
  issueType?: string;
}

export interface ChildWorkItemsStats {
  totalParents: number;
  totalChildren: number;
  completedChildren: number;
  inProgressChildren: number;
  todoChildren: number;
  completionPercentage: number;
}

export interface ParentIssue {
  key: string;
  summary: string;
  status: string;
  assignee?: string;
  children: JiraSubtask[];
  completionStats: {
    total: number;
    completed: number;
    inProgress: number;
    todo: number;
    percentage: number;
  };
}
