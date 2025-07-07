import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';
import { ArrowUp, ArrowDown, Activity, Code, Users, Filter, ChevronDown, ChevronUp, AlertCircle, RefreshCw } from 'lucide-react';
import JiraClient from '../lib/jira';
import { jiraConfig } from '../config/jira';
import { transformSprintData, transformFeatureStatus, transformTeamMetrics } from '../lib/jira';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Divider,
  IconButton,
  CircularProgress,
  Tooltip as MuiTooltip,
  Paper,
  Tabs,
  Tab,
  Stack,
} from '@mui/material';
import Grid from '@mui/material/Grid';

interface DashboardData {
  sprintProgress: {
    completed: number;
    inProgress: number;
    planned: number;
  };
  featureStatus: {
    completed: number;
    inProgress: number;
    blocked: number;
  };
  teamMetrics: Array<{
    name: string;
    value: number;
  }>;
  performanceTrend: Array<{
    month: string;
    value: number;
  }>;
  metricStatus: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  actionItems: Array<{
    name: string;
    value: number;
    color: string;
  }>;
}

interface WidgetError {
  message: string;
  retry?: () => void;
}

interface SprintData {
  values: Array<{
    id: number;
    name: string;
    state: string;
  }>;
}

interface SprintIssues {
  issues: Array<{
    fields: {
      status: {
        name: string;
      };
      assignee?: {
        emailAddress: string;
      };
    };
  }>;
}

interface TeamMember {
  displayName: string;
  emailAddress: string;
}

