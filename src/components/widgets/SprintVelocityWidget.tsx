import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, Chip, CircularProgress, Stack } from '@mui/material';
import { getAllProjectIssues } from '@/lib/jira-proxy';
import { useBoard } from '../MinimalistDashboard';

interface ProjectMetricsWidgetProps {
  title?: string;
}

const ProjectMetricsWidget: React.FC<ProjectMetricsWidgetProps> = ({ 
  title = "Project Metrics" 
}) => {
  const { activeBoard } = useBoard();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    totalIssues: 0,
    completedIssues: 0,
    inProgressIssues: 0,
    openIssues: 0,
    averagePriority: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Add timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          setError('Request timed out. Please check your Jira configuration.');
          setLoading(false);
        }, 30000); // 30 second timeout

        const projectKey = activeBoard.name;
        console.log('Fetching project metrics for project:', projectKey);
        
        const issues = await getAllProjectIssues(projectKey);
        console.log('Issues data for metrics:', issues);
        
        clearTimeout(timeoutId);
        
        if (!issues) {
          throw new Error('No issues found');
        }
        const total = issues.length;
        const completed = issues.filter((issue: any) => 
          issue.fields.status && issue.fields.status.name === 'Done'
        ).length;
        const inProgress = issues.filter((issue: any) => 
          issue.fields.status?.statusCategory?.key === 'indeterminate'
        ).length;
        const open = issues.filter((issue: any) => 
          issue.fields.status?.statusCategory?.key === 'new'
        ).length;
        const prioritySum = issues.reduce((sum: number, issue: any) => {
          const priority = issue.fields.priority?.id || 3;
          return sum + priority;
        }, 0);
        const averagePriority = total > 0 ? Math.round(prioritySum / total) : 3;
        setMetrics({
          totalIssues: total,
          completedIssues: completed,
          inProgressIssues: inProgress,
          openIssues: open,
          averagePriority
        });
      } catch (err) {
        console.error('ProjectMetricsWidget error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch project metrics');
      } finally {
        setLoading(false);
      }
    };
    
    if (activeBoard && activeBoard.name) {
      fetchData();
    } else {
      setError('No active board selected');
      setLoading(false);
    }
  }, [activeBoard]);

  if (loading) {
    return (
      <Card sx={{ mb: 2, maxWidth: 420, mx: 'auto', borderRadius: 3, boxShadow: 6, bgcolor: 'background.paper', backdropFilter: 'blur(8px)' }} aria-busy="true" aria-label="Loading project metrics" role="status">
        <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
          <CircularProgress color="primary" size={40} aria-label="Loading" sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Loading project metrics…
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            Project: {activeBoard?.name || 'Unknown'}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ mb: 2, maxWidth: 420, mx: 'auto', borderRadius: 3, boxShadow: 6, bgcolor: 'background.paper', backdropFilter: 'blur(8px)' }} aria-label="Project metrics error" role="alert">
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" color="error" gutterBottom tabIndex={0}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {error}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Make sure your Jira environment variables are configured correctly.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return 'Highest';
      case 2: return 'High';
      case 3: return 'Medium';
      case 4: return 'Low';
      case 5: return 'Lowest';
      default: return 'Medium';
    }
  };

  const { totalIssues, completedIssues, inProgressIssues, openIssues, averagePriority } = metrics;

  return (
    <Card sx={{ mb: 2, maxWidth: 420, mx: 'auto', borderRadius: 3, boxShadow: 6, bgcolor: 'background.paper', backdropFilter: 'blur(8px)' }} aria-label="Project metrics" role="region" tabIndex={0}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <Typography variant="h6" fontWeight={700} color="text.primary" id="project-metrics-title">
            {title}
          </Typography>
          <Chip label={`${totalIssues} total`} size="small" color="primary" sx={{ ml: 'auto', fontWeight: 700, bgcolor: '#6C63FF', color: '#fff', borderRadius: 2 }} aria-label={`Total issues: ${totalIssues}`} />
        </Stack>
        <Box component="ul" aria-labelledby="project-metrics-title" sx={{ listStyle: 'none', p: 0, m: 0 }}>
          <Box component="li" display="flex" justifyContent="space-between" alignItems="center" py={0.5}>
            <Typography variant="body2" color="#fff" sx={{ fontWeight: 500 }}>Completed</Typography>
            <Chip label={completedIssues} size="small" sx={{ bgcolor: '#23293A', color: '#4caf50', fontWeight: 700, borderRadius: 2 }} aria-label={`Completed: ${completedIssues}`} />
          </Box>
          <Box component="li" display="flex" justifyContent="space-between" alignItems="center" py={0.5}>
            <Typography variant="body2" color="#fff" sx={{ fontWeight: 500 }}>In Progress</Typography>
            <Chip label={inProgressIssues} size="small" sx={{ bgcolor: '#23293A', color: '#ffb300', fontWeight: 700, borderRadius: 2 }} aria-label={`In Progress: ${inProgressIssues}`} />
          </Box>
          <Box component="li" display="flex" justifyContent="space-between" alignItems="center" py={0.5}>
            <Typography variant="body2" color="#fff" sx={{ fontWeight: 500 }}>Open</Typography>
            <Chip label={openIssues} size="small" sx={{ bgcolor: '#23293A', color: '#6C63FF', fontWeight: 700, borderRadius: 2 }} aria-label={`Open: ${openIssues}`} />
          </Box>
          <Box component="li" display="flex" justifyContent="space-between" alignItems="center" py={0.5}>
            <Typography variant="body2" color="#fff" sx={{ fontWeight: 500 }}>Avg Priority</Typography>
            <Chip label={getPriorityLabel(averagePriority)} size="small" sx={{ bgcolor: '#23293A', color: '#fff', fontWeight: 700, borderRadius: 2 }} aria-label={`Average Priority: ${averagePriority}`} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ProjectMetricsWidget; 