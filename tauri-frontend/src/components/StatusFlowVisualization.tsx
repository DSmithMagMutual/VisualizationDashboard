import React from 'react';
import { Box, Typography, Paper, Chip, Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { AnalyticsService } from '../lib/analyticsService';
import type { StatusDurationAnalysis } from '../lib/analyticsService';

interface StatusFlowVisualizationProps {
  currentStatus: string;
  issueType: 'epic' | 'story';
  childIssues: any[];
  analyticsService?: AnalyticsService;
}

// Styled components for the flow diagram
const FlowContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
}));

const StatusNode = styled(Paper)<{ 
  isCurrent: boolean; 
  status: string; 
  isActive: boolean;
  isTerminal: boolean;
}>(({ theme, isCurrent, isActive, isTerminal }) => ({
  padding: theme.spacing(1.5),
  borderRadius: theme.spacing(1),
  minWidth: 120,
  textAlign: 'center',
  position: 'relative',
  border: isCurrent ? '3px solid #1976d2' : '2px solid #e0e0e0',
  backgroundColor: isCurrent ? '#e3f2fd' : isActive ? '#f5f5f5' : '#ffffff',
  boxShadow: isCurrent ? '0 4px 12px rgba(25, 118, 210, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
  },
  ...(isTerminal && {
    backgroundColor: isCurrent ? '#e8f5e8' : '#f8f9fa',
    borderColor: isCurrent ? '#2e7d32' : '#28a745',
  }),
}));

const FlowArrow = styled(Box)<{ 
  direction: 'right' | 'down' | 'up' | 'left';
  isActive: boolean;
  hasLoop?: boolean;
}>(({ direction, isActive, hasLoop }) => ({
  position: 'relative',
  color: isActive ? '#1976d2' : '#9e9e9e',
  fontWeight: 'bold',
  fontSize: '1.2rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  ...(direction === 'right' && {
    transform: 'rotate(0deg)',
  }),
  ...(direction === 'down' && {
    transform: 'rotate(90deg)',
  }),
  ...(direction === 'up' && {
    transform: 'rotate(-90deg)',
  }),
  ...(direction === 'left' && {
    transform: 'rotate(180deg)',
  }),
  ...(hasLoop && {
    position: 'absolute',
    top: -20,
    right: -20,
    transform: 'rotate(45deg)',
  }),
}));

const DurationBadge = styled(Box)(() => ({
  position: 'absolute',
  top: -8,
  right: -8,
  backgroundColor: '#ff9800',
  color: 'white',
  borderRadius: '50%',
  width: 20,
  height: 20,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.7rem',
  fontWeight: 'bold',
  border: '2px solid white',
}));