const ErrorWidget = ({ title, error, onRetry }: { title: string; error: WidgetError; onRetry?: () => void }) => {
  return (
    <Card sx={{ mb: 1.5, maxWidth: 420, mx: 'auto', borderLeft: '4px solid #f44336', bgcolor: '#fff', boxShadow: 1 }}>
      <CardContent sx={{ p: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
          <Box display="flex" alignItems="center" gap={1}>
            <AlertCircle color="#f44336" size={18} />
            <Typography variant="subtitle1" color="error" fontWeight={600}>{title}</Typography>
          </Box>
          {onRetry && (
            <Button onClick={onRetry} size="small" startIcon={<RefreshCw size={14} />} color="primary" variant="outlined">
              Retry
            </Button>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" mb={0.5} fontSize={13}>{error.message}</Typography>
        <Paper variant="outlined" sx={{ p: 1, bgcolor: '#fafafa' }}>
          <Typography variant="caption" color="text.secondary" fontSize={12}>
            This widget is temporarily unavailable. Other widgets should continue to function normally.
          </Typography>
        </Paper>
      </CardContent>
    </Card>
  );
};

const LoadingWidget = ({ title }: { title: string }) => {
  return (
    <Card sx={{ mb: 2, maxWidth: 420, mx: 'auto' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="h6">{title}</Typography>
          <CircularProgress size={20} />
        </Box>
        <Box height={24} mb={1} bgcolor="#eee" borderRadius={1} />
        <Box height={24} width="75%" bgcolor="#eee" borderRadius={1} />
      </CardContent>
    </Card>
  );
};

const MetricCard = ({ title, current, target, trend, status, isDummyData = false, children }: {
  title: string;
  current: number;
  target: number;
  trend: 'up' | 'down';
  status: 'green' | 'yellow' | 'red';
  isDummyData?: boolean;
  children: React.ReactNode;
}) => {
  const [expanded, setExpanded] = useState(false);
  const statusColors: Record<string, string> = {
    green: '#4caf50',
    yellow: '#ffb300',
    red: '#f44336',
  };
  const getStatusIcon = () => (
    trend === 'up' ? <ArrowUp color="#4caf50" size={20} /> : <ArrowDown color="#f44336" size={20} />
  );
  return (
    <Card sx={{ mb: 2, maxWidth: 420, mx: 'auto' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Box>
            <Typography variant="h6">{title}</Typography>
            {isDummyData && <Chip label="Demo Data" size="small" sx={{ mt: 0.5 }} />}
          </Box>
          <Box width={16} height={16} borderRadius={8} bgcolor={statusColors[status]} />
        </Box>
        <Box display="flex" justifyContent="space-between" alignItems="flex-end" mb={2}>
          <Box>
            <Typography variant="caption" color="text.secondary">Current</Typography>
            <Typography variant="h4">{current}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Target</Typography>
            <Typography variant="h6">{target}</Typography>
          </Box>
          <Box display="flex" alignItems="center">{getStatusIcon()}</Box>
        </Box>
        <Button size="small" color="primary" onClick={() => setExpanded(e => !e)} endIcon={expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />} sx={{ mb: expanded ? 2 : 0 }}>
          {expanded ? 'Hide details' : 'Show details'}
        </Button>
        {expanded && <Divider sx={{ my: 2 }} />}
        {expanded && children}
      </CardContent>
    </Card>
  );
};

const SprintProgressWidget = ({ data, target, error, loading, onRetry }: {
  data?: { completed: number; inProgress: number; planned: number };
  target: number;
  error?: WidgetError;
  loading: boolean;
  onRetry?: () => void;
}) => {
  if (loading) return <LoadingWidget title="Sprint Progress" />;
  if (error) return <ErrorWidget title="Sprint Progress" error={error} onRetry={onRetry} />;
  if (!data) return null;
  return (
    <MetricCard title="Sprint Progress" current={data.completed} target={target} trend="up" status="green">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={[
              { name: 'Completed', value: data.completed, color: '#3B82F6' },
              { name: 'In Progress', value: data.inProgress, color: '#4CAF50' },
              { name: 'Planned', value: data.planned, color: '#FFB74D' }
            ]}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            dataKey="value"
          >
            {[
              { name: 'Completed', value: data.completed, color: '#3B82F6' },
              { name: 'In Progress', value: data.inProgress, color: '#4CAF50' },
              { name: 'Planned', value: data.planned, color: '#FFB74D' }
            ].map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </MetricCard>
  );
};

const FeatureStatusWidget = ({ data, target, error, loading, onRetry }: {
  data?: { completed: number; inProgress: number; blocked: number };
  target: number;
  error?: WidgetError;
  loading: boolean;
  onRetry?: () => void;
}) => {
  if (loading) return <LoadingWidget title="Feature Status" />;
  if (error) return <ErrorWidget title="Feature Status" error={error} onRetry={onRetry} />;
  if (!data) return null;
  return (
    <MetricCard title="Feature Status" current={data.completed} target={target} trend="up" status="green">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={[
          { name: 'Completed', value: data.completed },
          { name: 'In Progress', value: data.inProgress },
          { name: 'Blocked', value: data.blocked }
        ]}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#6366F1" />
        </BarChart>
      </ResponsiveContainer>
    </MetricCard>
  );
};

const TeamUtilizationWidget = ({ data, target, error, loading, onRetry }: {
  data?: Array<{ name: string; value: number }>;
  target: number;
  error?: WidgetError;
  loading: boolean;
  onRetry?: () => void;
}) => {
  if (loading) return <LoadingWidget title="Team Utilization" />;
  if (error) return <ErrorWidget title="Team Utilization" error={error} onRetry={onRetry} />;
  if (!data || data.length === 0) return null;
  const avgUtilization = Math.round(data.reduce((acc, curr) => acc + curr.value, 0) / data.length);
  return (
    <MetricCard title="Team Utilization" current={avgUtilization} target={target} trend="up" status="green">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#4CAF50" />
        </BarChart>
      </ResponsiveContainer>
    </MetricCard>
  );
};

const SprintVelocityWidget = ({ data, target, error, loading, onRetry }: {
  data?: Array<{ month: string; value: number }>;
  target: number;
  error?: WidgetError;
  loading: boolean;
  onRetry?: () => void;
}) => {
  if (loading) return <LoadingWidget title="Sprint Velocity" />;
  if (error) return <ErrorWidget title="Sprint Velocity" error={error} onRetry={onRetry} />;
  if (!data || data.length === 0) return null;
  const currentVelocity = data[data.length - 1]?.value || 0;
  return (
    <MetricCard title="Sprint Velocity" current={currentVelocity} target={target} trend="up" status="green">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#3b82f6" />
        </LineChart>
      </ResponsiveContainer>
    </MetricCard>
  );
};

const getTargets = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('dashboard_targets');
    if (stored) return JSON.parse(stored);
  }
  return {
    sprintProgress: 10,
    featureStatus: 10,
    teamUtilization: 80,
    codeQuality: 90,
    techDebt: 90,
    crossTeam: 85,
    codeReview: 85,
  };
};

const SurveyCell = ({ activeCount }: { activeCount: number }) => (
  <Card sx={{ mb: 2 }}>
    <CardContent>
      <Typography variant="h6" mb={1}>Surveys & Feedback</Typography>
      <Typography variant="body1" mb={1}>Active Surveys: <b>{activeCount}</b></Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Collect feedback from your team and stakeholders to improve project outcomes.
      </Typography>
      <Button variant="contained" color="primary">Go to Surveys</Button>
    </CardContent>
  </Card>
);

const MinimalistDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [targets, setTargets] = useState(getTargets());
  const [surveyCount, setSurveyCount] = useState(0);
  const [activeSurveyCount, setActiveSurveyCount] = useState(0);

  // Widget state management
  const [sprintProgressData, setSprintProgressData] = useState<{ completed: number; inProgress: number; planned: number } | undefined>(undefined);
  const [sprintProgressError, setSprintProgressError] = useState<WidgetError | undefined>(undefined);
  const [sprintProgressLoading, setSprintProgressLoading] = useState(true);

  const [featureStatusData, setFeatureStatusData] = useState<{ completed: number; inProgress: number; blocked: number } | undefined>(undefined);
  const [featureStatusError, setFeatureStatusError] = useState<WidgetError | undefined>(undefined);
  const [featureStatusLoading, setFeatureStatusLoading] = useState(true);

  const [teamMetricsData, setTeamMetricsData] = useState<Array<{ name: string; value: number }> | undefined>(undefined);
  const [teamMetricsError, setTeamMetricsError] = useState<WidgetError | undefined>(undefined);
  const [teamMetricsLoading, setTeamMetricsLoading] = useState(true);

  const [performanceTrendData, setPerformanceTrendData] = useState<Array<{ month: string; value: number }> | undefined>(undefined);
  const [performanceTrendError, setPerformanceTrendError] = useState<WidgetError | undefined>(undefined);
  const [performanceTrendLoading, setPerformanceTrendLoading] = useState(true);

  // Initialize Jira client
  const getJiraClient = () => {
    return new JiraClient({
      baseUrl: import.meta.env.VITE_JIRA_BASE_URL || '',
      email: import.meta.env.VITE_JIRA_EMAIL || '',
      apiToken: import.meta.env.VITE_JIRA_API_TOKEN || ''
    });
  };

  // Fetch sprint progress data
  const fetchSprintProgress = async () => {
    try {
      setSprintProgressLoading(true);
      setSprintProgressError(undefined);
      const jiraClient = getJiraClient();
      const sprintResponse = await jiraClient.getActiveSprint(Number(import.meta.env.VITE_JIRA_BOARD_ID));
      if (!sprintResponse.values || sprintResponse.values.length === 0) {
        throw new Error('No active sprint found');
      }
      const activeSprint = sprintResponse.values[0];
      const sprintIssues = await jiraClient.getSprintIssues(activeSprint.id);
      const sprintProgress = transformSprintData(sprintIssues);
      setSprintProgressData(sprintProgress);
    } catch (error) {
      setSprintProgressError({ message: error instanceof Error ? error.message : 'Failed to fetch sprint progress data' });
    } finally {
      setSprintProgressLoading(false);
    }
  };

  // Fetch feature status data
  const fetchFeatureStatus = async () => {
    try {
      setFeatureStatusLoading(true);
      setFeatureStatusError(undefined);
      const jiraClient = getJiraClient();
      const sprintResponse = await jiraClient.getActiveSprint(Number(import.meta.env.VITE_JIRA_BOARD_ID));
      if (!sprintResponse.values || sprintResponse.values.length === 0) {
        throw new Error('No active sprint found');
      }
      const activeSprint = sprintResponse.values[0];
      const sprintIssues = await jiraClient.getSprintIssues(activeSprint.id);
      const featureStatus = transformFeatureStatus(sprintIssues.issues);
      setFeatureStatusData(featureStatus);
    } catch (error) {
      setFeatureStatusError({ message: error instanceof Error ? error.message : 'Failed to fetch feature status data' });
    } finally {
      setFeatureStatusLoading(false);
    }
  };

  // Fetch team metrics data
  const fetchTeamMetrics = async () => {
    try {
      setTeamMetricsLoading(true);
      setTeamMetricsError(undefined);
      const jiraClient = getJiraClient();
      const sprintResponse = await jiraClient.getActiveSprint(Number(import.meta.env.VITE_JIRA_BOARD_ID));
      if (!sprintResponse.values || sprintResponse.values.length === 0) {
        throw new Error('No active sprint found');
      }
      const activeSprint = sprintResponse.values[0];
      const sprintIssues = await jiraClient.getSprintIssues(activeSprint.id);
      const teamMembers = await jiraClient.getTeamMembers(import.meta.env.VITE_JIRA_PROJECT_KEY || '') as TeamMember[];
      const teamMetrics = transformTeamMetrics(sprintIssues.issues, teamMembers);
      setTeamMetricsData(teamMetrics);
    } catch (error) {
      setTeamMetricsError({ message: error instanceof Error ? error.message : 'Failed to fetch team metrics data' });
    } finally {
      setTeamMetricsLoading(false);
    }
  };

  // Fetch performance trend data
  const fetchPerformanceTrend = async () => {
    try {
      setPerformanceTrendLoading(true);
      setPerformanceTrendError(undefined);
      // This is a placeholder - you'll need to implement the actual logic
      const performanceTrend = [
        { month: 'Jan', value: 85 },
        { month: 'Feb', value: 87 },
        { month: 'Mar', value: 83 },
        { month: 'Apr', value: 88 },
        { month: 'May', value: 91 },
        { month: 'Jun', value: 86 }
      ];
      setPerformanceTrendData(performanceTrend);
    } catch (error) {
      setPerformanceTrendError({ message: error instanceof Error ? error.message : 'Failed to fetch performance trend data' });
    } finally {
      setPerformanceTrendLoading(false);
    }
  };

  useEffect(() => {
    fetchSprintProgress();
    fetchFeatureStatus();
    fetchTeamMetrics();
    fetchPerformanceTrend();
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dashboard_surveys');
      if (stored) {
        const surveys = JSON.parse(stored);
        setSurveyCount(surveys.length);
        setActiveSurveyCount(surveys.filter((s: any) => s.status === 'active').length);
      }
    }
  }, []);

  // Tab labels
  const tabLabels = ['Overview', 'Team Performance', 'Delivery Metrics'];

  return (
    <Box minHeight="100vh" bgcolor="#f6f7fb">
      {/* Dashboard Header */}
      <Paper elevation={0} square sx={{ borderBottom: 1, borderColor: 'divider', mb: 0, bgcolor: '#fff' }}>
        <Box maxWidth="md" mx="auto" px={2} py={4}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>Product Owner Dashboard</Typography>
              <Typography variant="caption" color="text.secondary">Updated: {new Date().toLocaleDateString()}</Typography>
            </Box>
            <Stack direction="row" spacing={2} alignItems="center">
              <Button href="/configure-targets" color="primary" variant="text" size="small">Configure Targets</Button>
              <Paper elevation={0} sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#f0f4f8' }}>
                <Typography fontWeight={500} color="text.secondary">Overall Score</Typography>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Typography variant="h5" color="success.main" fontWeight={700}>
                    {sprintProgressData ? Math.round(
                      (sprintProgressData.completed /
                        (sprintProgressData.completed +
                          sprintProgressData.inProgress +
                          sprintProgressData.planned)) *
                      100
                    ) : 0}%
                  </Typography>
                  <ArrowUp color="#4caf50" size={16} />
                </Box>
              </Paper>
              <Chip label="Good" color="success" size="small" />
            </Stack>
          </Box>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mt: 2 }} textColor="primary" indicatorColor="primary">
            {tabLabels.map((label, idx) => (
              <Tab key={label} label={label} sx={{ fontWeight: 500, fontSize: 16, minWidth: 160 }} />
            ))}
          </Tabs>
        </Box>
      </Paper>
      <Box maxWidth="lg" mx="auto" px={2} py={5}>
        {activeTab === 0 && (
          <Grid container spacing={4} justifyContent="center" alignItems="flex-start">
            <Grid item xs={12} md={8}>
              <Stack spacing={3}>
                <SprintProgressWidget
                  data={sprintProgressData}
                  target={targets.sprintProgress}
                  error={sprintProgressError}
                  loading={sprintProgressLoading}
                  onRetry={fetchSprintProgress}
                />
                <FeatureStatusWidget
                  data={featureStatusData}
                  target={targets.featureStatus}
                  error={featureStatusError}
                  loading={featureStatusLoading}
                  onRetry={fetchFeatureStatus}
                />
              </Stack>
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack spacing={3}>
                <MetricCard 
                  title="Code Quality Score" 
                  current={85}
                  target={targets.codeQuality}
                  trend="up"
                  status="yellow"
                  isDummyData={true}
                >
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={[
                      { month: 'Jan', value: 82 },
                      { month: 'Feb', value: 83 },
                      { month: 'Mar', value: 84 },
                      { month: 'Apr', value: 85 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" stroke="#3b82f6" />
                    </LineChart>
                  </ResponsiveContainer>
                </MetricCard>
                <MetricCard 
                  title="Tech Debt Resolution" 
                  current={75}
                  target={targets.techDebt}
                  trend="up"
                  status="yellow"
                  isDummyData={true}
                >
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={[
                      { month: 'Jan', created: 15, resolved: 10 },
                      { month: 'Feb', created: 12, resolved: 14 },
                      { month: 'Mar', created: 10, resolved: 12 },
                      { month: 'Apr', created: 8, resolved: 11 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="created" fill="#ef4444" name="Created" />
                      <Bar dataKey="resolved" fill="#22c55e" name="Resolved" />
                    </BarChart>
                  </ResponsiveContainer>
                </MetricCard>
              </Stack>
            </Grid>
            <Grid item xs={12} md={8}>
              <SurveyCell activeCount={activeSurveyCount} />
            </Grid>
          </Grid>
        )}
        {activeTab === 1 && (
          <Grid container spacing={4} justifyContent="center" alignItems="flex-start">
            <Grid item xs={12} md={8}>
              <TeamUtilizationWidget
                data={teamMetricsData}
                target={targets.teamUtilization}
                error={teamMetricsError}
                loading={teamMetricsLoading}
                onRetry={fetchTeamMetrics}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <MetricCard 
                title="Cross-Team Collaboration" 
                current={82}
                target={targets.crossTeam}
                trend="up"
                status="yellow"
                isDummyData={true}
              >
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={[
                    { team: 'QA', interactions: 28, effectiveness: 85 },
                    { team: 'Product', interactions: 22, effectiveness: 78 },
                    { team: 'Design', interactions: 18, effectiveness: 82 },
                    { team: 'DevOps', interactions: 15, effectiveness: 90 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="team" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="interactions" fill="#9ca3af" name="Interactions" />
                    <Bar dataKey="effectiveness" fill="#3b82f6" name="Effectiveness %" />
                  </BarChart>
                </ResponsiveContainer>
              </MetricCard>
            </Grid>
          </Grid>
        )}
        {activeTab === 2 && (
          <Grid container spacing={4} justifyContent="center" alignItems="flex-start">
            <Grid item xs={12} md={8}>
              <Box display="flex" justifyContent="center">
                <SprintVelocityWidget
                  data={performanceTrendData}
                  target={targets.sprintProgress}
                  error={performanceTrendError}
                  loading={performanceTrendLoading}
                  onRetry={fetchPerformanceTrend}
                />
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <MetricCard 
                title="Code Review Efficiency" 
                current={78}
                target={targets.codeReview}
                trend="up"
                status="yellow"
                isDummyData={true}
              >
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={[
                    { month: 'Jan', efficiency: 72 },
                    { month: 'Feb', efficiency: 75 },
                    { month: 'Mar', efficiency: 78 },
                    { month: 'Apr', efficiency: 80 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="efficiency" stroke="#3b82f6" />
                  </LineChart>
                </ResponsiveContainer>
              </MetricCard>
            </Grid>
          </Grid>
        )}
      </Box>
    </Box>
  );
};

export default MinimalistDashboard; 