import React from 'react';
import { Box, Typography, Paper, LinearProgress, Chip } from '@mui/material';
import { styled } from '@mui/material/styles';

interface StatusDurationChartProps {
  currentStatus: string;
  issueType: 'epic' | 'story';
  childIssues: any[];
  analyticsService?: any;
}

// Styled components for the duration chart
const ChartContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
}));

const DurationBar = styled(Box)<{ 
  isCurrent: boolean; 
  duration: number; 
  maxDuration: number;
}>(({ theme, isCurrent }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  padding: theme.spacing(1),
  borderRadius: theme.spacing(0.5),
  backgroundColor: isCurrent ? '#e3f2fd' : '#f8f9fa',
  border: isCurrent ? '2px solid #1976d2' : '1px solid #e0e0e0',
  transition: 'all 0.3s ease',
  '&:hover': {
    backgroundColor: isCurrent ? '#bbdefb' : '#e9ecef',
    transform: 'translateX(2px)',
  },
}));

const StatusDurationChart: React.FC<StatusDurationChartProps> = ({
  currentStatus,
  issueType,
  childIssues,
  analyticsService,
}) => {
  // Get real status durations from analytics service
  const getStatusDurations = () => {
    if (!analyticsService) {
      return [];
    }
    
    const allStatuses = analyticsService.getStatusMetrics() as any[];
    return allStatuses.map(status => ({
      status: status.status,
      duration: status.averageDuration,
      unit: 'days',
      description: `${status.status} phase - based on real team data`
    }));
  };

  const statusDurations = getStatusDurations();
  const alternativeStatuses = [
    { status: 'CANCELLED', duration: 0, unit: 'days', description: 'Work stopped' },
    { status: 'REJECTED', duration: 0, unit: 'days', description: 'Returned for rework' },
  ];

  const allStatuses = [...statusDurations, ...alternativeStatuses];
  const maxDuration = Math.max(...allStatuses.map(s => s.duration));

  // Get status color
  const getStatusColor = (status: string): string => {
    if (status === currentStatus) return '#1976d2';
    if (status === 'DONE' || status === 'APPROVED') return '#28a745';
    if (status === 'CANCELLED') return '#dc3545';
    if (status === 'REJECTED') return '#ffc107';
    if (status === 'IN PROGRESS') return '#0d6efd';
    return '#6c757d';
  };

  // Calculate progress percentage for current status based on real data
  const getCurrentStatusProgress = (): number => {
    if (!analyticsService) return 0;
    
    const currentStatusData = allStatuses.find(s => s.status === currentStatus);
    if (!currentStatusData || currentStatusData.duration === 0) return 0;
    
    // Calculate progress based on team performance and status
    const teamMetrics = analyticsService.getTeamMetrics() as any[];
    if (teamMetrics.length === 0) return 0;
    
    // Use average team completion rate as baseline
    const avgCompletionRate = teamMetrics.reduce((sum, team) => sum + team.completionRate, 0) / teamMetrics.length;
    
    // Adjust based on status (more advanced statuses = higher progress)
    const statusProgressMap: Record<string, number> = {
      'OPEN': Math.round(avgCompletionRate * 0.3),
      'IN PROGRESS': Math.round(avgCompletionRate * 0.6),
      'UNDER REVIEW': Math.round(avgCompletionRate * 0.8),
      'APPROVED': Math.round(avgCompletionRate * 0.95),
      'DONE': 100,
      'CANCELLED': 100,
      'REJECTED': 100,
    };
    
    return statusProgressMap[currentStatus] || Math.round(avgCompletionRate * 0.5);
  };

  // Get child issues status distribution
  const getChildStatusDistribution = () => {
    if (issueType !== 'epic' || childIssues.length === 0) return null;

    const distribution = childIssues.reduce((acc: any, story: any) => {
      const status = story.status.toUpperCase();
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(distribution).map(([status, count]) => ({
      status,
      count: count as number,
      percentage: Math.round((count as number / childIssues.length) * 100)
    }));
  };

  const childDistribution = getChildStatusDistribution();
  const currentProgress = getCurrentStatusProgress();

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 600, color: '#212529', mb: 2 }}>
        Status Duration Analysis
      </Typography>

      <ChartContainer>
        {/* Current Status Progress */}
        <Paper sx={{ p: 2, bgcolor: '#e3f2fd', border: '1px solid #bbdefb' }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: '#1976d2' }}>
            Current Status: {currentStatus}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <LinearProgress 
              variant="determinate" 
              value={currentProgress} 
              sx={{ 
                flex: 1, 
                height: 8, 
                borderRadius: 4,
                backgroundColor: '#bbdefb',
                '& .MuiLinearProgress-bar': { 
                  backgroundColor: '#1976d2',
                  borderRadius: 4
                }
              }} 
            />
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1976d2', minWidth: 'fit-content' }}>
              {currentProgress}%
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: '#1976d2' }}>
            Estimated completion: {allStatuses.find(s => s.status === currentStatus)?.description || 'In progress'}
          </Typography>
        </Paper>

        {/* Duration Chart */}
        <Box>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: '#212529' }}>
            Typical Duration by Status
          </Typography>
          
          {allStatuses.map((statusData) => {
            const isCurrent = statusData.status === currentStatus;
            const progressPercentage = (statusData.duration / maxDuration) * 100;
            
            return (
              <DurationBar
                key={statusData.status}
                isCurrent={isCurrent}
                duration={statusData.duration}
                maxDuration={maxDuration}
              >
                <Box sx={{ minWidth: 80 }}>
                  <Typography variant="caption" sx={{ 
                    fontWeight: 600, 
                    color: getStatusColor(statusData.status),
                    fontSize: '0.75rem'
                  }}>
                    {statusData.status}
                  </Typography>
                </Box>
                
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress 
                    variant="determinate" 
                    value={progressPercentage} 
                    sx={{ 
                      flex: 1, 
                      height: 6, 
                      borderRadius: 3,
                      backgroundColor: '#e0e0e0',
                      '& .MuiLinearProgress-bar': { 
                        backgroundColor: getStatusColor(statusData.status),
                        borderRadius: 3
                      }
                    }} 
                  />
                  <Typography variant="caption" sx={{ 
                    fontWeight: 600, 
                    color: getStatusColor(statusData.status),
                    minWidth: 'fit-content',
                    fontSize: '0.7rem'
                  }}>
                    {statusData.duration > 0 ? `${statusData.duration} ${statusData.unit}` : 'N/A'}
                  </Typography>
                </Box>
                
                {isCurrent && (
                  <Chip 
                    label="CURRENT" 
                    size="small" 
                    sx={{ 
                      bgcolor: '#1976d2',
                      color: 'white',
                      fontSize: '0.6rem',
                      height: 20
                    }} 
                  />
                )}
              </DurationBar>
            );
          })}
        </Box>

        {/* Child Issues Analysis */}
        {childDistribution && (
          <Paper sx={{ p: 2, bgcolor: '#fff3cd', border: '1px solid #ffeaa7' }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: '#856404' }}>
              Child Stories Status Analysis
            </Typography>
            
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {childDistribution.map((item) => (
                <Chip
                  key={item.status}
                  label={`${item.status}: ${item.count} (${item.percentage}%)`}
                  size="small"
                  sx={{
                    bgcolor: '#ffffff',
                    border: `1px solid ${getStatusColor(item.status)}`,
                    color: getStatusColor(item.status),
                    fontSize: '0.7rem',
                  }}
                />
              ))}
            </Box>

            {/* Progress towards completion */}
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ color: '#856404', fontWeight: 500 }}>
                Overall Progress: {childDistribution.find(item => item.status.includes('DONE'))?.percentage || 0}% Complete
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={childDistribution.find(item => item.status.includes('DONE'))?.percentage || 0} 
                sx={{ 
                  height: 6, 
                  borderRadius: 3,
                  backgroundColor: '#ffeaa7',
                  '& .MuiLinearProgress-bar': { 
                    backgroundColor: '#28a745',
                    borderRadius: 3
                  }
                }} 
              />
            </Box>
          </Paper>
        )}

        {/* Duration Insights */}
        <Paper sx={{ p: 2, bgcolor: '#f8f9fa', border: '1px solid #e9ecef' }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: '#212529' }}>
            Duration Insights
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: '#6c757d' }}>
                Total Estimated Duration:
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#212529' }}>
                {statusDurations.reduce((sum, s) => sum + s.duration, 0)} days
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: '#6c757d' }}>
                Longest Phase:
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#212529' }}>
                {statusDurations.reduce((max, s) => s.duration > max.duration ? s : max).status}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: '#6c757d' }}>
                Bottleneck Risk:
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, color: '#dc3545' }}>
                {statusDurations.find(s => s.duration > 5)?.status || 'None'}
              </Typography>
            </Box>
          </Box>
        </Paper>
      </ChartContainer>
    </Box>
  );
};

export default StatusDurationChart;
