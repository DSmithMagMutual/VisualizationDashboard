'use client'

import React, { useState, useEffect } from "react";
import { Box, Card, CardContent, Typography, Button, TextField, LinearProgress, Chip, Tooltip, CircularProgress, IconButton } from '@mui/material';
import { Close, Refresh, ExpandMore, ExpandLess } from '@mui/icons-material';
import { BarChart } from '@mui/x-charts/BarChart';

const ITERATIONS = [
  { key: "4.1", label: "2025 Iteration 4.1", range: "July 9 - July 22" },
  { key: "4.2", label: "2025 Iteration 4.2", range: "July 23 - August 5" },
  { key: "4.3", label: "2025 Iteration 4.3", range: "August 6 - August 19" },
  { key: "4.4", label: "2025 Iteration 4.4", range: "August 20 - September 2" },
  { key: "4.5IP", label: "2025 Iteration 4.5IP", range: "September 3 - September 16" },
  { key: "uncommitted", label: "Uncommitted", range: "" },
];

const teamColorMap: Record<string, string> = {
  'OG Team': '#6C63FF',
  // Add more known teams and colors as needed
};

const statusColors: Record<string, string> = {
  'To Do': '#dc3545',
  'In Progress': '#fd7e14', 
  'Done': '#198754',
  'Ready': '#6c757d',
  'Ready for Release': '#6c757d',
  'Creating': '#fd7e14',
  'Validating': '#0d6efd',
  'UAT': '#fd7e14',
  'default': '#6c757d'
};

function getStatusCategory(status: string): string {
  const statusLower = status.toLowerCase();
  
  // Done statuses
  if (statusLower.includes('done') || 
      statusLower.includes('complete') || 
      statusLower.includes('closed') ||
      statusLower.includes('resolved')) {
    return 'Done';
  } 
  
  // In Progress statuses
  else if (statusLower.includes('progress') || 
           statusLower.includes('creating') || 
           statusLower.includes('uat') || 
           statusLower.includes('validating') ||
           statusLower.includes('testing') ||
           statusLower.includes('review') ||
           statusLower.includes('development') ||
           statusLower.includes('in development')) {
    return 'In Progress';
  } 
  
  // To Do statuses (including Ready statuses that haven't started)
  else if (statusLower.includes('ready') ||
           statusLower.includes('to do') ||
           statusLower.includes('open') ||
           statusLower.includes('new') ||
           statusLower.includes('backlog') ||
           statusLower.includes('selected for development') ||
           statusLower.includes('ready for development')) {
    return 'To Do';
  } 
  
  // Default to To Do for any unrecognized status
  else {
    return 'To Do';
  }
}

