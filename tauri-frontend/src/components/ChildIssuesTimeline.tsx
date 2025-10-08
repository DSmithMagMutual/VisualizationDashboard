import React from 'react';
import { Box, Typography, Paper, Chip, LinearProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import TimelineIcon from '@mui/icons-material/Timeline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import ErrorIcon from '@mui/icons-material/Error';

interface ChildIssuesTimelineProps {
  childIssues: any[];
  epicStatus: string;
  analyticsService?: any;
}

// Styled components for the timeline
const TimelineContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
}));

const TimelineItem = styled(Paper)<{ 
  isCompleted: boolean; 
  isBlocked: boolean;
  priority: 'high' | 'medium' | 'low';
}>(({ theme, isCompleted, isBlocked, priority }) => ({
  padding: theme.spacing(1.5),
  borderRadius: theme.spacing(1),
  border: isCompleted ? '2px solid #28a745' : isBlocked ? '2px solid #dc3545' : '1px solid #e0e0e0',
  backgroundColor: isCompleted ? '#f8fff9' : isBlocked ? '#fff8f8' : '#ffffff',
  position: 'relative',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    left: -8,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 12,
    height: 12,
    borderRadius: '50%',
    backgroundColor: isCompleted ? '#28a745' : isBlocked ? '#dc3545' : '#ffc107',
    border: '2px solid white',
    boxShadow: '0 0 0 2px #e0e0e0',
  },
  ...(priority === 'high' && {
    borderLeft: '4px solid #dc3545',
  }),
  ...(priority === 'medium' && {
    borderLeft: '4px solid #ffc107',
  }),
  ...(priority === 'low' && {
    borderLeft: '4px solid #28a745',
  }),
}));

const StatusIndicator = styled(Box)<{ status: string }>(({ status }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '2px 8px',
  borderRadius: '12px',
  fontSize: '0.7rem',
  fontWeight: 'bold',
  ...(status.toLowerCase().includes('done') && {
    backgroundColor: '#d4edda',
    color: '#155724',
  }),
  ...(status.toLowerCase().includes('progress') && {
    backgroundColor: '#fff3cd',
    color: '#856404',
  }),
  ...(status.toLowerCase().includes('review') && {
    backgroundColor: '#cce5ff',
    color: '#004085',
  }),
  ...(status.toLowerCase().includes('open') && {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  }),
}));

