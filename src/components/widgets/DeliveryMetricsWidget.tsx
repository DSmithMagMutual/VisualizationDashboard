import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, Chip, CircularProgress, Stack, Tabs, Tab, LinearProgress } from '@mui/material';
import { getProjectIssues } from '@/lib/jira-proxy';
import { useBoard } from '../MinimalistDashboard';
import { Clock, User, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface DeliveryMetricsWidgetProps {
  title?: string;
}

interface StatusTimeData {
  status: string;
  averageTime: number;
  totalIssues: number;
  color: string;
  maxTime: number;
  minTime: number;
}

interface IndividualPerformance {
  name: string;
  email: string;
  averageTimeToComplete: number;
  totalIssues: number;
  completedIssues: number;
  efficiency: number; // percentage of completed vs total assigned
  averageTimeInProgress: number;
  blockedIssues: number;
}

const DeliveryMetricsWidget: React.FC<DeliveryMetricsWidgetProps> = ({ 
  title = "Delivery Metrics" 
}) => {
  const { activeBoard } = useBoard();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [statusTimeData, setStatusTimeData] = useState<StatusTimeData[]>([]);
  const [individualPerformance, setIndividualPerformance] = useState<IndividualPerformance[]>([]);

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
        console.log('Fetching delivery metrics for project:', projectKey);
        
        const issuesData = await getProjectIssues(projectKey);
        console.log('Issues data for delivery metrics:', issuesData);
        
        clearTimeout(timeoutId);
        
        if (!issuesData.issues) {
          throw new Error('No issues found');
        }

        const issues = issuesData.issues;
        
        // Calculate status time metrics
        const statusMetrics = calculateStatusTimeMetrics(issues);
        setStatusTimeData(statusMetrics);
        
        // Calculate individual performance metrics
        const individualMetrics = calculateIndividualPerformance(issues);
        setIndividualPerformance(individualMetrics);
        
      } catch (err) {
        console.error('DeliveryMetricsWidget error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch delivery metrics');
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

  const calculateStatusTimeMetrics = (issues: any[]): StatusTimeData[] => {
    const statusMap = new Map<string, { 
      totalTime: number; 
      count: number; 
      times: number[];
      maxTime: number;
      minTime: number;
    }>();
    
    issues.forEach((issue: any) => {
      const status = issue.fields.status?.name || 'Unknown';
      const created = new Date(issue.fields.created);
      const updated = new Date(issue.fields.updated);
      const timeInStatus = (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24); // days
      
      const existing = statusMap.get(status) || { 
        totalTime: 0, 
        count: 0, 
        times: [],
        maxTime: 0,
        minTime: Infinity
      };
      
      existing.totalTime += timeInStatus;
      existing.count += 1;
      existing.times.push(timeInStatus);
      existing.maxTime = Math.max(existing.maxTime, timeInStatus);
      existing.minTime = Math.min(existing.minTime, timeInStatus);
      
      statusMap.set(status, existing);
    });

    const statusColors: Record<string, string> = {
      'To Do': '#6C63FF',
      'In Progress': '#ffb300',
      'Done': '#4caf50',
      'Blocked': '#f44336',
      'Review': '#9c27b0',
      'Testing': '#ff9800',
      'Unknown': '#757575'
    };

    return Array.from(statusMap.entries()).map(([status, data]) => ({
      status,
      averageTime: Math.round(data.totalTime / data.count * 10) / 10, // round to 1 decimal
      totalIssues: data.count,
      color: statusColors[status] || '#757575',
      maxTime: Math.round(data.maxTime * 10) / 10,
      minTime: Math.round(data.minTime * 10) / 10
    })).sort((a, b) => b.averageTime - a.averageTime);
  };

  const calculateIndividualPerformance = (issues: any[]): IndividualPerformance[] => {
    const individualMap = new Map<string, IndividualPerformance>();
    
    issues.forEach((issue: any) => {
      if (!issue.fields.assignee) return;
      
      const assignee = issue.fields.assignee;
      const name = assignee.displayName || assignee.emailAddress;
      const email = assignee.emailAddress;
      const isCompleted = issue.fields.status?.statusCategory?.key === 'done';
      const isBlocked = issue.fields.status?.name?.toLowerCase().includes('blocked') || 
                       issue.fields.status?.name?.toLowerCase().includes('block');
      
      const created = new Date(issue.fields.created);
      const updated = new Date(issue.fields.updated);
      const timeToComplete = (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24); // days
      
      const existing = individualMap.get(email) || {
        name,
        email,
        averageTimeToComplete: 0,
        totalIssues: 0,
        completedIssues: 0,
        efficiency: 0,
        averageTimeInProgress: 0,
        blockedIssues: 0
      };
      
      existing.totalIssues += 1;
      if (isBlocked) {
        existing.blockedIssues += 1;
      }
      
      if (isCompleted) {
        existing.completedIssues += 1;
        existing.averageTimeToComplete = 
          (existing.averageTimeToComplete * (existing.completedIssues - 1) + timeToComplete) / existing.completedIssues;
      } else if (issue.fields.status?.statusCategory?.key === 'indeterminate') {
        // Calculate average time in progress for non-completed issues
        const inProgressTime = timeToComplete;
        const currentInProgressCount = existing.totalIssues - existing.completedIssues;
        existing.averageTimeInProgress = 
          (existing.averageTimeInProgress * (currentInProgressCount - 1) + inProgressTime) / currentInProgressCount;
      }
      
      existing.efficiency = Math.round((existing.completedIssues / existing.totalIssues) * 100);
      individualMap.set(email, existing);
    });

    return Array.from(individualMap.values())
      .filter(individual => individual.totalIssues > 0)
      .sort((a, b) => b.efficiency - a.efficiency);
  };

  const formatTime = (days: number): string => {
    if (days < 1) {
      const hours = Math.round(days * 24);
      return `${hours}h`;
    } else if (days < 7) {
      return `${Math.round(days)}d`;
    } else {
      const weeks = Math.round(days / 7 * 10) / 10;
      return `${weeks}w`;
    }
  };

  const getEfficiencyColor = (efficiency: number): string => {
    if (efficiency >= 80) return '#4caf50';
    if (efficiency >= 60) return '#ffb300';
    return '#f44336';
  };

  const getTimeEfficiencyColor = (avgTime: number): string => {
    if (avgTime <= 3) return '#4caf50'; // Good: 3 days or less
    if (avgTime <= 7) return '#ffb300'; // Warning: 3-7 days
    return '#f44336'; // Poor: more than 7 days
  };

  if (loading) {
    return (
      <Card sx={{ mb: 2, maxWidth: 800, mx: 'auto', borderRadius: 3, boxShadow: 6, bgcolor: 'background.paper', backdropFilter: 'blur(8px)' }} aria-busy="true" aria-label="Loading delivery metrics" role="status">
        <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
          <CircularProgress color="primary" size={40} aria-label="Loading" sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Loading delivery metrics…
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
      <Card sx={{ mb: 2, maxWidth: 800, mx: 'auto', borderRadius: 3, boxShadow: 6, bgcolor: 'background.paper', backdropFilter: 'blur(8px)' }} aria-label="Delivery metrics error" role="alert">
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
    <Card sx={{ mb: 2, maxWidth: 800, mx: 'auto', borderRadius: 3, boxShadow: 6, bgcolor: 'background.paper', backdropFilter: 'blur(8px)' }} aria-label="Delivery metrics" role="region" tabIndex={0}>
      <CardContent sx={{ p: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <Clock color="primary" size={24} />
          <Typography variant="h6" fontWeight={700} color="text.primary" id="delivery-metrics-title">
            {title}
          </Typography>
        </Stack>
        
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 2 }}>
          <Tab label="Status Times" icon={<TrendingUp size={16} />} />
          <Tab label="Team Performance" icon={<User size={16} />} />
        </Tabs>

        {activeTab === 0 && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" mb={2}>
              Average time issues spend in each status
            </Typography>
            <Box component="ul" aria-labelledby="delivery-metrics-title" sx={{ listStyle: 'none', p: 0, m: 0 }}>
              {statusTimeData.map((statusData) => (
                <Box component="li" key={statusData.status} display="flex" flexDirection="column" py={1} borderBottom="1px solid rgba(255,255,255,0.1)">
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box width={12} height={12} borderRadius="50%" bgcolor={statusData.color} />
                      <Typography variant="body2" color="#fff" sx={{ fontWeight: 500 }}>
                        {statusData.status}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" color="#fff" sx={{ fontWeight: 600 }}>
                        {formatTime(statusData.averageTime)}
                      </Typography>
                      <Chip 
                        label={`${statusData.totalIssues} issues`} 
                        size="small" 
                        sx={{ 
                          bgcolor: '#23293A', 
                          color: '#fff', 
                          fontWeight: 700, 
                          borderRadius: 2,
                          fontSize: '0.75rem'
                        }} 
                      />
                    </Box>
                  </Box>
                  <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                    <Typography variant="caption" color="text.secondary">
                      Range: {formatTime(statusData.minTime)} - {formatTime(statusData.maxTime)}
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min((statusData.averageTime / 14) * 100, 100)} // Scale to 14 days max
                    sx={{ 
                      height: 4, 
                      borderRadius: 2, 
                      background: 'rgba(255,255,255,0.1)',
                      '& .MuiLinearProgress-bar': { 
                        background: statusData.color,
                        borderRadius: 2
                      } 
                    }}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {activeTab === 1 && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" mb={2}>
              Individual performance metrics
            </Typography>
            <Box component="ul" aria-labelledby="delivery-metrics-title" sx={{ listStyle: 'none', p: 0, m: 0 }}>
              {individualPerformance.map((individual) => (
                <Box component="li" key={individual.email} display="flex" flexDirection="column" py={1} borderBottom="1px solid rgba(255,255,255,0.1)">
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Box>
                      <Typography variant="body2" color="#fff" sx={{ fontWeight: 600 }}>
                        {individual.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {individual.email}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip 
                        label={`${individual.completedIssues}/${individual.totalIssues}`} 
                        size="small" 
                        sx={{ 
                          bgcolor: getEfficiencyColor(individual.efficiency),
                          color: '#fff', 
                          fontWeight: 700, 
                          borderRadius: 2,
                          fontSize: '0.75rem'
                        }} 
                      />
                    </Box>
                  </Box>
                  
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Box textAlign="center">
                        <Typography variant="body2" color="#fff" sx={{ fontWeight: 600 }}>
                          {formatTime(individual.averageTimeToComplete)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          avg completion
                        </Typography>
                      </Box>
                      <Box textAlign="center">
                        <Typography variant="body2" color="#fff" sx={{ fontWeight: 600 }}>
                          {individual.efficiency}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          efficiency
                        </Typography>
                      </Box>
                      {individual.blockedIssues > 0 && (
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <AlertTriangle size={14} color="#f44336" />
                          <Typography variant="caption" color="#f44336">
                            {individual.blockedIssues} blocked
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                  
                  <Box display="flex" gap={1} mb={0.5}>
                    <LinearProgress 
                      variant="determinate" 
                      value={individual.efficiency}
                      sx={{ 
                        flex: 1,
                        height: 4, 
                        borderRadius: 2, 
                        background: 'rgba(255,255,255,0.1)',
                        '& .MuiLinearProgress-bar': { 
                          background: getEfficiencyColor(individual.efficiency),
                          borderRadius: 2
                        } 
                      }}
                    />
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default DeliveryMetricsWidget; 