function getColorForTeam(team: string) {
  if (!team) return '#6c757d'; // Default gray color for undefined/null teams
  if (teamColorMap[team]) return teamColorMap[team];
  let hash = 0;
  for (let i = 0; i < team.length; i++) {
    hash = team.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
}

function StatusChart({ columns }: { columns: Record<string, any[]> }) {
  const statusCategories = ['To Do', 'In Progress', 'Done'];
  
  // Calculate data for each iteration
  const chartData = ITERATIONS.map(iter => {
    const cards = columns[iter.key] || [];
    const statusCounts: Record<string, number> = { 'To Do': 0, 'In Progress': 0, 'Done': 0 };
    
    cards.forEach(card => {
      // Count child stories instead of parent stories
      if (card.stories && card.stories.length > 0) {
        card.stories.forEach((story: any) => {
          const statusCategory = getStatusCategory(story.status);
          if (statusCounts.hasOwnProperty(statusCategory)) {
            statusCounts[statusCategory]++;
          }
        });
      } else {
        // If no child stories, count the parent story itself
        const statusCategory = getStatusCategory(card.status);
        if (statusCounts.hasOwnProperty(statusCategory)) {
          statusCounts[statusCategory]++;
        }
      }
    });
    
    return {
      iteration: iter.label,
      key: iter.key,
      'To Do': statusCounts['To Do'],
      'In Progress': statusCounts['In Progress'],
      'Done': statusCounts['Done']
    };
  });

  // Prepare data for MUI X Charts
  const xAxisData = chartData.map(d => d.iteration);
  const series = statusCategories.map(status => ({
    data: chartData.map(d => d[status as keyof typeof d] as number),
    color: statusColors[status] || statusColors.default
  }));

  return (
    <Card sx={{ 
      bgcolor: '#fff', 
      border: '1px solid #dee2e6', 
      borderRadius: 1, 
      boxShadow: 1, 
      mb: 4,
      maxWidth: '50%',
      mx: 'auto'
    }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} sx={{ color: '#212529', mb: 3 }}>
          Child Stories Status Distribution by Iteration
        </Typography>
        
        {/* MUI X Charts BarChart */}
        <Box sx={{ mb: 3, height: 400 }}>
          <BarChart
            xAxis={[{ 
              data: xAxisData,
              scaleType: 'band',
              categoryGapRatio: 0.3,
              barGapRatio: 0.1,
              label: 'Iterations',
              tickLabelPlacement: 'middle'
            }]}
            yAxis={[{
              label: 'Number of Stories'
            }]}
            series={series}
            height={350}
            barLabel={(item) => item.value?.toString() || ''}
            margin={{ left: 80, right: 20, top: 20, bottom: 80 }}

            sx={{
              '& .MuiChartsBar-label': {
                fill: '#212529',
                fontSize: '0.75rem',
                fontWeight: 600
              }
            }}
          />
        </Box>

        {/* Summary Table */}
        <Box sx={{ 
          bgcolor: '#f8f9fa', 
          borderRadius: 1, 
          p: 2, 
          border: '1px solid #e9ecef'
        }}>
          <Typography variant="subtitle2" sx={{ color: '#212529', fontWeight: 600, mb: 2 }}>
            Summary by Status (Child Stories)
          </Typography>
          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {statusCategories.map(status => {
              const total = chartData.reduce((sum, data) => sum + (data[status as keyof typeof data] as number), 0);
              return (
                <Box key={status} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: 0.5,
                      bgcolor: statusColors[status] || statusColors.default
                    }}
                  />
                  <Typography variant="body2" sx={{ color: '#212529', fontWeight: 500 }}>
                    {status}: {total}
                  </Typography>
                </Box>
              );
            })}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
              <Typography variant="body2" sx={{ color: '#212529', fontWeight: 600 }}>
                Total: {chartData.reduce((sum, data) => sum + data['To Do'] + data['In Progress'] + data['Done'], 0)}
              </Typography>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function TimeInStatusWidget({ columns }: { columns: Record<string, any[]> }) {
  // Calculate time in status data per iteration by team
  const calculateTimeInStatus = () => {
    const teams = new Set<string>();
    const statuses = new Set<string>();
    const timeData: Record<string, Record<string, Record<string, number[]>>> = {};
    
    // Collect all teams and statuses from each iteration
    Object.entries(columns).forEach(([iteration, cards]) => {
      cards.forEach(card => {
        if (card.stories && card.stories.length > 0) {
          card.stories.forEach((story: any) => {
            const team = story.team || card.team || 'Other';
            const status = story.status || 'Unknown';
            teams.add(team);
            statuses.add(status);
            
            if (!timeData[iteration]) {
              timeData[iteration] = {};
            }
            if (!timeData[iteration][team]) {
              timeData[iteration][team] = {};
            }
            if (!timeData[iteration][team][status]) {
              timeData[iteration][team][status] = [];
            }
            
            // Simulate time in status (in days) - in real implementation, this would come from Jira
            const timeInStatus = Math.floor(Math.random() * 30) + 1; // 1-30 days for demo
            timeData[iteration][team][status].push(timeInStatus);
          });
        }
      });
    });
    
      // Calculate averages per team across all iterations
  const teamAverages: Record<string, Record<string, number>> = {};
  
  Object.entries(timeData).forEach(([iteration, teamData]) => {
    Object.entries(teamData).forEach(([team, statusData]) => {
      if (!teamAverages[team]) {
        teamAverages[team] = {};
      }
      
      Object.entries(statusData).forEach(([status, times]) => {
        if (times.length > 0) {
          const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
          if (!teamAverages[team][status]) {
            teamAverages[team][status] = 0;
          }
          // Accumulate and average across iterations
          teamAverages[team][status] = (teamAverages[team][status] + avgTime) / 2;
        }
      });
    });
  });
  
  // Convert to array format for display
  const averages: Array<{
    team: string;
    done: number;
    creating: number;
    validating: number;
    ready: number;
  }> = [];
  
  Object.entries(teamAverages).forEach(([team, statusData]) => {
    averages.push({
      team,
      done: Math.round((statusData['Done'] || 0) * 10) / 10,
      creating: Math.round((statusData['Creating'] || 0) * 10) / 10,
      validating: Math.round((statusData['Validating'] || 0) * 10) / 10,
      ready: Math.round((statusData['Ready'] || 0) * 10) / 10,
    });
  });
  
  return averages;
};

const timeData = calculateTimeInStatus();
const teams = Array.from(new Set(timeData.map(item => item.team)));
  
  // Get color for team - using the same function as the rest of the page
  const getTeamColor = (team: string) => {
    return getColorForTeam(team);
  };
  

  
  return (
    <Card sx={{ 
      bgcolor: '#fff', 
      border: '1px solid #dee2e6', 
      borderRadius: 1, 
      boxShadow: 1, 
      mb: 4,
      maxWidth: '50%',
      mx: 'auto'
    }}>
      <CardContent sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} sx={{ color: '#212529', mb: 3 }}>
          Flow Time by Team and Status
        </Typography>
        
        {/* Table */}
        <Box sx={{ overflowX: 'auto' }}>
          <Box sx={{ 
            display: 'table', 
            width: '100%', 
            borderCollapse: 'collapse',
            border: '1px solid #dee2e6'
          }}>
            {/* Header */}
            <Box sx={{ display: 'table-row', bgcolor: '#f8f9fa' }}>
              <Box sx={{ display: 'table-cell', p: 2, border: '1px solid #dee2e6', fontWeight: 600, color: '#212529' }}>
                Team
              </Box>
              <Box sx={{ display: 'table-cell', p: 2, border: '1px solid #dee2e6', fontWeight: 600, textAlign: 'center', color: '#212529' }}>
                Done
              </Box>
              <Box sx={{ display: 'table-cell', p: 2, border: '1px solid #dee2e6', fontWeight: 600, textAlign: 'center', color: '#212529' }}>
                Creating
              </Box>
              <Box sx={{ display: 'table-cell', p: 2, border: '1px solid #dee2e6', fontWeight: 600, textAlign: 'center', color: '#212529' }}>
                Validating
              </Box>
              <Box sx={{ display: 'table-cell', p: 2, border: '1px solid #dee2e6', fontWeight: 600, textAlign: 'center', color: '#212529' }}>
                Ready
              </Box>
            </Box>
            
            {/* Data Rows */}
            {timeData.map((item, index) => (
              <Box key={index} sx={{ display: 'table-row' }}>
                <Box sx={{ display: 'table-cell', p: 2, border: '1px solid #dee2e6', color: '#212529' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        borderRadius: '50%',
                        bgcolor: getTeamColor(item.team)
                      }}
                    />
                    {item.team}
                  </Box>
                </Box>
                <Box sx={{ display: 'table-cell', p: 2, border: '1px solid #dee2e6', textAlign: 'center', color: '#212529' }}>
                  <Typography sx={{ color: statusColors['Done'], fontWeight: 500 }}>
                    {item.done}
                  </Typography>
                </Box>
                <Box sx={{ display: 'table-cell', p: 2, border: '1px solid #dee2e6', textAlign: 'center', color: '#212529' }}>
                  <Typography sx={{ color: statusColors['Creating'], fontWeight: 500 }}>
                    {item.creating}
                  </Typography>
                </Box>
                <Box sx={{ display: 'table-cell', p: 2, border: '1px solid #dee2e6', textAlign: 'center', color: '#212529' }}>
                  <Typography sx={{ color: statusColors['Validating'], fontWeight: 500 }}>
                    {item.validating}
                  </Typography>
                </Box>
                <Box sx={{ display: 'table-cell', p: 2, border: '1px solid #dee2e6', textAlign: 'center', color: '#212529' }}>
                  <Typography sx={{ color: statusColors['Ready'], fontWeight: 500 }}>
                    {item.ready}
                  </Typography>
                </Box>
              </Box>
            ))}
            
            {/* Total Row */}
            <Box sx={{ display: 'table-row', bgcolor: '#f8f9fa' }}>
              <Box sx={{ display: 'table-cell', p: 2, border: '1px solid #dee2e6', fontWeight: 600, color: '#212529' }}>
                Total (Time in Status - Average - Days)
              </Box>
              <Box sx={{ display: 'table-cell', p: 2, border: '1px solid #dee2e6', textAlign: 'center', fontWeight: 600 }}>
                <Typography sx={{ color: statusColors['Done'] }}>
                  {Math.round((timeData.reduce((sum, item) => sum + item.done, 0) / timeData.length) * 10) / 10}
                </Typography>
              </Box>
              <Box sx={{ display: 'table-cell', p: 2, border: '1px solid #dee2e6', textAlign: 'center', fontWeight: 600 }}>
                <Typography sx={{ color: statusColors['Creating'] }}>
                  {Math.round((timeData.reduce((sum, item) => sum + item.creating, 0) / timeData.length) * 10) / 10}
                </Typography>
              </Box>
              <Box sx={{ display: 'table-cell', p: 2, border: '1px solid #dee2e6', textAlign: 'center', fontWeight: 600 }}>
                <Typography sx={{ color: statusColors['Validating'] }}>
                  {Math.round((timeData.reduce((sum, item) => sum + item.validating, 0) / timeData.length) * 10) / 10}
                </Typography>
              </Box>
              <Box sx={{ display: 'table-cell', p: 2, border: '1px solid #dee2e6', textAlign: 'center', fontWeight: 600 }}>
                <Typography sx={{ color: statusColors['Ready'] }}>
                  {Math.round((timeData.reduce((sum, item) => sum + item.ready, 0) / timeData.length) * 10) / 10}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function DemoCard({ card, onDelete, onReload, isMinimized, onToggleMinimize }: { 
  card: any; 
  onDelete: () => void; 
  onReload: () => void;
  isMinimized: boolean;
  onToggleMinimize: () => void;
}) {
  const doneCount = card.stories?.filter((s: any) => s.statusCategory === 'done').length || 0;
  const totalCount = card.stories?.length || 0;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const team = card.team || 'Other';
  return (
    <Card sx={{ bgcolor: '#fff', border: '1px solid #dee2e6', borderRadius: 1, boxShadow: 1, mb: 2, position: 'relative' }}>
      <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5, zIndex: 1 }}>
        <Tooltip title={isMinimized ? "Expand card" : "Minimize card"}>
          <IconButton
            size="small"
            onClick={onToggleMinimize}
            sx={{ 
              color: '#6c757d', 
              bgcolor: 'rgba(108, 117, 125, 0.1)',
              borderRadius: 1,
              '&:hover': { bgcolor: 'rgba(108, 117, 125, 0.2)' }
            }}
          >
            {isMinimized ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}
          </IconButton>
        </Tooltip>
        <Tooltip title="Refresh card data">
          <IconButton
            size="small"
            onClick={onReload}
            sx={{ 
              color: '#0d6efd', 
              bgcolor: 'rgba(13, 110, 253, 0.1)',
              borderRadius: 1,
              '&:hover': { bgcolor: 'rgba(13, 110, 253, 0.2)' }
            }}
          >
            <Refresh fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Remove card">
          <IconButton
            size="small"
            onClick={onDelete}
            sx={{ 
              color: '#dc3545', 
              bgcolor: 'rgba(220, 53, 69, 0.1)',
              borderRadius: 1,
              '&:hover': { bgcolor: 'rgba(220, 53, 69, 0.2)' }
            }}
          >
            <Close fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <CardContent sx={{ p: 2, pr: isMinimized ? 8 : 6 }}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ color: '#0d6efd', flex: 1, minWidth: 0 }}>
            {card.key ? (
              <a href={card.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0d6efd', textDecoration: 'none', fontWeight: 600 }}>{card.key}</a>
            ) : card.name}
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1} mb={1} sx={{ flexWrap: 'wrap' }}>
          <Tooltip title={team} placement="top">
            <span style={{
              display: 'inline-block',
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: getColorForTeam(team),
              border: '1.5px solid #fff',
              boxShadow: '0 0 0 1px #dee2e6',
              flexShrink: 0
            }} />
          </Tooltip>
          <Typography variant="caption" sx={{ color: '#212529', fontWeight: 500, flexShrink: 0 }}>{team}</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Chip label={card.status} size="small" sx={{ bgcolor: '#f3f4f6', color: '#212529', fontWeight: 500, borderRadius: 1 }} />
        </Box>
        
        {/* Progress bar - always visible */}
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#495057', fontWeight: 500 }}>{doneCount}/{totalCount}</Typography>
          <span style={{ color: pct === 100 ? '#198754' : pct > 0 ? '#fd7e14' : '#dc3545', fontSize: 18, verticalAlign: 'middle' }}>{pct === 100 ? '✔️' : pct > 0 ? '⏳' : '⚠️'}</span>
          <Typography variant="body2" fontWeight={600} sx={{ color: pct === 100 ? '#198754' : pct > 0 ? '#fd7e14' : '#dc3545', fontSize: '0.875rem' }}>{pct}%</Typography>
        </Box>
        <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 1, background: '#e9ecef', '& .MuiLinearProgress-bar': { background: pct === 100 ? '#198754' : pct > 0 ? '#fd7e14' : '#dc3545' } }} />
        
        {!isMinimized && (
          <>
            <Typography variant="body2" sx={{ color: '#495057', fontSize: '0.95em', mb: 1, mt: 1 }}>
              {card.summary || 'Card subtitle or description'}
            </Typography>
            {card.stories && card.stories.length > 0 && (
              <Box mt={2}>
                <Typography variant="subtitle2" sx={{ color: '#212529', fontWeight: 600, mb: 1 }}>Child work items</Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  {card.stories.map((story: any) => (
                    <li key={story.key} style={{ marginBottom: 4 }}>
                      <a 
                        href={(process.env.NEXT_PUBLIC_JIRA_BASE_URL || 'https://magmutual.atlassian.net') + '/browse/' + story.key}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ 
                          fontWeight: 600, 
                          color: '#0d6efd', 
                          marginRight: 8,
                          textDecoration: 'none'
                        }}
                      >
                        {story.key}
                      </a>
                      <span style={{ color: '#495057', marginRight: 8 }}>{story.summary}</span>
                      <Tooltip title={story.team} placement="top">
                        <span style={{
                          display: 'inline-block',
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          background: getColorForTeam(story.team),
                          border: '1px solid #fff',
                          boxShadow: '0 0 0 1px #dee2e6',
                          marginRight: 4
                        }} />
                      </Tooltip>
                      <Chip label={story.status} size="small" sx={{ bgcolor: '#f3f4f6', color: '#212529', fontWeight: 500, borderRadius: 1 }} />
                    </li>
                  ))}
                </Box>
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

async function saveBoardState(columns: Record<string, any[]>, title?: string) {
  await fetch('/api/board-save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ columns, title }),
  });
}

async function loadBoardState(): Promise<{ columns: Record<string, any[]>; title?: string } | null> {
  try {
    const response = await fetch('/api/board-save');
    if (response.ok) {
      const data = await response.json();
      return data || null;
    }
  } catch (error) {
    console.error('Error loading board state:', error);
  }
  return null;
}

async function fetchJiraIssueWithStories(key: string) {
  // Fetch parent issue
  const res = await fetch(`/api/jira?endpoint=issue/${key}`);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || !data.key) return null;
  // Fetch child issues (stories/subtasks)
  const jql = encodeURIComponent(`parent=${key}`);
  const resStories = await fetch(`/api/jira?endpoint=search&jql=${jql}&fields=key,summary,status,issuetype,customfield_10001`);
  let stories: any[] = [];
  if (resStories.ok) {
    const dataStories = await resStories.json();
    stories = (dataStories.issues || []).map((s: any) => {
      // Extract team from customfield_10001 for child stories
      let storyTeam = 'Other';
      const field = s.fields.customfield_10001;
      if (typeof field === 'object' && field?.name) {
        storyTeam = field.name;
      } else if (typeof field === 'string' && field) {
        storyTeam = field;
      }
      return {
        key: s.key,
        summary: s.fields.summary,
        status: s.fields.status.name,
        statusCategory: s.fields.status.statusCategory.key,
        team: storyTeam,
      };
    });
  }
  // Extract team from customfield_10001
  let team = 'Other';
  const field = data.fields?.customfield_10001;
  if (typeof field === 'object' && field?.name) {
    team = field.name;
  } else if (typeof field === 'string' && field) {
    team = field;
  }
  return {
    key: data.key,
    url: (process.env.NEXT_PUBLIC_JIRA_BASE_URL || 'https://magmutual.atlassian.net') + '/browse/' + data.key,
    summary: data.fields?.summary,
    status: data.fields?.status?.name,
    statusCategory: data.fields?.status?.statusCategory?.key,
    stories,
    team,
  };
}

