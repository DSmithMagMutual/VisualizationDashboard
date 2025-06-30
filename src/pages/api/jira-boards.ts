import type { NextApiRequest, NextApiResponse } from 'next';
import JiraClient from '../../lib/jira';
import { jiraConfig } from '../../config/jira';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('Fetching all boards...');
    
    const jira = new JiraClient(jiraConfig);
    const boards = await jira.getBoards();
    
    console.log('Boards response:', boards);
    res.status(200).json(boards);
  } catch (error: any) {
    console.error('Error in jira-boards API:', error);
    res.status(500).json({ error: error.message });
  }
} 