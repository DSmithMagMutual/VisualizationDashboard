import type { NextApiRequest, NextApiResponse } from 'next';
import JiraClient from '../../lib/jira';
import { jiraConfig } from '../../config/jira';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('Jira Config for active sprint:', {
      baseUrl: jiraConfig.baseUrl,
      email: jiraConfig.email,
      boardId: jiraConfig.boardId,
      hasToken: !!jiraConfig.apiToken
    });
    
    const jira = new JiraClient(jiraConfig);
    console.log('Fetching active sprint for board ID:', jiraConfig.boardId);
    
    const sprint = await jira.getActiveSprint(jiraConfig.boardId);
    console.log('Active sprint response:', sprint);
    
    res.status(200).json(sprint);
  } catch (error: any) {
    console.error('Error in jira-active-sprint API:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    res.status(500).json({ error: error.message });
  }
} 