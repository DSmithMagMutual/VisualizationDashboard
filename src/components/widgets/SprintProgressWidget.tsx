import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, LinearProgress, Chip, Stack, CircularProgress } from '@mui/material';
import { getProjectData } from '@/lib/jira-proxy';
import { useAllProjectIssues } from '@/lib/useAllProjectIssues';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useBoard } from '../MinimalistDashboard';

const SprintProgressWidget = () => {
  const { activeBoard } = useBoard();
  const [projectData, setProjectData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const projectKey = activeBoard?.name;
  const { data: issues, isLoading, isFetching, error: issuesError } = useAllProjectIssues(projectKey);

  useEffect(() => {
    if (!projectKey) return;
    setProjectData(null);
    setError(null);
    getProjectData(projectKey)
      .then((data) => {
        setProjectData(data);
      })
      .catch(() => {
        setError('Failed to load project data');
      });
  }, [projectKey]);

  if (isLoading || isFetching) {
    return (
      <Card sx={{ mb: 2, maxWidth: 420, mx: 'auto', borderRadius: 3, boxShadow: 6, bgcolor: '#23293A', color: '#fff' }}>
        <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 120 }}>
          <CircularProgress color="primary" size={40} sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Loading project progress…
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (error || issuesError) {
    return (
      <Card sx={{ mb: 2, maxWidth: 420, mx: 'auto', borderRadius: 3, boxShadow: 6, bgcolor: '#23293A', color: '#fff' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" color="error" gutterBottom tabIndex={0}>
            Project Progress
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {error || issuesError?.message || 'Failed to load project progress.'}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (!issues) {
    return null;
  }

  const total = issues.length;
  const completed = issues.filter((issue: any) => issue.fields.status && issue.fields.status.name === 'Done').length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <Card sx={{ mb: 2, maxWidth: 420, mx: 'auto', borderRadius: 3, boxShadow: 6, bgcolor: '#23293A', color: '#fff' }}>
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" mb={1}>
          <CheckCircleIcon sx={{ color: '#6C63FF', mr: 1 }} />
          <Typography variant="h6" fontWeight={700} color="#fff" flexGrow={1}>
            Project Progress
          </Typography>
          <Chip label={`${completed}/${total}`} sx={{ bgcolor: '#6C63FF', color: '#fff', fontWeight: 700, borderRadius: 2, fontSize: 16 }} size="small" />
        </Box>
        <LinearProgress variant="determinate" value={percent} sx={{ height: 8, borderRadius: 4, bgcolor: '#23293A', mb: 2 }} />
        <Typography variant="body2" color="#fff" sx={{ fontWeight: 500 }}>
          {percent}% complete • {completed} of {total} issues done
        </Typography>
      </CardContent>
    </Card>
  );
};

export default SprintProgressWidget; 