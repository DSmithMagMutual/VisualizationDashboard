import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, Chip, CircularProgress, Stack } from '@mui/material';
import { getProjectIssues } from '@/lib/jira-proxy';
import { useBoard } from '../MinimalistDashboard';

interface IssueStatusWidgetProps {
  title?: string;
}

const IssueStatusWidget: React.FC<IssueStatusWidgetProps> = ({ 
  title = "Issue Status" 
}) => {
  const { activeBoard } = useBoard();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const projectKey = activeBoard.name;
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
  }, [activeBoard]);

  if (loading) {
    return (
      <Card sx={{ mb: 2, maxWidth: 420, mx: 'auto', borderRadius: 3, boxShadow: 6, bgcolor: 'background.paper', backdropFilter: 'blur(8px)' }} aria-busy="true" aria-label="Loading issue status" role="status">
        <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
          <CircularProgress color="primary" size={40} aria-label="Loading" sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Loading issue status…
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ mb: 2, maxWidth: 420, mx: 'auto', borderRadius: 3, boxShadow: 6, bgcolor: 'background.paper', backdropFilter: 'blur(8px)' }} aria-label="Issue status error" role="alert">
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" color="error" gutterBottom tabIndex={0}>
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
    <Card sx={{ mb: 2, maxWidth: 420, mx: 'auto', borderRadius: 3, boxShadow: 6, bgcolor: 'background.paper', backdropFilter: 'blur(8px)' }} aria-label="Issue status" role="region" tabIndex={0}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <Typography variant="h6" fontWeight={700} color="text.primary" id="issue-status-title">
            {title}
          </Typography>
          <Chip label={`${totalIssues} total`} size="small" color="primary" sx={{ ml: 'auto', fontWeight: 700, bgcolor: '#6C63FF', color: '#fff', borderRadius: 2 }} aria-label={`Total issues: ${totalIssues}`} />
        </Stack>
        <Box component="ul" aria-labelledby="issue-status-title" sx={{ listStyle: 'none', p: 0, m: 0 }}>
          {Object.entries(statusCounts).map(([status, count]) => (
            <Box component="li" key={status} display="flex" justifyContent="space-between" alignItems="center" py={0.5}>
              <Typography variant="body2" color="#fff" sx={{ fontWeight: 500 }}>{status}</Typography>
              <Chip label={count} size="small" sx={{ bgcolor: '#23293A', color: '#fff', fontWeight: 700, borderRadius: 2 }} aria-label={`${count} issues ${status}`} />
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default IssueStatusWidget; 