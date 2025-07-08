import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { getProjectIssues } from '@/lib/jira-proxy';

interface IssueStatusWidgetProps {
  title?: string;
}

const IssueStatusWidget: React.FC<IssueStatusWidgetProps> = ({ 
  title = "Issue Status" 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const projectKey = process.env.NEXT_PUBLIC_JIRA_PROJECT_KEY || '';
        const issuesData = await getProjectIssues(projectKey);
        
        if (!issuesData.issues) {
          throw new Error('No issues found');
        }

        const issues = issuesData.issues;
        const statusCount: Record<string, number> = {};
        
        issues.forEach((issue: any) => {
          const status = issue.fields.status?.name || 'Unknown';
          statusCount[status] = (statusCount[status] || 0) + 1;
        });

        setStatusCounts(statusCount);
      } catch (err) {
        console.error('IssueStatusWidget error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch issue data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Card sx={{ mb: 1.5, maxWidth: 420, mx: 'auto' }}>
        <CardContent sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="h6">{title}</Typography>
            <Box sx={{ width: 20, height: 20 }}>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            </Box>
          </Box>
          <Box height={24} mb={1} bgcolor="#eee" borderRadius={1}></Box>
          <Box height={24} width="75%" bgcolor="#eee" borderRadius={1}></Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ mb: 1.5, maxWidth: 420, mx: 'auto', borderLeft: '4px solid #f44336', bgcolor: '#fff', boxShadow: 1 }}>
        <CardContent sx={{ p: 2 }}>
          <Typography variant="h6" color="error" gutterBottom>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {error}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const totalIssues = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);

  return (
    <Card sx={{ mb: 1.5, maxWidth: 420, mx: 'auto' }}>
      <CardContent sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">{title}</Typography>
          <Chip 
            label={`${totalIssues} total`} 
            size="small" 
            color="primary" 
          />
        </Box>
        
        <Box display="flex" flexDirection="column" gap={1}>
          {Object.entries(statusCounts).map(([status, count]) => (
            <Box key={status} display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                {status}
              </Typography>
              <Chip 
                label={count} 
                size="small" 
                variant="outlined"
                sx={{ minWidth: 40 }}
              />
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default IssueStatusWidget; 