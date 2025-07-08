import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { getProjectIssues } from '@/lib/jira-proxy';

interface ProjectMetricsWidgetProps {
  title?: string;
}

const ProjectMetricsWidget: React.FC<ProjectMetricsWidgetProps> = ({ 
  title = "Project Metrics" 
}) => {
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
        
        const projectKey = process.env.NEXT_PUBLIC_JIRA_PROJECT_KEY || '';
        const issuesData = await getProjectIssues(projectKey);
        
        if (!issuesData.issues) {
          throw new Error('No issues found');
        }

        const issues = issuesData.issues;
        const total = issues.length;
        const completed = issues.filter((issue: any) => 
          issue.fields.status?.statusCategory?.key === 'done'
        ).length;
        const inProgress = issues.filter((issue: any) => 
          issue.fields.status?.statusCategory?.key === 'indeterminate'
        ).length;
        const open = issues.filter((issue: any) => 
          issue.fields.status?.statusCategory?.key === 'new'
        ).length;

        // Calculate average priority (1=Highest, 5=Lowest)
        const prioritySum = issues.reduce((sum: number, issue: any) => {
          const priority = issue.fields.priority?.id || 3; // Default to medium
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

  return (
    <Card sx={{ mb: 1.5, maxWidth: 420, mx: 'auto' }}>
      <CardContent sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">{title}</Typography>
          <Chip 
            label={`${metrics.totalIssues} total`} 
            size="small" 
            color="primary" 
          />
        </Box>
        
        <Box display="flex" flexDirection="column" gap={1}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Completed
            </Typography>
            <Chip 
              label={metrics.completedIssues} 
              size="small" 
              color="success"
              variant="outlined"
              sx={{ minWidth: 40 }}
            />
          </Box>
          
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              In Progress
            </Typography>
            <Chip 
              label={metrics.inProgressIssues} 
              size="small" 
              color="warning"
              variant="outlined"
              sx={{ minWidth: 40 }}
            />
          </Box>
          
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Open
            </Typography>
            <Chip 
              label={metrics.openIssues} 
              size="small" 
              color="info"
              variant="outlined"
              sx={{ minWidth: 40 }}
            />
          </Box>
          
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Avg Priority
            </Typography>
            <Chip 
              label={getPriorityLabel(metrics.averagePriority)} 
              size="small" 
              variant="outlined"
              sx={{ minWidth: 60 }}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ProjectMetricsWidget; 