import type { NextApiRequest, NextApiResponse } from 'next';
import JiraClient from '../../lib/jira';
import { jiraConfig } from '../../config/jira';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const jira = new JiraClient(jiraConfig);
    const projects = await jira.getProjects();
    res.status(200).json(projects);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
} 