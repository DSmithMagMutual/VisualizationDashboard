import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip, Legend } from 'recharts';
import { ArrowUp } from 'lucide-react';
import JiraClient from '../lib/jira';
import { jiraConfig } from '../config/jira';
import { transformSprintData, transformFeatureStatus, transformTeamMetrics } from '../lib/jira';
import axios from 'axios';

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

        // First, test the connection with a simple endpoint
        console.log('Testing connection...');
        try {
          // Fetch from the new API route instead of calling JiraClient directly
          const testResponse = await axios.get('/api/jira-projects');
          console.log('Connection successful! Available projects:', testResponse.data);
        } catch (error) {
          console.error('Connection test failed:', error);
          if (axios.isAxiosError(error)) {
            throw new Error(`Failed to connect to Jira: ${error.response?.status} ${error.response?.statusText} - ${JSON.stringify(error.response?.data)}`);
          }
          throw new Error('Failed to connect to Jira. Please check your credentials and base URL.');
        }

        // If connection test passes, proceed with fetching data
        console.log('Fetching active sprint...');
        const sprintResponse = await axios.get('/api/jira-active-sprint');
        console.log('Sprint response:', sprintResponse);
        
        if (!sprintResponse.data || sprintResponse.data.values.length === 0) {
          throw new Error('No active sprint found');
        }

        const activeSprint = sprintResponse.data.values[0];
        console.log('Active sprint:', activeSprint);

        // Fetch sprint issues
        console.log('Fetching sprint issues...');
        const sprintIssues = await axios.get('/api/jira-sprint-issues', { params: { sprintId: activeSprint.id } });
        console.log('Sprint issues:', sprintIssues);

        // Fetch team members
        console.log('Fetching team members...');
        const teamMembers = await axios.get('/api/jira-team-members', { params: { projectKey: process.env.NEXT_PUBLIC_JIRA_PROJECT_KEY } }) as TeamMember[];
        console.log('Team Members:', teamMembers);

        // Transform data
        const sprintProgress = transformSprintData(sprintIssues.data.issues);
        const featureStatus = transformFeatureStatus(sprintIssues.data.issues);
        const teamMetrics = transformTeamMetrics(sprintIssues.data.issues, teamMembers);

        // Calculate performance trend (last 6 sprints)
        const performanceTrend = await calculatePerformanceTrend();

        setDashboardData({
          sprintProgress,
          featureStatus,
          teamMetrics,
          performanceTrend,
          metricStatus: calculateMetricStatus(sprintIssues.data.issues),
          actionItems: calculateActionItems(sprintIssues.data.issues)
        });

        setLoading(false);
      } catch (error) {
        console.error('Error fetching Jira data:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch Jira data');
        setLoading(false);
      }
    };

    fetchJiraData();
  }, []);

  // Helper functions for data transformation
  const calculatePerformanceTrend = async () => {
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
          <div className="grid grid-cols-3 gap-4 mb-4">
            {/* Sprint Progress Widget */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="text-gray-600 font-medium">Sprint Progress</div>
                <div className="text-indigo-500 font-medium">Current Sprint</div>
              </div>
              <div className="h-64 flex flex-col items-center justify-center">
                <div className="relative w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
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
                        startAngle={90}
                        endAngle={-270}
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
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Feature Status */}
            <div className="col-span-2 bg-white rounded-lg shadow p-6">
              <div className="text-gray-600 font-medium mb-4">Feature Status</div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
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
              </div>
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 font-medium mb-4">Team Performance</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.teamMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#4CAF50" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {activeTab === 'delivery' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-600 font-medium mb-4">Delivery Metrics</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.performanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#6366F1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MinimalistDashboard; 