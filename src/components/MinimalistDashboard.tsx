import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';
import { ArrowUp, ArrowDown, Activity, Code, Users, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import JiraClient from '../lib/jira';
import { jiraConfig } from '../config/jira';
import { transformSprintData, transformFeatureStatus, transformTeamMetrics } from '../lib/jira';
import axios from 'axios';
import Link from 'next/link';

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

// Metric Card Component
const MetricCard = ({ title, current, target, trend, status, isDummyData = false, children }) => {
  const [expanded, setExpanded] = useState(false);
  
  const statusColors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500'
  };
  
  const getStatusIcon = () => {
    if (trend === 'up') {
      return <ArrowUp className="text-green-500" size={20} />;
    } else {
      return <ArrowDown className="text-red-500" size={20} />;
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-4">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {isDummyData && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Demo Data</span>
          )}
        </div>
        <div className={`w-3 h-3 rounded-full ${statusColors[status]}`}></div>
      </div>
      
      <div className="flex justify-between items-end mb-4">
        <div>
          <p className="text-sm text-gray-500">Current</p>
          <p className="text-3xl font-bold">{current}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Target</p>
          <p className="text-xl font-semibold">{target}</p>
        </div>
        <div className="flex items-center">
          {getStatusIcon()}
        </div>
      </div>
      
      <div 
        className="cursor-pointer text-blue-500 flex items-center text-sm"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <>
            <span>Hide details</span>
            <ChevronUp size={16} />
          </>
        ) : (
          <>
            <span>Show details</span>
            <ChevronDown size={16} />
          </>
        )}
      </div>
      
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          {children}
        </div>
      )}
    </div>
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

const SurveyCell = ({ activeCount }) => (
  <div className="bg-white rounded-lg shadow-md p-4 mb-4 flex flex-col justify-between">
    <div>
      <h3 className="text-lg font-semibold mb-2">Surveys & Feedback</h3>
      <p className="text-slate-700 mb-2">Active Surveys: <span className="font-bold">{activeCount}</span></p>
      <p className="text-slate-500 text-sm mb-4">Collect feedback from your team and stakeholders to improve project outcomes.</p>
    </div>
    <Link href="/surveys" className="inline-block bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 text-sm font-medium text-center">Go to Surveys</Link>
  </div>
);

const MinimalistDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    sprintProgress: { completed: 0, inProgress: 0, planned: 0 },
    featureStatus: { completed: 0, inProgress: 0, blocked: 0 },
    teamMetrics: [],
    performanceTrend: [],
    metricStatus: [],
    actionItems: []
  });
  const [targets, setTargets] = useState(getTargets());
  const [surveyCount, setSurveyCount] = useState(0);
  const [activeSurveyCount, setActiveSurveyCount] = useState(0);

  useEffect(() => {
    const fetchJiraData = async () => {
      try {
        setLoading(true);
        
        // Log the Jira configuration
        console.log('Jira Config:', {
          baseUrl: process.env.NEXT_PUBLIC_JIRA_BASE_URL,
          email: process.env.NEXT_PUBLIC_JIRA_EMAIL,
          boardId: process.env.NEXT_PUBLIC_JIRA_BOARD_ID,
          projectKey: process.env.NEXT_PUBLIC_JIRA_PROJECT_KEY,
          hasToken: !!process.env.NEXT_PUBLIC_JIRA_API_TOKEN
        });

        // Initialize Jira client
        const jiraClient = new JiraClient({
          baseUrl: process.env.NEXT_PUBLIC_JIRA_BASE_URL || '',
          email: process.env.NEXT_PUBLIC_JIRA_EMAIL || '',
          apiToken: process.env.NEXT_PUBLIC_JIRA_API_TOKEN || ''
        });

        // First, test the connection with the simplest possible endpoint
        console.log('Testing connection with /myself endpoint...');
        try {
          const testResponse = await jiraClient.testConnection();
          console.log('Connection successful! User info:', testResponse);
        } catch (error) {
          console.error('Connection test failed:', error);
          if (axios.isAxiosError(error)) {
            const errorMessage = error.response?.data?.message || error.message;
            throw new Error(`Failed to connect to Jira: ${error.response?.status} ${error.response?.statusText} - ${errorMessage}`);
          }
          throw new Error('Failed to connect to Jira. Please check your credentials and base URL.');
        }

        // If connection test passes, proceed with fetching data
        console.log('Fetching active sprint...');
        const sprintResponse = await jiraClient.getActiveSprint(Number(process.env.NEXT_PUBLIC_JIRA_BOARD_ID));
        console.log('Sprint response:', sprintResponse);
        
        if (!sprintResponse.values || sprintResponse.values.length === 0) {
          throw new Error('No active sprint found');
        }

        const activeSprint = sprintResponse.values[0];
        console.log('Active sprint:', activeSprint);

        // Fetch sprint issues
        console.log('Fetching sprint issues...');
        const sprintIssues = await jiraClient.getSprintIssues(activeSprint.id);
        console.log('Sprint issues:', sprintIssues);

        // Fetch team members
        console.log('Fetching team members...');
        const teamMembers = await jiraClient.getTeamMembers(process.env.NEXT_PUBLIC_JIRA_PROJECT_KEY || '') as TeamMember[];
        console.log('Team Members:', teamMembers);

        // Transform data
        const sprintProgress = transformSprintData(sprintIssues);
        const featureStatus = transformFeatureStatus(sprintIssues.issues);
        const teamMetrics = transformTeamMetrics(sprintIssues.issues, teamMembers);

        // Calculate performance trend (last 6 sprints)
        const performanceTrend = await calculatePerformanceTrend(jiraClient);

        setDashboardData({
          sprintProgress,
          featureStatus,
          teamMetrics,
          performanceTrend,
          metricStatus: calculateMetricStatus(sprintIssues.issues),
          actionItems: calculateActionItems(sprintIssues.issues)
        });

        setTargets(getTargets());
        setLoading(false);

        // Survey summary
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('dashboard_surveys');
          if (stored) {
            const surveys = JSON.parse(stored);
            setSurveyCount(surveys.length);
            setActiveSurveyCount(surveys.filter(s => s.status === 'active').length);
          }
        }
      } catch (error) {
        console.error('Error fetching Jira data:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch Jira data');
        setLoading(false);
      }
    };

    fetchJiraData();
  }, []);

  // Helper functions for data transformation
  const calculatePerformanceTrend = async (jira: JiraClient) => {
    // Implementation for fetching historical sprint data
    // This is a placeholder - you'll need to implement the actual logic
    return [
      { month: 'Jan', value: 85 },
      { month: 'Feb', value: 87 },
      { month: 'Mar', value: 83 },
      { month: 'Apr', value: 88 },
      { month: 'May', value: 91 },
      { month: 'Jun', value: 86 }
    ];
  };

  const calculateMetricStatus = (issues: any[]) => {
    const total = issues.length;
    return [
      { name: 'On Target', value: Math.round((issues.filter(i => i.fields.status.name === 'Done').length / total) * 100), color: '#4CAF50' },
      { name: 'At Risk', value: Math.round((issues.filter(i => ['In Progress', 'In Review'].includes(i.fields.status.name)).length / total) * 100), color: '#FF9800' },
      { name: 'Below Target', value: Math.round((issues.filter(i => ['To Do', 'Backlog'].includes(i.fields.status.name)).length / total) * 100), color: '#F44336' }
    ];
  };

  const calculateActionItems = (issues: any[]) => {
    const total = issues.length;
    return [
      { name: 'Completed', value: Math.round((issues.filter(i => i.fields.status.name === 'Done').length / total) * 100), color: '#4CAF50' },
      { name: 'In Progress', value: Math.round((issues.filter(i => ['In Progress', 'In Review'].includes(i.fields.status.name)).length / total) * 100), color: '#3B82F6' },
      { name: 'Planned', value: Math.round((issues.filter(i => ['To Do', 'Backlog'].includes(i.fields.status.name)).length / total) * 100), color: '#9CA3AF' }
    ];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading dashboard data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg">
          <h2 className="text-xl font-bold text-red-600 mb-4">Error Loading Dashboard</h2>
          <p className="text-gray-700 mb-4">{error}</p>
          <div className="text-sm text-gray-500">
            <p>Please check:</p>
            <ul className="list-disc list-inside mt-2">
              <li>Your Jira credentials in .env.local</li>
              <li>Your board ID and project key</li>
              <li>Your network connection</li>
              <li>Jira API access permissions</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Dashboard Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Product Owner Dashboard</h1>
              <p className="text-sm text-slate-500 mt-1">Updated: {new Date().toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-3">
              <a href="/configure-targets" className="text-indigo-600 hover:underline text-sm font-medium">Configure Targets</a>
              <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg">
                <div className="font-medium text-slate-700">Overall Score</div>
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-bold text-emerald-600">
                    {Math.round(
                      (dashboardData.sprintProgress.completed /
                        (dashboardData.sprintProgress.completed +
                          dashboardData.sprintProgress.inProgress +
                          dashboardData.sprintProgress.planned)) *
                        100
                    )}%
                  </span>
                  <ArrowUp className="text-emerald-500" size={16} />
                </div>
              </div>
              <div className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium">
                Good
              </div>
            </div>
          </div>
          <div className="flex space-x-6 pt-1 pb-2">
            <button
              className={`px-3 py-2 font-medium text-sm rounded-md ${
                activeTab === 'overview' ? 'text-indigo-700 bg-indigo-50' : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => setActiveTab('overview')}
            >
              Overview
            </button>
            <button
              className={`px-3 py-2 font-medium text-sm rounded-md ${
                activeTab === 'team' ? 'text-indigo-700 bg-indigo-50' : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => setActiveTab('team')}
            >
              Team Performance
            </button>
            <button
              className={`px-3 py-2 font-medium text-sm rounded-md ${
                activeTab === 'delivery' ? 'text-indigo-700 bg-indigo-50' : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => setActiveTab('delivery')}
            >
              Delivery Metrics
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Real Jira Data Widgets */}
            <MetricCard 
              title="Sprint Progress" 
              current={dashboardData.sprintProgress.completed}
              target={targets.sprintProgress}
              trend="up"
              status="green"
            >
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Completed', value: dashboardData.sprintProgress.completed, color: '#3B82F6' },
                      { name: 'In Progress', value: dashboardData.sprintProgress.inProgress, color: '#4CAF50' },
                      { name: 'Planned', value: dashboardData.sprintProgress.planned, color: '#FFB74D' }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {[
                      { name: 'Completed', value: dashboardData.sprintProgress.completed, color: '#3B82F6' },
                      { name: 'In Progress', value: dashboardData.sprintProgress.inProgress, color: '#4CAF50' },
                      { name: 'Planned', value: dashboardData.sprintProgress.planned, color: '#FFB74D' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </MetricCard>

            <MetricCard 
              title="Feature Status" 
              current={dashboardData.featureStatus.completed}
              target={targets.featureStatus}
              trend="up"
              status="green"
            >
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={[
                  { name: 'Completed', value: dashboardData.featureStatus.completed },
                  { name: 'In Progress', value: dashboardData.featureStatus.inProgress },
                  { name: 'Blocked', value: dashboardData.featureStatus.blocked }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366F1" />
                </BarChart>
              </ResponsiveContainer>
            </MetricCard>

            {/* Demo Data Widgets */}
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

            {/* Survey Cell moved to the bottom */}
            <SurveyCell activeCount={activeSurveyCount} />
          </div>
        )}

        {activeTab === 'team' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Real Jira Data Widget */}
            <MetricCard 
              title="Team Utilization" 
              current={Math.round(dashboardData.teamMetrics.reduce((acc, curr) => acc + curr.value, 0) / dashboardData.teamMetrics.length)}
              target={targets.teamUtilization}
              trend="up"
              status="green"
            >
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={dashboardData.teamMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#4CAF50" />
                </BarChart>
              </ResponsiveContainer>
            </MetricCard>

            {/* Demo Data Widget */}
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
          </div>
        )}

        {activeTab === 'delivery' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Real Jira Data Widget */}
            <MetricCard 
              title="Sprint Velocity" 
              current={dashboardData.sprintProgress.completed}
              target={targets.sprintProgress}
              trend="up"
              status="green"
            >
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dashboardData.performanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" />
                </LineChart>
              </ResponsiveContainer>
            </MetricCard>

            {/* Demo Data Widget */}
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
          </div>
        )}
      </div>
    </div>
  );
};

export default MinimalistDashboard; 