export default function DemoKanban() {
  const [columns, setColumns] = useState(() =>
    ITERATIONS.reduce((acc, iter) => {
      acc[iter.key] = [];
      return acc;
    }, {} as Record<string, any[]>)
  );
  const [inputs, setInputs] = useState(() =>
    ITERATIONS.reduce((acc, iter) => {
      acc[iter.key] = "";
      return acc;
    }, {} as Record<string, string>)
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [minimizedCards, setMinimizedCards] = useState<Set<string>>(new Set());
  const [boardTitle, setBoardTitle] = useState("Demo Iteration Board");
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  useEffect(() => {
    const loadSavedState = async () => {
      try {
        setLoading(true);
        const savedData = await loadBoardState();
        if (savedData) {
          // Load board title
          if (savedData.title) {
            setBoardTitle(savedData.title);
          }
          // Ensure all iteration keys are present in the loaded state
          const initializedColumns = ITERATIONS.reduce((acc, iter) => {
            acc[iter.key] = savedData.columns?.[iter.key] || [];
            return acc;
          }, {} as Record<string, any[]>);
          setColumns(initializedColumns);
        }
      } catch (error) {
        console.error('Error loading saved board state:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSavedState();
  }, []);

  const handleAddCard = async (colKey: string) => {
    const cardName = inputs[colKey].trim();
    if (!cardName) return;
    setError(null);
    
    // Check if card already exists in any column
    const allCards = Object.values(columns).flat();
    const existingCard = allCards.find(card => card.key === cardName);
    if (existingCard) {
      setError(`Card '${cardName}' already exists on the board.`);
      return;
    }
    
    const jira = await fetchJiraIssueWithStories(cardName);
    if (!jira) {
      setError(`Jira issue '${cardName}' not found.`);
      return;
    }
    const newColumns = {
      ...columns,
      [colKey]: [
        ...columns[colKey],
        jira,
      ],
    };
    setColumns(newColumns);
    setInputs(inputs => ({ ...inputs, [colKey]: "" }));
    await saveBoardState(newColumns, boardTitle);
  };

  const handleDeleteCard = async (colKey: string, cardIndex: number) => {
    const card = columns[colKey][cardIndex];
    const cardId = `${colKey}-${card.key}-${cardIndex}`;
    
    const newColumns = {
      ...columns,
      [colKey]: columns[colKey].filter((_, index) => index !== cardIndex)
    };
    setColumns(newColumns);
    
    // Remove from minimized cards if it was minimized
    setMinimizedCards(prev => {
      const newSet = new Set(prev);
      newSet.delete(cardId);
      return newSet;
    });
    
    await saveBoardState(newColumns, boardTitle);
  };

  const handleReloadCard = async (colKey: string, cardIndex: number) => {
    const card = columns[colKey][cardIndex];
    if (!card.key) return;
    
    setError(null);
    const updatedCard = await fetchJiraIssueWithStories(card.key);
    if (!updatedCard) {
      setError(`Failed to reload data for '${card.key}'.`);
      return;
    }
    
    const newColumns = {
      ...columns,
      [colKey]: columns[colKey].map((c, index) => index === cardIndex ? updatedCard : c)
    };
    setColumns(newColumns);
    await saveBoardState(newColumns, boardTitle);
  };

  const handleToggleMinimize = (colKey: string, cardIndex: number) => {
    const card = columns[colKey][cardIndex];
    const cardId = `${colKey}-${card.key}-${cardIndex}`;
    
    setMinimizedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cardId)) {
        newSet.delete(cardId);
      } else {
        newSet.add(cardId);
      }
      return newSet;
    });
  };

  const handleTitleChange = async (newTitle: string) => {
    setBoardTitle(newTitle);
    setIsEditingTitle(false);
    await saveBoardState(columns, newTitle);
  };

  if (loading) {
    return (
      <Box sx={{ background: '#f8f9fa', minHeight: '100vh', p: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress sx={{ color: '#0d6efd', mb: 2 }} size={40} />
          <Typography variant="body1" sx={{ color: '#212529', fontWeight: 600 }}>
            Loading saved board state...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ background: '#f8f9fa', minHeight: '100vh', p: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {isEditingTitle ? (
            <TextField
              value={boardTitle}
              onChange={(e) => setBoardTitle(e.target.value)}
              onBlur={() => handleTitleChange(boardTitle)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleTitleChange(boardTitle);
                } else if (e.key === 'Escape') {
                  setIsEditingTitle(false);
                }
              }}
              variant="standard"
              sx={{
                '& .MuiInput-root': {
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: '#212529',
                  '&:before': { borderBottom: 'none' },
                  '&:after': { borderBottom: 'none' },
                  '&:hover:before': { borderBottom: 'none' }
                }
              }}
              autoFocus
            />
          ) : (
            <Typography 
              variant="h4" 
              fontWeight={700} 
              sx={{ 
                color: '#212529', 
                cursor: 'pointer',
                '&:hover': { 
                  textDecoration: 'underline',
                  textDecorationColor: '#0d6efd'
                }
              }}
              onClick={() => setIsEditingTitle(true)}
            >
              {boardTitle}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setMinimizedCards(new Set())}
            sx={{ 
              color: '#0d6efd',
              borderColor: '#0d6efd',
              fontWeight: 500,
              borderRadius: 1,
              '&:hover': {
                backgroundColor: '#0d6efd',
                color: '#ffffff',
                borderColor: '#0d6efd'
              }
            }}
          >
            Expand All
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              const allCardIds = new Set<string>();
              Object.entries(columns).forEach(([colKey, cards]) => {
                cards.forEach((card, idx) => {
                  allCardIds.add(`${colKey}-${card.key}-${idx}`);
                });
              });
              setMinimizedCards(allCardIds);
            }}
            sx={{ 
              color: '#6c757d',
              borderColor: '#6c757d',
              fontWeight: 500,
              borderRadius: 1,
              '&:hover': {
                backgroundColor: '#6c757d',
                color: '#ffffff',
                borderColor: '#6c757d'
              }
            }}
          >
            Minimize All
          </Button>
        </Box>
      </Box>
      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
      <Box sx={{ display: 'flex', gap: 3, overflowX: 'auto', minWidth: 1200 }}>
        {ITERATIONS.map(iter => (
          <Box key={iter.key} sx={{ minWidth: 320, background: '#fff', border: '1px solid #e9ecef', borderRadius: 1, p: 2, display: 'flex', flexDirection: 'column', minHeight: 600 }}>
            <Box mb={2}>
              <Typography variant="h6" fontWeight={600} sx={{ color: '#212529' }}>{iter.label}</Typography>
              <Typography variant="caption" sx={{ color: '#6c757d' }}>{iter.range}</Typography>
            </Box>
            <Box flex={1} mb={2}>
              {columns[iter.key].map((card, idx) => {
                const cardId = `${iter.key}-${card.key}-${idx}`;
                const isMinimized = minimizedCards.has(cardId);
                return (
                  <DemoCard 
                    key={idx} 
                    card={card} 
                    onDelete={() => handleDeleteCard(iter.key, idx)}
                    onReload={() => handleReloadCard(iter.key, idx)}
                    isMinimized={isMinimized}
                    onToggleMinimize={() => handleToggleMinimize(iter.key, idx)}
                  />
                );
              })}
            </Box>
            <Box mt="auto" pt={2}>
              <TextField
                variant="outlined"
                size="small"
                fullWidth
                placeholder="Add card (Jira key)..."
                value={inputs[iter.key]}
                onChange={e => setInputs(inp => ({ ...inp, [iter.key]: e.target.value }))}
                onKeyDown={e => {
                  if (e.key === "Enter") handleAddCard(iter.key);
                }}
                sx={{ mb: 1, background: '#fff', borderRadius: 1 }}
                inputProps={{ style: { color: '#212529' } }}
              />
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={() => handleAddCard(iter.key)}
                sx={{ fontWeight: 600, borderRadius: 1 }}
              >
                Add
              </Button>
            </Box>
          </Box>
        ))}
      </Box>
      <StatusChart columns={columns} />
      <TimeInStatusWidget columns={columns} />
    </Box>
  );
} 