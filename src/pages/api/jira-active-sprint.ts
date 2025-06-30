import type { NextApiRequest, NextApiResponse } from 'next';
import JiraClient from '../../lib/jira';
import { jiraConfig } from '../../config/jira';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const jira = new JiraClient(jiraConfig);
    const sprint = await jira.getActiveSprint(jiraConfig.boardId);
    res.status(200).json(sprint);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
} 