const StatusFlowVisualization: React.FC<StatusFlowVisualizationProps> = ({
  currentStatus,
  issueType,
  childIssues,
  analyticsService,
}) => {
  // Get real status flow data from analytics service
  const getStatusFlow = () => {
    if (!analyticsService) {
      // Fallback to default flow
      return [
        { name: 'OPEN', color: '#6c757d', isActive: true, isTerminal: false },
        { name: 'IN PROGRESS', color: '#0d6efd', isActive: true, isTerminal: false },
        { name: 'UNDER REVIEW', color: '#6c757d', isActive: true, isTerminal: false },
        { name: 'APPROVED', color: '#28a745', isActive: true, isTerminal: false },
        { name: 'DONE', color: '#28a745', isActive: true, isTerminal: true },
      ];
    }

    // Get all unique statuses from the data
    const allStatuses = analyticsService.getStatusMetrics() as StatusDurationAnalysis[];
    const statusFlow = allStatuses
      .filter(status => !status.status.toLowerCase().includes('cancelled') && !status.status.toLowerCase().includes('rejected'))
      .sort((a, b) => {
        // Sort by typical flow order
        const order = ['OPEN', 'READY', 'CREATING', 'IN PROGRESS', 'TESTING', 'VALIDATING', 'UNDER REVIEW', 'READY FOR RELEASE', 'APPROVED', 'DONE'];
        const aIndex = order.findIndex(s => a.status.toUpperCase().includes(s));
        const bIndex = order.findIndex(s => b.status.toUpperCase().includes(s));
        return aIndex - bIndex;
      })
      .map(status => ({
        name: status.status,
        color: getStatusColor(status.status),
        isActive: true,
        isTerminal: status.status.toLowerCase().includes('done') || status.status.toLowerCase().includes('approved'),
        averageDuration: status.averageDuration,
        teamBreakdown: status.teamBreakdown
      }));

    return statusFlow;
  };

  const statusFlow = getStatusFlow();

  // Alternative paths
  const alternativePaths = [
    { name: 'CANCELLED', color: '#dc3545', isActive: true, isTerminal: true },
    { name: 'REJECTED', color: '#ffc107', isActive: true, isTerminal: false },
  ];

  // Determine current status index
  const getCurrentStatusIndex = () => {
    const statusMap: Record<string, number> = {
      'OPEN': 0,
      'IN PROGRESS': 1,
      'UNDER REVIEW': 2,
      'APPROVED': 3,
      'DONE': 4,
      'CANCELLED': -1,
      'REJECTED': -2,
    };
    return statusMap[currentStatus.toUpperCase()] ?? 0;
  };

  const currentStatusIndex = getCurrentStatusIndex();

  // Calculate estimated durations for each status using real data
  const getEstimatedDuration = (status: string): string => {
    if (analyticsService) {
      const statusMetrics = analyticsService.getStatusMetrics(status) as StatusDurationAnalysis;
      if (statusMetrics) {
        const avgDuration = statusMetrics.averageDuration;
        if (avgDuration === 0) return 'N/A';
        
        // Get team breakdown for this status
        const teamDurations = Object.values(statusMetrics.teamBreakdown);
        if (teamDurations.length > 0) {
          const minDuration = Math.min(...teamDurations);
          const maxDuration = Math.max(...teamDurations);
          if (minDuration === maxDuration) {
            return `${avgDuration} days`;
          }
          return `${minDuration}-${maxDuration} days`;
        }
        
        return `${avgDuration} days`;
      }
    }

    // No fallback data - only show real analytics
    return 'Calculating...';
  };

  // Get status color based on current status
  const getStatusColor = (status: string): string => {
    if (status === currentStatus) return '#1976d2';
    if (status === 'DONE' || status === 'APPROVED') return '#28a745';
    if (status === 'CANCELLED') return '#dc3545';
    if (status === 'REJECTED') return '#ffc107';
    return '#6c757d';
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 600, color: '#212529', mb: 2 }}>
        Status Flow Visualization
      </Typography>
      
      <FlowContainer>
        {/* Main Flow Path */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
          {statusFlow.map((status, index) => (
            <React.Fragment key={status.name}>
              <StatusNode
                isCurrent={status.name === currentStatus}
                status={status.name}
                isActive={index <= currentStatusIndex}
                isTerminal={status.isTerminal}
                elevation={status.name === currentStatus ? 4 : 1}
              >
                <Typography variant="caption" sx={{ fontWeight: 600, color: getStatusColor(status.name) }}>
                  {status.name}
                </Typography>
                <DurationBadge>
                  {getEstimatedDuration(status.name).split('-')[0]}
                </DurationBadge>
                {status.name === currentStatus && (
                  <Box sx={{ 
                    position: 'absolute', 
                    bottom: -8, 
                    left: '50%', 
                    transform: 'translateX(-50%)',
                    backgroundColor: '#1976d2',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.7rem',
                    fontWeight: 'bold'
                  }}>
                    CURRENT
                  </Box>
                )}
              </StatusNode>
              
              {index < statusFlow.length - 1 && (
                <FlowArrow 
                  direction="right" 
                  isActive={index < currentStatusIndex}
                >
                  →
                </FlowArrow>
              )}
            </React.Fragment>
          ))}
        </Box>

        {/* Alternative Paths */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
          {/* Cancellation Path */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <StatusNode
              isCurrent={currentStatus === 'CANCELLED'}
              status="CANCELLED"
              isActive={currentStatus === 'CANCELLED'}
              isTerminal={true}
              elevation={currentStatus === 'CANCELLED' ? 4 : 1}
            >
              <Typography variant="caption" sx={{ fontWeight: 600, color: getStatusColor('CANCELLED') }}>
                CANCELLED
              </Typography>
              <DurationBadge>N/A</DurationBadge>
            </StatusNode>
          </Box>

          {/* Rejection and Rework Loop */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, position: 'relative' }}>
            <StatusNode
              isCurrent={currentStatus === 'REJECTED'}
              status="REJECTED"
              isActive={currentStatus === 'REJECTED'}
              isTerminal={false}
              elevation={currentStatus === 'REJECTED' ? 4 : 1}
            >
              <Typography variant="caption" sx={{ fontWeight: 600, color: getStatusColor('REJECTED') }}>
                REJECTED
              </Typography>
              <DurationBadge>1-2 days</DurationBadge>
            </StatusNode>
            
            {/* Loop arrow back to IN PROGRESS */}
            <Box sx={{ 
              position: 'absolute', 
              top: -30, 
              right: -30,
              transform: 'rotate(45deg)',
              color: currentStatus === 'REJECTED' ? '#1976d2' : '#9e9e9e',
              fontSize: '1.5rem',
              fontWeight: 'bold'
            }}>
              ↻
            </Box>
          </Box>
        </Box>

        {/* Status Duration Legend with Team Analytics */}
        <Box sx={{ mt: 3, p: 2, bgcolor: '#f8f9fa', borderRadius: 1, width: '100%' }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: '#212529' }}>
            Status Duration Guide (Based on Real Data)
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
            {statusFlow.map((status) => (
              <Chip
                key={status.name}
                label={`${status.name}: ${getEstimatedDuration(status.name)}`}
                size="small"
                sx={{
                  bgcolor: status.name === currentStatus ? '#e3f2fd' : '#ffffff',
                  border: `1px solid ${getStatusColor(status.name)}`,
                  color: getStatusColor(status.name),
                  fontSize: '0.7rem',
                }}
              />
            ))}
            {alternativePaths.map((status) => (
              <Chip
                key={status.name}
                label={`${status.name}: ${getEstimatedDuration(status.name)}`}
                size="small"
                sx={{
                  bgcolor: status.name === currentStatus ? '#e3f2fd' : '#ffffff',
                  border: `1px solid ${getStatusColor(status.name)}`,
                  color: getStatusColor(status.name),
                  fontSize: '0.7rem',
                }}
              />
            ))}
          </Box>
          
          {/* Team Performance Summary */}
          {analyticsService && (
            <Box sx={{ mt: 2, p: 2, bgcolor: '#e8f5e8', borderRadius: 1, border: '1px solid #c3e6cb' }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: '#155724' }}>
                Team Performance Summary
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Array.from(analyticsService.getTeamMetrics() as any[]).slice(0, 5).map((team) => (
                  <Tooltip
                    key={team.team}
                    title={
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>{team.team}</Typography>
                        <br />
                        <Typography variant="caption">Completion Rate: {team.completionRate}%</Typography>
                        <br />
                        <Typography variant="caption">Velocity: {team.teamVelocity} issues</Typography>
                        <br />
                        <Typography variant="caption">Avg Story: {team.averageStoryCompletion} days</Typography>
                      </Box>
                    }
                  >
                    <Chip
                      label={`${team.team}: ${team.completionRate}%`}
                      size="small"
                      sx={{
                        bgcolor: team.completionRate >= 80 ? '#d4edda' : 
                                 team.completionRate >= 60 ? '#fff3cd' : '#f8d7da',
                        color: team.completionRate >= 80 ? '#155724' : 
                               team.completionRate >= 60 ? '#856404' : '#721c24',
                        fontSize: '0.7rem',
                        cursor: 'pointer'
                      }}
                    />
                  </Tooltip>
                ))}
              </Box>
            </Box>
          )}
        </Box>

        {/* Child Issues Status Summary */}
        {issueType === 'epic' && childIssues.length > 0 && (
          <Box sx={{ mt: 2, p: 2, bgcolor: '#fff3cd', borderRadius: 1, width: '100%', border: '1px solid #ffeaa7' }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: '#856404' }}>
              Child Stories Status Distribution
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {['OPEN', 'IN PROGRESS', 'UNDER REVIEW', 'APPROVED', 'DONE'].map((status) => {
                const count = childIssues.filter((story: any) => 
                  story.status.toUpperCase().includes(status.split(' ')[0]) || 
                  story.status.toUpperCase() === status
                ).length;
                if (count === 0) return null;
                
                return (
                  <Chip
                    key={status}
                    label={`${status}: ${count}`}
                    size="small"
                    sx={{
                      bgcolor: '#ffffff',
                      border: `1px solid ${getStatusColor(status)}`,
                      color: getStatusColor(status),
                      fontSize: '0.7rem',
                    }}
                  />
                );
              })}
            </Box>
          </Box>
        )}
      </FlowContainer>
    </Box>
  );
};

export default StatusFlowVisualization;
