import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { endpoint, ...params } = req.query;
  
  if (!endpoint) {
    return res.status(400).json({ message: 'Endpoint is required' });
  }

  try {
    // Log environment variables (without sensitive data)
    const baseUrl = process.env.NEXT_PUBLIC_JIRA_BASE_URL?.replace(/\/rest\/api\/3\/?$/, '');
    const email = process.env.NEXT_PUBLIC_JIRA_EMAIL;
    const apiToken = process.env.NEXT_PUBLIC_JIRA_API_TOKEN;

    console.log('Jira Proxy Config:', {
      baseUrl,
      email,
      tokenLength: apiToken?.length || 0,
      tokenFirstChars: apiToken ? `${apiToken.substring(0, 4)}...` : 'missing',
      endpoint,
      params
    });

    if (!email || !apiToken) {
      console.error('Missing credentials:', { 
        hasEmail: !!email, 
        hasToken: !!apiToken,
        emailLength: email?.length || 0,
        tokenLength: apiToken?.length || 0
      });
      return res.status(401).json({ message: 'Missing Jira credentials' });
    }

    // Verify the token format (Atlassian tokens start with ATAT)
    if (!apiToken.startsWith('ATAT')) {
      console.error('Invalid token format: Token should start with ATAT');
      return res.status(401).json({ message: 'Invalid API token format. Token should start with ATAT' });
    }

    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
    
    // Construct the URL - don't add /rest/api/3/ since it's included in the endpoint
    const url = `${baseUrl}/${endpoint}`;

    console.log('Making Jira request:', {
      url,
      endpoint,
      params,
      authHeader: `Basic ${auth.substring(0, 10)}...`,
      emailLength: email.length,
      tokenLength: apiToken.length
    });

    const response = await axios.get(url, {
      params,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    console.log('Jira response:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data
    });

    return res.status(response.status).json(response.data);
  } catch (error) {
    console.error('Jira proxy error:', error);
    
    if (axios.isAxiosError(error)) {
      console.error('Detailed error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url,
        headers: {
          ...error.config?.headers,
          'Authorization': '[REDACTED]'
        }
      });

      // Add more specific error messages
      if (error.response?.status === 401) {
        return res.status(401).json({
          message: 'Authentication failed. Please verify your email and API token.',
          details: error.response?.data,
          status: error.response?.status,
          statusText: error.response?.statusText
        });
      }

      return res.status(error.response?.status || 500).json({
        message: error.message,
        details: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
    }

    return res.status(500).json({ message: 'Internal server error' });
  }
} 