const ChildIssuesTimeline: React.FC<ChildIssuesTimelineProps> = ({
  childIssues,
  epicStatus,
  analyticsService,
}) => {
  // Safety check for childIssues
  if (!childIssues || !Array.isArray(childIssues)) {
    return (
      <Box sx={{ textAlign: 'center', py: 3, color: '#6c757d' }}>
        <TimelineIcon sx={{ fontSize: 48, color: '#dee2e6', mb: 1 }} />
        <Typography variant="body2">
          Invalid child stories data
        </Typography>
      </Box>
    );
  }

  if (childIssues.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 3, color: '#6c757d' }}>
        <TimelineIcon sx={{ fontSize: 48, color: '#dee2e6', mb: 1 }} />
        <Typography variant="body2">
          No child stories available for this epic
        </Typography>
      </Box>
    );
  }

  // Safe calculation function with error handling
  const calculateEstimatedCompletion = (story: any): { days: number; status: string } => {
    try {
      if (!story || !story.status) {
        return { days: 3, status: 'Unknown' };
      }

      const status = story.status.toLowerCase();
      
      if (status.includes('done')) {
        return { days: 0, status: 'Completed' };
      }
      
      // Safe analytics service calls
      if (analyticsService && typeof analyticsService.getStatusMetrics === 'function') {
        try {
          const statusMetrics = analyticsService.getStatusMetrics(story.status);
          if (statusMetrics && statusMetrics.averageDuration > 0) {
            return { days: statusMetrics.averageDuration, status: `${story.status} (Real Data)` };
          }
        } catch (error) {
          console.warn('Error getting status metrics:', error);
        }
        
        try {
          const team = story.team || 'Unknown';
          const teamMetrics = analyticsService.getTeamMetrics(team);
          if (teamMetrics && teamMetrics.averageStoryCompletion > 0) {
            return { days: teamMetrics.averageStoryCompletion, status: `${story.status} (Team Avg)` };
          }
        } catch (error) {
          console.warn('Error getting team metrics:', error);
        }
      }
      
      // Fallback to calculated estimate based on status complexity
      const statusComplexity: Record<string, number> = {
        'open': 3,
        'ready': 2,
        'creating': 5,
        'progress': 4,
        'testing': 3,
        'validating': 2,
        'review': 3,
        'approved': 1
      };
      
      const complexity = Object.entries(statusComplexity).find(([key]) => status.includes(key))?.[1] || 3;
      return { days: complexity, status: `${story.status} (Estimated)` };
    } catch (error) {
      console.warn('Error calculating completion for story:', story, error);
      return { days: 3, status: 'Error' };
    }
  };

  // Safe priority function
  const getPriority = (story: any): 'high' | 'medium' | 'low' => {
    try {
      if (!story || !story.status) return 'medium';
      
      const status = story.status.toLowerCase();
      
      if (status.includes('done')) return 'low';
      if (status.includes('progress') || status.includes('review')) return 'medium';
      if (status.includes('open') || status.includes('ready')) return 'high';
      
      return 'medium';
    } catch (error) {
      console.warn('Error getting priority for story:', story, error);
      return 'medium';
    }
  };

  // Safe blocked check
  const isBlocked = (story: any): boolean => {
    try {
      if (!story || !story.status) return false;
      
      const status = story.status.toLowerCase();
      return status.includes('blocked') || status.includes('waiting') || status.includes('on hold');
    } catch (error) {
      console.warn('Error checking if story is blocked:', story, error);
      return false;
    }
  };

  // Safe sorting with error handling
  const sortedStories = React.useMemo(() => {
    try {
      return [...childIssues].sort((a, b) => {
        try {
          const aCompleted = a?.status?.toLowerCase().includes('done') || false;
          const bCompleted = b?.status?.toLowerCase().includes('done') || false;
          
          if (aCompleted && !bCompleted) return 1;
          if (!aCompleted && bCompleted) return -1;
          
          const aPriority = getPriority(a);
          const bPriority = getPriority(b);
          
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[bPriority] - priorityOrder[aPriority];
        } catch (error) {
          console.warn('Error sorting stories:', error);
          return 0;
        }
      });
    } catch (error) {
      console.warn('Error creating sorted stories:', error);
      return childIssues;
    }
  }, [childIssues]);

  // Safe progress calculation
  const completedStories = React.useMemo(() => {
    try {
      return childIssues.filter(story => 
        story?.status?.toLowerCase().includes('done')
      ).length;
    } catch (error) {
      console.warn('Error calculating completed stories:', error);
      return 0;
    }
  }, [childIssues]);

  const totalStories = childIssues.length;
  const epicProgress = totalStories > 0 ? Math.round((completedStories / totalStories) * 100) : 0;

  // Safe epic completion estimation
  const estimatedEpicCompletion = React.useMemo(() => {
    try {
      const activeStories = childIssues.filter(story => 
        !story?.status?.toLowerCase().includes('done')
      );
      
      if (activeStories.length === 0) return 'All stories completed';
      
      const maxDays = Math.max(...activeStories.map(story => 
        calculateEstimatedCompletion(story).days
      ));
      
      if (maxDays === 0) return 'Ready for completion';
      if (maxDays <= 3) return `${maxDays} days`;
      if (maxDays <= 7) return `${Math.ceil(maxDays / 7)} weeks`;
      return `${Math.ceil(maxDays / 30)} months`;
    } catch (error) {
      console.warn('Error calculating epic completion:', error);
      return 'Calculating...';
    }
  }, [childIssues]);

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', fontWeight: 600, color: '#212529', mb: 2 }}>
        Child Issues Timeline
      </Typography>

      <TimelineContainer>
        {/* Epic Progress Summary */}
        <Paper sx={{ p: 2, bgcolor: '#e8f5e8', border: '1px solid #c3e6cb' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#155724' }}>
              Epic Progress: {epicProgress}% Complete
            </Typography>
            <Typography variant="caption" sx={{ color: '#155724', fontWeight: 500 }}>
              {completedStories}/{totalStories} stories completed
            </Typography>
          </Box>
          
          <LinearProgress 
            variant="determinate" 
            value={epicProgress} 
            sx={{ 
              height: 8, 
              borderRadius: 4,
              backgroundColor: '#c3e6cb',
              '& .MuiLinearProgress-bar': { 
                backgroundColor: '#28a745',
                borderRadius: 4
              }
            }} 
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
            <Typography variant="caption" sx={{ color: '#155724' }}>
              Epic Status: {epicStatus || 'Unknown'}
            </Typography>
            <Typography variant="caption" sx={{ color: '#155724', fontWeight: 600 }}>
              Est. Completion: {estimatedEpicCompletion}
            </Typography>
          </Box>
        </Paper>

        {/* Timeline Items */}
        <Box sx={{ position: 'relative' }}>
          {/* Timeline line */}
          <Box sx={{
            position: 'absolute',
            left: 4,
            top: 0,
            bottom: 0,
            width: 2,
            backgroundColor: '#e0e0e0',
            zIndex: 0
          }} />
          
          {sortedStories.map((story, index) => {
            try {
              const completion = calculateEstimatedCompletion(story);
              const priority = getPriority(story);
              const blocked = isBlocked(story);
              const isCompleted = story?.status?.toLowerCase().includes('done') || false;
              
              return (
                <TimelineItem
                  key={story?.key || `story-${index}`}
                  isCompleted={isCompleted}
                  isBlocked={blocked}
                  priority={priority}
                  sx={{ ml: 3, mb: 2, zIndex: 1, position: 'relative' }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="caption" sx={{ 
                          fontWeight: 600, 
                          color: '#0d6efd',
                          fontSize: '0.75rem'
                        }}>
                          {story?.key || 'Unknown'}
                        </Typography>
                        
                        <StatusIndicator status={story?.status || 'Unknown'}>
                          {story?.status || 'Unknown'}
                        </StatusIndicator>
                        
                        {story?.team && (
                          <Chip 
                            label={story.team} 
                            size="small" 
                            sx={{ 
                              height: 20,
                              fontSize: '0.6rem',
                              bgcolor: '#f8f9fa',
                              color: '#6c757d'
                            }} 
                          />
                        )}
                      </Box>
                      
                      <Typography variant="caption" sx={{ 
                        color: '#495057', 
                        display: 'block',
                        lineHeight: 1.3,
                        fontSize: '0.7rem'
                      }}>
                        {story?.summary || 'No summary available'}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      {isCompleted && <CheckCircleIcon sx={{ color: '#28a745', fontSize: 16 }} />}
                      {blocked && <ErrorIcon sx={{ color: '#dc3545', fontSize: 16 }} />}
                      {!isCompleted && !blocked && <PendingIcon sx={{ color: '#ffc107', fontSize: 16 }} />}
                    </Box>
                  </Box>
                  
                  {/* Progress and timing information */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" sx={{ color: '#6c757d', fontSize: '0.65rem' }}>
                        Est. Completion:
                      </Typography>
                      <Typography variant="caption" sx={{ 
                        fontWeight: 600, 
                        color: completion.days === 0 ? '#28a745' : '#ffc107',
                        fontSize: '0.65rem'
                      }}>
                        {completion.days === 0 ? 'Complete' : `${completion.days} days`}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" sx={{ color: '#6c757d', fontSize: '0.65rem' }}>
                        Priority:
                      </Typography>
                      <Box sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: priority === 'high' ? '#dc3545' : 
                                     priority === 'medium' ? '#ffc107' : '#28a745'
                      }} />
                    </Box>
                  </Box>
                  
                  {/* Progress bar for active stories */}
                  {!isCompleted && (
                    <Box sx={{ mt: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                        <Typography variant="caption" sx={{ color: '#6c757d', fontSize: '0.65rem' }}>
                          Progress
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#6c757d', fontSize: '0.65rem' }}>
                          {completion.status}
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={completion.days === 0 ? 100 : Math.max(10, 100 - (completion.days / 10) * 100)} 
                        sx={{ 
                          height: 4, 
                          borderRadius: 2,
                          backgroundColor: '#e9ecef',
                          '& .MuiLinearProgress-bar': { 
                            backgroundColor: blocked ? '#dc3545' : '#0d6efd',
                            borderRadius: 2
                          }
                        }} 
                      />
                    </Box>
                  )}
                </TimelineItem>
              );
            } catch (error) {
              console.warn('Error rendering story:', story, error);
              return (
                <Box key={`error-${index}`} sx={{ p: 2, bgcolor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: 1, ml: 3, mb: 2 }}>
                  <Typography variant="caption" sx={{ color: '#856404' }}>
                    Error rendering story: {story?.key || 'Unknown'}
                  </Typography>
                </Box>
              );
            }
          })}
        </Box>

        {/* Timeline Legend */}
        <Paper sx={{ p: 2, bgcolor: '#f8f9fa', border: '1px solid #e9ecef' }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: '#212529' }}>
            Timeline Legend
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#28a745' }} />
              <Typography variant="caption" sx={{ color: '#6c757d' }}>Completed</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ffc107' }} />
              <Typography variant="caption" sx={{ color: '#6c757d' }}>In Progress</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#dc3545' }} />
              <Typography variant="caption" sx={{ color: '#6c757d' }}>Blocked</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 4, height: 12, backgroundColor: '#dc3545' }} />
              <Typography variant="caption" sx={{ color: '#6c757d' }}>High Priority</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 4, height: 12, backgroundColor: '#ffc107' }} />
              <Typography variant="caption" sx={{ color: '#6c757d' }}>Medium Priority</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 4, height: 12, backgroundColor: '#28a745' }} />
              <Typography variant="caption" sx={{ color: '#6c757d' }}>Low Priority</Typography>
            </Box>
          </Box>
        </Paper>
      </TimelineContainer>
    </Box>
  );
};

export default ChildIssuesTimeline;
