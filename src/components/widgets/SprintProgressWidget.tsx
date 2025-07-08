import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, LinearProgress, Chip } from '@mui/material';
import { getProjectIssues, getProjectData } from '@/lib/jira-proxy';

interface ProjectProgressWidgetProps {
  title?: string;
}

const ProjectProgressWidget: React.FC<ProjectProgressWidgetProps> = ({ 
  title = "Project Progress" 
}) => {
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
        
        const projectKey = process.env.NEXT_PUBLIC_JIRA_PROJECT_KEY || '';
        const projectData = await getProjectData(projectKey);
        const issuesData = await getProjectIssues(projectKey);
        
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

  return (
    <Card sx={{ mb: 1.5, maxWidth: 420, mx: 'auto' }}>
      <CardContent sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="h6">{title}</Typography>
          <Chip 
            label={`${completedIssues}/${totalIssues}`} 
            size="small" 
            color="primary" 
          />
        </Box>
        
        <Box mb={1}>
          <LinearProgress 
            variant="determinate" 
            value={progress} 
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary">
          {progress}% complete • {completedIssues} of {totalIssues} issues done
        </Typography>
      </CardContent>
    </Card>
  );
};

export default ProjectProgressWidget; 