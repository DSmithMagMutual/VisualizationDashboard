import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, Chip, CircularProgress, Stack } from '@mui/material';
import { getProjectIssues, getTeamMembers } from '@/lib/jira-proxy';
import { useBoard } from '../MinimalistDashboard';

interface TeamUtilizationWidgetProps {
  title?: string;
}

const TeamUtilizationWidget: React.FC<TeamUtilizationWidgetProps> = ({ 
  title = "Team Utilization" 
}) => {
  const { activeBoard } = useBoard();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [assigneeCounts, setAssigneeCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const projectKey = activeBoard.name;
        const issuesData = await getProjectIssues(projectKey);
        const teamMembersData = await getTeamMembers(projectKey);
        if (!issuesData.issues) {
          throw new Error('No issues found');
        }
        const issues = issuesData.issues;
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
            displayName: email.split('@')[0]
          }));
        }
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
  }, [activeBoard]);

  if (loading) {
    return (
      <Card sx={{ mb: 2, maxWidth: 420, mx: 'auto', borderRadius: 3, boxShadow: 6, bgcolor: 'background.paper', backdropFilter: 'blur(8px)' }} aria-busy="true" aria-label="Loading team utilization" role="status">
        <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
          <CircularProgress color="primary" size={40} aria-label="Loading" sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Loading team utilization…
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ mb: 2, maxWidth: 420, mx: 'auto', borderRadius: 3, boxShadow: 6, bgcolor: 'background.paper', backdropFilter: 'blur(8px)' }} aria-label="Team utilization error" role="alert">
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

  const totalIssues = Object.values(assigneeCounts).reduce((sum, count) => sum + count, 0);

  return (
    <Card sx={{ mb: 2, maxWidth: 420, mx: 'auto', borderRadius: 3, boxShadow: 6, bgcolor: 'background.paper', backdropFilter: 'blur(8px)' }} aria-label="Team utilization" role="region" tabIndex={0}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <Typography variant="h6" fontWeight={700} color="text.primary" id="team-utilization-title">
            {title}
          </Typography>
          <Chip label={`${teamMembers.length} members`} size="small" color="primary" sx={{ ml: 'auto', fontWeight: 700, bgcolor: '#6C63FF', color: '#fff', borderRadius: 2 }} aria-label={`Team members: ${teamMembers.length}`} />
        </Stack>
        <Box component="ul" aria-labelledby="team-utilization-title" sx={{ listStyle: 'none', p: 0, m: 0 }}>
          {teamMembers.map((member) => {
            const name = member.displayName || member.emailAddress || 'Unknown';
            const count = assigneeCounts[name] || 0;
            return (
              <Box component="li" key={member.emailAddress || name} display="flex" justifyContent="space-between" alignItems="center" py={0.5}>
                <Typography variant="body2" color="#fff" sx={{ fontWeight: 500 }}>{name}</Typography>
                <Chip label={`${count} issues`} size="small" sx={{ bgcolor: '#23293A', color: '#fff', fontWeight: 700, borderRadius: 2 }} aria-label={`${count} issues for ${name}`} />
              </Box>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
};

export default TeamUtilizationWidget; 