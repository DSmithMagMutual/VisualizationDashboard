import type { NextApiRequest, NextApiResponse } from 'next';
import JiraClient from '../../lib/jira';
import { jiraConfig } from '../../config/jira';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { projectKey } = req.query;
    if (!projectKey) {
      return res.status(400).json({ error: 'Missing projectKey parameter' });
    }
    const jira = new JiraClient(jiraConfig);
    const members = await jira.getTeamMembers(projectKey as string);
    res.status(200).json(members);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
} 