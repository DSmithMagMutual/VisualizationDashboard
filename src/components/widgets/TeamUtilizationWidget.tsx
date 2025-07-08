import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { getProjectIssues, getTeamMembers } from '@/lib/jira-proxy';

interface TeamUtilizationWidgetProps {
  title?: string;
}

const TeamUtilizationWidget: React.FC<TeamUtilizationWidgetProps> = ({ 
  title = "Team Utilization" 
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [assigneeCounts, setAssigneeCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const projectKey = process.env.NEXT_PUBLIC_JIRA_PROJECT_KEY || '';
        const issuesData = await getProjectIssues(projectKey);
        const teamMembersData = await getTeamMembers(projectKey);
        
        if (!issuesData.issues) {
          throw new Error('No issues found');
        }

        const issues = issuesData.issues;
        
        // Extract team members from project issues if API call failed
        let finalTeamMembers = teamMembersData.values || [];
        if (finalTeamMembers.length === 0 && issues) {
          const assignees = new Set();
          issues.forEach((issue: any) => {
            if (issue.fields.assignee) {
              assignees.add(issue.fields.assignee.emailAddress);
            }
          });
          finalTeamMembers = Array.from(assignees as Set<string>).map((email: string) => ({
            emailAddress: email,
            displayName: email.split('@')[0] // Simple fallback
          }));
        }

        // Count issues per assignee
        const assigneeCount: Record<string, number> = {};
        issues.forEach((issue: any) => {
          if (issue.fields.assignee) {
            const assignee = issue.fields.assignee.displayName || issue.fields.assignee.emailAddress;
            assigneeCount[assignee] = (assigneeCount[assignee] || 0) + 1;
          }
        });

        setTeamMembers(finalTeamMembers);
        setAssigneeCounts(assigneeCount);
      } catch (err) {
        console.error('TeamUtilizationWidget error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch team data');
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

  const totalIssues = Object.values(assigneeCounts).reduce((sum, count) => sum + count, 0);

  return (
    <Card sx={{ mb: 1.5, maxWidth: 420, mx: 'auto' }}>
      <CardContent sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">{title}</Typography>
          <Chip 
            label={`${teamMembers.length} members`} 
            size="small" 
            color="primary" 
          />
        </Box>
        
        <Box display="flex" flexDirection="column" gap={1}>
          {Object.entries(assigneeCounts).map(([assignee, count]) => (
            <Box key={assignee} display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                {assignee}
              </Typography>
              <Chip 
                label={`${count} issues`} 
                size="small" 
                variant="outlined"
                sx={{ minWidth: 60 }}
              />
            </Box>
          ))}
          {Object.keys(assigneeCounts).length === 0 && (
            <Typography variant="body2" color="text.secondary" align="center">
              No assigned issues found
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default TeamUtilizationWidget; 