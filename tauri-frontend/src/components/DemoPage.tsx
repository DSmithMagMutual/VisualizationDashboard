import React, { useState, useEffect } from "react";
import { Box, Card, CardContent, Typography, Button, TextField, LinearProgress, Chip, Tooltip, CircularProgress, IconButton, Select, MenuItem, InputLabel, FormControl, OutlinedInput, Checkbox, ListItemText } from '@mui/material';
import { Close, Refresh, ExpandMore, ExpandLess } from '@mui/icons-material';
import { BarChart } from '@mui/x-charts/BarChart';
import RefreshIcon from '@mui/icons-material/Refresh';
import { loadDataSource } from '../lib/dataService';
import JiraConfigDialog from './JiraConfigDialog';

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
    if (!Array.isArray(card.stories)) return [];
    if (!teamFilter || teamFilter.length === 0) return card.stories;
    return card.stories.filter((story: any) => teamFilter.includes(story.team));
  }, [card.stories, teamFilter]);

  const doneCount = filteredStories.filter((s: any) => s.statusCategory === 'done').length || 0;
  const totalCount = filteredStories.length || 0;
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
  const [minimizedCards, setMinimizedCards] = useState<Set<string>>(new Set());
  const [boardTitle, setBoardTitle] = useState("Demo Iteration Board");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [teamFilter, setTeamFilter] = useState<string[]>([]);
  const [showJiraConfig, setShowJiraConfig] = useState(false);

  // Debug effect to log when showJiraConfig changes
  useEffect(() => {
    console.log('showJiraConfig changed to:', showJiraConfig);
  }, [showJiraConfig]);

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
      // TODO: Implement when Tauri is properly configured
      // For now, return true to test refresh functionality
      // When Tauri is ready, this should call: const config = await invoke('load_jira_config');
      return true; // Temporarily return true to test refresh
    } catch (error) {
      console.error('Error checking Jira credentials:', error);
      return false;
    }
  };

  const handleRefreshAllCards = async () => {
    console.log('Refresh button clicked!');
    setError(null);
    
    // Check if Jira credentials are configured
    const hasCredentials = await checkJiraCredentials();
    console.log('Has credentials:', hasCredentials);
    
    if (!hasCredentials) {
      console.log('No credentials found, showing config dialog');
      setShowJiraConfig(true);
      return;
    }
    
    // Proceed with refresh if credentials are available
    console.log('Proceeding with refresh - credentials available');
    
    // TODO: Implement actual refresh logic here
    // For now, just show a success message
    console.log('Refresh completed successfully');
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

        {/* Refresh Button */}
        <Box>
          <Button
            variant="outlined"
            size="small"
            color="primary"
            onClick={handleRefreshAllCards}
            startIcon={<RefreshIcon />}
            sx={{ 
              fontWeight: 600, 
              borderRadius: 1,
              borderColor: '#0d6efd',
              color: '#0d6efd',
              '&:hover': {
                borderColor: '#0b5ed7',
                backgroundColor: 'rgba(13, 110, 253, 0.04)'
              }
            }}
          >
            Refresh All Cards
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
          const done = allStories.filter((s: any) => getStatusCategory(s.status) === 'Done').length;
          const inProgress = allStories.filter((s: any) => getStatusCategory(s.status) === 'In Progress').length;
          const notStarted = allStories.filter((s: any) => getStatusCategory(s.status) === 'To Do').length;
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
              const done = allStories.filter((s: any) => getStatusCategory(s.status) === 'Done').length;
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
          // Optionally trigger refresh after config is saved
          // handleRefreshAllCards();
        }}
      />
    </Box>
  );
} 