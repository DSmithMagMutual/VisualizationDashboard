import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, LinearProgress, Chip, Stack, CircularProgress } from '@mui/material';
import { getProjectIssues, getProjectData } from '@/lib/jira-proxy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useBoard } from '../MinimalistDashboard';

interface ProjectProgressWidgetProps {
  title?: string;
}

const ProjectProgressWidget: React.FC<ProjectProgressWidgetProps> = ({ 
  title = "Project Progress" 
}) => {
  const { activeBoard } = useBoard();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [totalIssues, setTotalIssues] = useState(0);
  const [completedIssues, setCompletedIssues] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Add timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          setError('Request timed out. Please check your Jira configuration.');
          setLoading(false);
        }, 10000); // 10 second timeout

        const projectKey = activeBoard.name;
        console.log('Fetching data for project:', projectKey);
        
        const projectData = await getProjectData(projectKey);
        console.log('Project data:', projectData);
        
        const issuesData = await getProjectIssues(projectKey);
        console.log('Issues data:', issuesData);
        
        clearTimeout(timeoutId);
        
        if (!issuesData.issues) {
          throw new Error('No issues found');
        }
        const issues = issuesData.issues;
        const total = issues.length;
        const completed = issues.filter((issue: any) => 
          issue.fields.status?.statusCategory?.key === 'done'
        ).length;
        setTotalIssues(total);
        setCompletedIssues(completed);
        setProgress(total > 0 ? Math.round((completed / total) * 100) : 0);
      } catch (err) {
        console.error('ProjectProgressWidget error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch project data');
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
      <Card sx={{ mb: 2, maxWidth: 420, mx: 'auto', borderRadius: 3, boxShadow: 6, bgcolor: 'background.paper', backdropFilter: 'blur(8px)' }} aria-busy="true" aria-label="Loading project progress" role="status">
        <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
          <CircularProgress color="primary" size={40} aria-label="Loading" sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Loading project progress…
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
      <Card sx={{ mb: 2, maxWidth: 420, mx: 'auto', borderRadius: 3, boxShadow: 6, bgcolor: 'background.paper', backdropFilter: 'blur(8px)' }} aria-label="Project progress error" role="alert">
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

  return (
    <Card sx={{ mb: 2, maxWidth: 420, mx: 'auto', borderRadius: 3, boxShadow: 6, bgcolor: 'background.paper', backdropFilter: 'blur(8px)' }} aria-label="Project progress" role="region" tabIndex={0}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <CheckCircleIcon color="primary" fontSize="large" aria-hidden="true" />
          <Typography variant="h6" fontWeight={700} color="text.primary" id="project-progress-title">
            {title}
          </Typography>
          <Chip label={`${completedIssues}/${totalIssues}`} size="small" color="primary" sx={{ ml: 'auto', fontWeight: 700, bgcolor: '#6C63FF', color: '#fff', borderRadius: 2 }} aria-label={`Completed ${completedIssues} of ${totalIssues} issues`} />
        </Stack>
        <Box mb={2} aria-labelledby="project-progress-title">
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{ height: 10, borderRadius: 5, background: '#23293A', '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #6C63FF 60%, #00C9A7 100%)' } }}
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            role="progressbar"
          />
        </Box>
        <Typography variant="body2" color="#fff" sx={{ fontWeight: 600 }}>
          <b>{progress}% complete</b> • {completedIssues} of {totalIssues} issues done
        </Typography>
      </CardContent>
    </Card>
  );
};

export default ProjectProgressWidget; 