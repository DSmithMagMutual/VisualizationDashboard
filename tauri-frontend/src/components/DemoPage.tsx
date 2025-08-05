import React, { useState, useEffect } from "react";
import { Box, Card, CardContent, Typography, Button, TextField, LinearProgress, Chip, Tooltip, CircularProgress, IconButton, Select, MenuItem, InputLabel, FormControl, OutlinedInput, Checkbox, ListItemText, Snackbar, Alert } from '@mui/material';
import { Close, Refresh, ExpandMore, ExpandLess } from '@mui/icons-material';
import { BarChart } from '@mui/x-charts/BarChart';
import RefreshIcon from '@mui/icons-material/Refresh';
import { loadDataSource } from '../lib/dataService';
import { invoke } from '@tauri-apps/api/core';
import { fetchCardData, saveBoardData } from '../lib/jiraDataService';
import JiraConfigDialog from './JiraConfigDialog';
import LastUpdatedIndicator from './LastUpdatedIndicator';

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
    return 'done';
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
    return 'indeterminate';
  } 
  
  // To Do statuses (including Ready statuses that haven't started)
  else if (statusLower.includes('ready') ||
           statusLower.includes('to do') ||
           statusLower.includes('open') ||
           statusLower.includes('new') ||
           statusLower.includes('backlog') ||
           statusLower.includes('selected for development') ||
           statusLower.includes('ready for development')) {
    return 'new';
  } 
  
  // Default to new for any unrecognized status
  else {
    return 'new';
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
  const statusCategories = ['new', 'indeterminate', 'done'];
  
  // Calculate data for each iteration
  const chartData = ITERATIONS.map(iter => {
    const cards = columns[iter.key] || [];
    const statusCounts: Record<string, number> = { 'new': 0, 'indeterminate': 0, 'done': 0 };
    
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
      'new': statusCounts['new'],
      'indeterminate': statusCounts['indeterminate'],
      'done': statusCounts['done']
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
                Total: {chartData.reduce((sum, data) => sum + data['new'] + data['indeterminate'] + data['done'], 0)}
              </Typography>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function DemoCard({ card, onDelete, onReload, isMinimized, onToggleMinimize, teamFilter }: { 
  card: any; 
  onDelete: () => void; 
  onReload: () => void;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  teamFilter?: string[];
}) {
  // Filter child stories by teamFilter if provided
  const filteredStories = React.useMemo(() => {
    console.log(`DemoCard re-rendering for ${card.key}, stories:`, card.stories);
    if (!Array.isArray(card.stories)) return [];
    if (!teamFilter || teamFilter.length === 0) return card.stories;
    return card.stories.filter((story: any) => teamFilter.includes(story.team));
  }, [card.stories, teamFilter, card.key]);

  const doneCount = filteredStories.filter((s: any) => s.statusCategory === 'done').length || 0;
  const totalCount = filteredStories.length || 0;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  
  console.log(`Progress for ${card.key}: ${doneCount}/${totalCount} = ${pct}%`);
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
            {filteredStories && filteredStories.length > 0 && (
              <Box mt={2}>
                <Typography variant="subtitle2" sx={{ color: '#212529', fontWeight: 600, mb: 1 }}>Child work items</Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  {filteredStories.map((story: any) => (
                    <li key={story.key} style={{ marginBottom: 4 }}>
                      <a 
                        href={'https://magmutual.atlassian.net/browse/' + story.key}
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
                      <Chip 
                        label={story.status} 
                        size="small" 
                        sx={{ bgcolor: '#f3f4f6', color: '#212529', fontWeight: 500, borderRadius: 1 }} 
                        onClick={() => console.log(`Story ${story.key} status:`, story.status, 'statusCategory:', story.statusCategory)}
                      />
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

export default function DemoPage() {
  const [selectedDataSource, setSelectedDataSource] = useState('');
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
  const [refreshing, setRefreshing] = useState(false);
  const [minimizedCards, setMinimizedCards] = useState<Set<string>>(new Set());
  const [boardTitle, setBoardTitle] = useState("Demo Iteration Board");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [teamFilter, setTeamFilter] = useState<string[]>([]);
  const [showJiraConfig, setShowJiraConfig] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | undefined>();
  const [dataSource, setDataSource] = useState<'jira' | 'static' | undefined>();
  const [projectKey, setProjectKey] = useState<string | undefined>();
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Debug effect to log when showJiraConfig changes
  useEffect(() => {
    console.log('showJiraConfig changed to:', showJiraConfig);
  }, [showJiraConfig]);

  // Debug effect to log when notification changes
  useEffect(() => {
    console.log('Notification state changed:', notification);
  }, [notification]);

  // Collect all unique teams from current board data
  const allTeams = React.useMemo(() => {
    const teams = new Set<string>();
    Object.values(columns).forEach(cards => {
      cards.forEach(card => {
        if (card.team) teams.add(card.team);
        if (Array.isArray(card.stories)) {
          card.stories.forEach((story: any) => {
            if (story.team) teams.add(story.team);
          });
        }
      });
    });
    return Array.from(teams).sort();
  }, [columns]);

  // Filtering logic: show card if parent or any child story matches selected team(s)
  function cardMatchesTeamFilter(card: any) {
    if (teamFilter.length === 0) return true;
    if (card.team && teamFilter.includes(card.team)) return true;
    if (Array.isArray(card.stories)) {
      return card.stories.some((story: any) => teamFilter.includes(story.team));
    }
    return false;
  }

  // Function to load data from selected data source
  const loadDataSourceData = async (dataSourceKey: string) => {
    try {
      setLoading(true);
      const dataSource = await loadDataSource(dataSourceKey);
      if (dataSource && dataSource.columns) {
        // Ensure all iteration keys are present in the loaded state
        const initializedColumns = ITERATIONS.reduce((acc, iter) => {
          acc[iter.key] = (dataSource.columns as Record<string, any[]>)?.[iter.key] || [];
          return acc;
        }, {} as Record<string, any[]>);
        setColumns(initializedColumns);
        setBoardTitle(`Demo Iteration Board - ${dataSourceKey}`);
        setTeamFilter([]); // Reset team filter when data source changes
        
        // Update metadata
        setLastUpdated(dataSource.lastUpdated);
        setDataSource(dataSource.source);
        setProjectKey(dataSource.projectKey);
      }
    } catch (error) {
      console.error('Failed to load data source:', error);
    } finally {
      setLoading(false);
    }
  };

  // Effect to load data when data source changes
  useEffect(() => {
    if (selectedDataSource) {
      loadDataSourceData(selectedDataSource);
    }
  }, [selectedDataSource]);

  useEffect(() => {
    setLoading(false);
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
    
    // For demo purposes, create a mock card
    const mockCard = {
      key: cardName,
      url: `https://magmutual.atlassian.net/browse/${cardName}`,
      summary: `Mock summary for ${cardName}`,
      status: 'To Do',
      statusCategory: 'todo',
      team: 'OG Team',
      stories: []
    };
    
    const newColumns = {
      ...columns,
      [colKey]: [
        ...columns[colKey],
        mockCard,
      ],
    };
    setColumns(newColumns);
    setInputs(inputs => ({ ...inputs, [colKey]: "" }));
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
  };

  const handleReloadCard = async (colKey: string, cardIndex: number) => {
    const card = columns[colKey][cardIndex];
    if (!card.key) return;
    
    console.log(`Reload card button clicked for: ${card.key}`);
    setError(null);
    
    // Check if Jira credentials are configured
    const hasCredentials = await checkJiraCredentials();
    console.log('Has credentials for card reload:', hasCredentials);
    
    if (!hasCredentials) {
      console.log('No credentials found, showing config dialog for card reload');
      setShowJiraConfig(true);
      return;
    }
    
    // Proceed with card refresh if credentials are available
    console.log(`Proceeding with card refresh - credentials available for: ${card.key}`);
    
    // TODO: Implement actual card refresh logic here
    // For now, just show a success message
    console.log(`Card refresh completed for: ${card.key}`);
  };

  // Function to check if Jira credentials are configured
  const checkJiraCredentials = async (): Promise<boolean> => {
    try {
      const config = await invoke('load_jira_config');
      return config !== null;
    } catch (error) {
      console.error('Error checking Jira credentials:', error);
      return false;
    }
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
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  const handleRefreshData = async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      // Check if Jira credentials are configured
      const hasCredentials = await checkJiraCredentials();
      if (!hasCredentials) {
        setNotification({
          open: true,
          message: 'Please configure Jira credentials first',
          severity: 'warning'
        });
        setShowJiraConfig(true);
        return;
      }
      
      // Get all cards from the current board
      const allCards = Object.values(columns).flat();
      if (allCards.length === 0) {
        setNotification({
          open: true,
          message: 'No cards to refresh on the current board',
          severity: 'info'
        });
        return;
      }
      
      console.log(`Refreshing ${allCards.length} cards on the board`);
      
      // Refresh each card individually
      let refreshedCount = 0;
      let errorCount = 0;
      
      for (const card of allCards) {
        if (card.key) {
          try {
            console.log(`Refreshing card: ${card.key}`);
            console.log(`Original card structure:`, card);
            
            // Fetch fresh data from Jira
            const freshCardData = await fetchCardData(card.key);
            console.log(`Fresh data for ${card.key}:`, freshCardData);
            console.log(`Fresh data fields for ${card.key}:`, freshCardData?.fields);
            console.log(`Status field for ${card.key}:`, freshCardData?.fields?.status);
            
            // Update the card with fresh data
            if (freshCardData && freshCardData.fields) {
              const fields = freshCardData.fields;
              
              // Update card status
              if (fields.status && fields.status.name) {
                const newStatus = fields.status.name;
                const newStatusCategory = getStatusCategory(newStatus);
                console.log(`Updating status for ${card.key}:`, {
                  oldStatus: card.status,
                  newStatus: newStatus,
                  oldStatusCategory: card.statusCategory,
                  newStatusCategory: newStatusCategory
                });
                card.status = newStatus;
                card.statusCategory = newStatusCategory;
              } else {
                console.log(`No status found in fresh data for ${card.key}`);
              }
              
              // Update card summary
              if (fields.summary) {
                card.summary = fields.summary;
              }
              
              // Update assignee
              if (fields.assignee && fields.assignee.displayName) {
                card.assignee = fields.assignee.displayName;
              }
              
              // Update team if available
              if (fields.customfield_10014) {
                card.team = fields.customfield_10014;
              }
              
              // Update child work items (stories) if they exist
              if (card.stories && Array.isArray(card.stories) && card.stories.length > 0) {
                console.log(`Refreshing ${card.stories.length} existing child work items for ${card.key}`);
                console.log(`Original stories for ${card.key}:`, card.stories);
                
                const storyPromises = card.stories.map(async (existingStory: any) => {
                  try {
                    const issueKey = existingStory.key;
                    console.log(`Fetching fresh data for existing child issue: ${issueKey}`);
                    const storyData = await fetchCardData(issueKey);
                    console.log(`Fresh data for child issue ${issueKey}:`, storyData);
                    
                    if (storyData && storyData.fields) {
                      const newStatus = storyData.fields.status?.name || 'Unknown';
                      const newStatusCategory = getStatusCategory(newStatus);
                      const newSummary = storyData.fields.summary || issueKey;
                      const newTeam = storyData.fields.customfield_10014 || 'Unknown Team';
                      
                      console.log(`Updating existing child issue ${issueKey}:`, {
                        oldStatus: existingStory.status,
                        newStatus: newStatus,
                        oldStatusCategory: existingStory.statusCategory,
                        newStatusCategory: newStatusCategory,
                        newSummary: newSummary,
                        newTeam: newTeam
                      });
                      
                      return {
                        key: issueKey,
                        summary: newSummary,
                        status: newStatus,
                        statusCategory: newStatusCategory,
                        team: newTeam
                      };
                    } else {
                      console.log(`No valid fields found for child issue ${issueKey}, keeping existing data`);
                      return existingStory; // Keep existing data if API fails
                    }
                  } catch (error) {
                    console.error(`Failed to fetch child issue ${existingStory.key}:`, error);
                    return existingStory; // Keep existing data if API fails
                  }
                });
                
                const updatedStories = await Promise.all(storyPromises);
                card.stories = updatedStories;
                console.log(`Updated ${updatedStories.length} child work items for ${card.key}:`, updatedStories);
                console.log(`Final stories array for ${card.key}:`, card.stories);
              } else {
                console.log(`No existing child work items found for ${card.key}`);
              }
              
              refreshedCount++;
            }
          } catch (error) {
            console.error(`Failed to refresh card ${card.key}:`, error);
            errorCount++;
          }
        }
      }
      
      // Create updated columns object
      console.log('Creating updated columns object');
      const updatedColumns = { ...columns };
      Object.keys(updatedColumns).forEach(colKey => {
        updatedColumns[colKey] = [...updatedColumns[colKey]];
      });
      
      // Save the updated board data to JSON file BEFORE updating state
      try {
        const boardData = {
          columns: updatedColumns,
          lastUpdated: new Date().toISOString(),
          source: 'jira',
          projectKey: projectKey
        };
        
        // Determine the file name based on the current data source
        let fileName = 'board-savePDD.json'; // default
        if (selectedDataSource === 'board-saveAdvice') {
          fileName = 'board-saveAdvice.json';
        }
        
        console.log(`Saving updated board data to ${fileName}`);
        await saveBoardData(boardData, fileName);
        console.log('Board data saved successfully');
      } catch (error) {
        console.error('Failed to save board data:', error);
        // Don't show error notification for save failures, just log it
      }
      
      // Now update the state (this triggers the UI updates and button animation)
      console.log('Updating state with refreshed data');
      setColumns(updatedColumns);
      setLastUpdated(new Date().toISOString());
      
      // Show success notification
      if (errorCount === 0) {
        setNotification({
          open: true,
          message: `Successfully refreshed ${refreshedCount} cards on the board`,
          severity: 'success'
        });
      } else {
        setNotification({
          open: true,
          message: `Refreshed ${refreshedCount} cards, ${errorCount} failed`,
          severity: 'warning'
        });
      }
      
    } catch (error) {
      console.error('Failed to refresh cards:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh cards';
      setError(errorMessage);
      
      // Show error notification
      setNotification({
        open: true,
        message: `Failed to refresh cards: ${errorMessage}`,
        severity: 'error'
      });
    } finally {
      setRefreshing(false);
    }
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
      {/* Board Title UI */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <LastUpdatedIndicator
            lastUpdated={lastUpdated}
            source={dataSource}
            projectKey={projectKey}
            onRefresh={handleRefreshData}
            loading={refreshing}
          />
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
      {/* Data Source and Team Filter Controls */}
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 3, alignItems: 'flex-end' }}>
        {/* Data Source Selector */}
        <Box sx={{ minWidth: 250 }}>
          <FormControl fullWidth size="small">
            <InputLabel 
              id="data-source-label" 
              sx={{ 
                color: '#495057', 
                fontWeight: 500,
                '&.Mui-focused': {
                  color: '#0d6efd',
                },
                '&.MuiInputLabel-shrink': {
                  color: '#0d6efd',
                }
              }}
            >
              Data Source
            </InputLabel>
            <Select
              labelId="data-source-label"
              value={selectedDataSource}
              label="Data Source"
              onChange={(e) => setSelectedDataSource(e.target.value)}
              sx={{
                backgroundColor: '#ffffff',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#dee2e6',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#adb5bd',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#0d6efd',
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#0d6efd',
                },
              }}
            >
              <MenuItem value="board-saveAdvice">Board Save Advice (ADVICE)</MenuItem>
              <MenuItem value="board-savePDD">Board Save PDD</MenuItem>
            </Select>
          </FormControl>
        </Box>





        {/* Team Filter */}
        <Box sx={{ minWidth: 300 }}>
          <FormControl fullWidth size="small">
            <InputLabel 
              id="team-filter-label" 
              sx={{ 
                color: '#495057', 
                fontWeight: 500,
                '&.Mui-focused': {
                  color: '#0d6efd',
                },
                '&.MuiInputLabel-shrink': {
                  color: '#0d6efd',
                }
              }}
            >
              Filter by Team
            </InputLabel>
            <Select
              labelId="team-filter-label"
              multiple
              value={teamFilter}
              onChange={e => setTeamFilter(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              input={<OutlinedInput label="Filter by Team" />}
              renderValue={(selected) => selected.length === 0 ? 'All Teams' : selected.join(', ')}
              sx={{
                backgroundColor: '#ffffff',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#dee2e6',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#adb5bd',
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#0d6efd',
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: '#0d6efd',
                },
              }}
            >
              {allTeams.map(team => (
                <MenuItem key={team} value={team}>
                  <Checkbox checked={teamFilter.indexOf(team) > -1} style={{ color: getColorForTeam(team) }} />
                  <ListItemText primary={team} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Refresh Cards Button */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            size="small"
            onClick={handleRefreshData}
            disabled={refreshing}
            startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
            sx={{
              backgroundColor: '#0d6efd',
              color: '#ffffff',
              fontWeight: 600,
              '&:hover': {
                backgroundColor: '#0b5ed7',
              },
              '&:disabled': {
                backgroundColor: '#6c757d',
                color: '#ffffff',
              },
              textTransform: 'none',
            }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh Cards'}
          </Button>
          

        </Box>


      </Box>
      {/* PI Status Summary Box */}
      <Box sx={{ mb: 4, maxWidth: 600, bgcolor: '#fff', border: '1px solid #dee2e6', borderRadius: 1, boxShadow: 1, p: 3 }}>
        {(() => {
          // Gather all child stories across all iterations, filtered by team if filter is applied
          const allStories = Object.values(columns).flat().flatMap(card => {
            if (!card.stories) return [];
            if (!teamFilter || teamFilter.length === 0) return card.stories;
            return card.stories.filter((story: any) => teamFilter.includes(story.team));
          });
          const total = allStories.length;
          const done = allStories.filter((s: any) => getStatusCategory(s.status) === 'done').length;
          const inProgress = allStories.filter((s: any) => getStatusCategory(s.status) === 'indeterminate').length;
          const notStarted = allStories.filter((s: any) => getStatusCategory(s.status) === 'new').length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          let barColor = '#e9ecef';
          if (pct === 100 && total > 0) barColor = '#198754';
          else if (pct > 0) barColor = '#fd7e14';
          else if (total > 0) barColor = '#dc3545';
          let statusMsg = 'On Track';
          if (pct < 50) statusMsg = 'Behind';
          else if (pct < 80) statusMsg = 'At Risk';
          return (
            <>
              <Typography variant="h6" fontWeight={700} sx={{ color: '#212529', mb: 2 }}>PI Status Summary</Typography>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Box flex={1}>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{ height: 12, borderRadius: 1, background: '#e9ecef', '& .MuiLinearProgress-bar': { background: barColor } }}
                  />
                </Box>
                <Typography variant="h6" fontWeight={700} sx={{ color: barColor, minWidth: 72, textAlign: 'right' }}>{pct}% Done</Typography>
              </Box>
              <Box display="flex" gap={4} mb={2}>
                <Typography variant="body1" sx={{ color: '#212529' }}>Total: <b>{total}</b></Typography>
                <Typography variant="body1" sx={{ color: '#198754' }}>Done: <b>{done}</b></Typography>
                <Typography variant="body1" sx={{ color: '#fd7e14' }}>In Progress: <b>{inProgress}</b></Typography>
                <Typography variant="body1" sx={{ color: '#6c757d' }}>Not Started: <b>{notStarted}</b></Typography>
              </Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ color: barColor }}>{statusMsg}</Typography>
            </>
          );
        })()}
      </Box>
      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
      <Box sx={{ display: 'flex', gap: 3, overflowX: 'auto', minWidth: 1200 }}>
        {ITERATIONS.map(iter => (
          <Box key={iter.key} sx={{ minWidth: 320, background: '#fff', border: '1px solid #e9ecef', borderRadius: 1, p: 2, display: 'flex', flexDirection: 'column', minHeight: 600 }}>
            <Box mb={2}>
              <Typography variant="h6" fontWeight={600} sx={{ color: '#212529' }}>{iter.label}</Typography>
              <Typography variant="caption" sx={{ color: '#6c757d' }}>{iter.range}</Typography>
            </Box>
            {(() => {
              // Gather all child stories for this iteration
              const cards = columns[iter.key] || [];
              const allStories = cards.flatMap(card => card.stories || []);
              const total = allStories.length;
              const done = allStories.filter((s: any) => getStatusCategory(s.status) === 'done').length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              let barColor = '#e9ecef';
              if (pct === 100 && total > 0) barColor = '#198754';
              else if (pct > 0) barColor = '#fd7e14';
              else if (total > 0) barColor = '#dc3545';
              return (
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Box flex={1}>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{ height: 8, borderRadius: 1, background: '#e9ecef', '& .MuiLinearProgress-bar': { background: barColor } }}
                    />
                  </Box>
                  <Typography variant="body2" fontWeight={600} sx={{ color: barColor, minWidth: 56, textAlign: 'right' }}>{pct}% Done</Typography>
                </Box>
              );
            })()}
            <Box flex={1} mb={2}>
              {columns[iter.key].filter(cardMatchesTeamFilter).map((card, idx) => {
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
                    teamFilter={teamFilter}
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
      
      {/* Jira Configuration Dialog */}
      <JiraConfigDialog
        open={showJiraConfig}
        onClose={() => {
          console.log('Closing Jira config dialog');
          setShowJiraConfig(false);
        }}
        onConfigSaved={(config) => {
          console.log('Jira configuration saved:', config);
          setShowJiraConfig(false);
          // Refresh data if we have a Jira data source selected
          if (dataSource === 'jira' && projectKey) {
            handleRefreshData();
          }
        }}
      />

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        sx={{
          bottom: '20px !important', // Position above the version display
          right: '20px !important',
          zIndex: 9999, // Ensure it's above other elements
        }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
} 