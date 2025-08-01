import { useState, useEffect, useMemo } from 'react';
import { Box, Container, Typography, FormControl, InputLabel, Select, MenuItem, OutlinedInput, Checkbox, ListItemText, CircularProgress, Button, Card, CardContent, Chip, LinearProgress, IconButton, Tooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import DependencyGraphWidget from './DependencyGraphWidget';
import { loadDataSource } from '../lib/dataService';
import JiraConfigDialog from './JiraConfigDialog';

// Helper function to get color for team (copied from DemoPage)
function getColorForTeam(team: string) {
  if (!team) return '#6c757d';
  const teamColorMap: Record<string, string> = {
    'OG Team': '#6C63FF',
    'Special Forces': '#FF6B6B',
    'Avengers': '#4ECDC4',
    'Hogwarts Express': '#45B7D1',
    'Data Divers': '#96CEB4',
    'Other': '#FFEAA7',
  };
  if (teamColorMap[team]) return teamColorMap[team];
  let hash = 0;
  for (let i = 0; i < team.length; i++) {
    hash = team.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
}

// Preview Card Component
function PreviewCard({ node, onClose }: { node: any; onClose: () => void }) {
  const team = node.team || 'Other';
  const doneCount = node.stories ? node.stories.filter((s: any) => s.statusCategory === 'done').length : 0;
  const totalCount = node.stories ? node.stories.length : 0;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <Card sx={{ bgcolor: '#fff', border: '1px solid #dee2e6', borderRadius: 1, boxShadow: 2, position: 'relative' }}>
      <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
        <Tooltip title="Close preview">
          <IconButton
            size="small"
            onClick={onClose}
            sx={{ 
              color: '#6c757d', 
              bgcolor: 'rgba(108, 117, 125, 0.1)',
              borderRadius: 1,
              '&:hover': { bgcolor: 'rgba(108, 117, 125, 0.2)' }
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <CardContent sx={{ p: 2, pr: 6 }}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ color: '#0d6efd', flex: 1, minWidth: 0 }}>
            {node.key ? (
              <a href={node.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0d6efd', textDecoration: 'none', fontWeight: 600 }}>{node.key}</a>
            ) : node.label}
          </Typography>
        </Box>
        
        <Typography variant="body2" sx={{ color: '#495057', mb: 2, lineHeight: 1.4 }}>
          {node.summary}
        </Typography>
        
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
          <Chip label={node.status} size="small" sx={{ bgcolor: '#f3f4f6', color: '#212529', fontWeight: 500, borderRadius: 1 }} />
        </Box>
        
        {node.type === 'epic' && (
          <>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#495057', fontWeight: 500 }}>{doneCount}/{totalCount}</Typography>
              <span style={{ color: pct === 100 ? '#198754' : pct > 0 ? '#fd7e14' : '#dc3545', fontSize: 18, verticalAlign: 'middle' }}>{pct === 100 ? '✔️' : pct > 0 ? '⏳' : '⚠️'}</span>
              <Typography variant="body2" fontWeight={600} sx={{ color: pct === 100 ? '#198754' : pct > 0 ? '#fd7e14' : '#dc3545', fontSize: '0.875rem' }}>{pct}%</Typography>
            </Box>
            <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 1, background: '#e9ecef', '& .MuiLinearProgress-bar': { background: pct === 100 ? '#198754' : pct > 0 ? '#fd7e14' : '#dc3545' } }} />
          </>
        )}
        
        {node.iteration && (
          <Box mt={2}>
            <Typography variant="caption" sx={{ color: '#6c757d', fontWeight: 500 }}>Iteration: {node.iteration}</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

export default function DependencyGraphPage() {
  const [selectedDataSource, setSelectedDataSource] = useState('');
  const [currentData, setCurrentData] = useState<any>(null);
  const [teamFilter, setTeamFilter] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showJiraConfig, setShowJiraConfig] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  // Debug effect to log when showJiraConfig changes
  useEffect(() => {
    console.log('DependencyGraph showJiraConfig changed to:', showJiraConfig);
  }, [showJiraConfig]);

  useEffect(() => {
    if (selectedDataSource) {
      setIsLoading(true);
      loadDataSource(selectedDataSource)
        .then((data) => {
          if (data) {
            setCurrentData(data);
            setTeamFilter([]); // Reset team filter when data source changes
          }
        })
        .catch((error) => {
          console.error('Failed to load data:', error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [selectedDataSource]);

  // Get all unique teams from current data
  const allTeams = useMemo(() => {
    if (!currentData || !currentData.columns) return [];
    
    const teams = new Set<string>();
    Object.values(currentData.columns).forEach((epics: any) => {
      epics.forEach((epic: any) => {
        if (epic.team) teams.add(epic.team);
        if (Array.isArray(epic.stories)) {
          epic.stories.forEach((story: any) => {
            if (story.team) teams.add(story.team);
          });
        }
      });
    });
    return Array.from(teams).sort();
  }, [currentData]);

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

  return (
    <Box sx={{ background: '#f8f9fa', minHeight: '100vh', p: 4 }}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ color: '#212529', fontWeight: 700 }}>
            Jira Dependency Graph
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, color: '#6c757d' }}>
            Visualize dependencies between epics and stories with color-coded status and team information.
          </Typography>
        
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
                  <Checkbox checked={teamFilter.indexOf(team) > -1} />
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
            onClick={async () => {
              console.log('Dependency Graph refresh button clicked!');
              // Check if Jira credentials are configured
              const hasCredentials = await checkJiraCredentials();
              console.log('Has credentials:', hasCredentials);
              
              if (!hasCredentials) {
                console.log('No credentials found, showing config dialog');
                setShowJiraConfig(true);
                return;
              }
              
              // Proceed with refresh if credentials are available
              if (selectedDataSource) {
                try {
                  setIsLoading(true);
                  const data = await loadDataSource(selectedDataSource);
                  if (data) {
                    setCurrentData(data);
                  }
                } catch (error) {
                  console.error('Failed to reload data:', error);
                } finally {
                  setIsLoading(false);
                }
              }
            }}
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
            Refresh Data
          </Button>
        </Box>
        </Box>
      </Box>

        {/* Graph and Preview Container - Directly adjacent */}
        <Box sx={{ height: '1000px', mb: 3, display: 'flex', gap: 0 }}>
          {/* Graph Area */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '800px' }}>
                <CircularProgress size={60} />
              </Box>
            ) : currentData ? (
              <DependencyGraphWidget 
                data={currentData} 
                title={`Dependency Graph - ${selectedDataSource}`}
                teamFilter={teamFilter}
                onNodeClick={setSelectedNode}
              />
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '800px' }}>
                <Typography variant="h6" sx={{ color: '#6c757d' }}>
                  Please select a data source to view the dependency graph
                </Typography>
              </Box>
            )}
          </Box>
          
          {/* Preview Panel - Directly adjacent to graph viewport */}
          <Box sx={{ 
            width: 320,
            flexShrink: 0,
            backgroundColor: '#fff',
            borderLeft: '1px solid #e0e0e0',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#212529', fontWeight: 600, mb: 2, p: 2, pb: 0, borderBottom: '1px solid #e0e0e0' }}>
              Node Preview
            </Typography>
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              {selectedNode ? (
                <PreviewCard 
                  node={selectedNode} 
                  onClose={() => setSelectedNode(null)} 
                />
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '200px',
                  bgcolor: '#fff',
                  color: '#6c757d',
                  p: 2
                }}>
                  <Typography variant="body2" sx={{ textAlign: 'center' }}>
                    Click on a node in the graph to see details
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ color: '#212529', fontWeight: 600 }}>
            How to Use
          </Typography>
          <Typography variant="body2" paragraph sx={{ color: '#6c757d' }}>
            • <strong>Epics</strong> are shown as larger circles, <strong>Stories</strong> as smaller circles
          </Typography>
          <Typography variant="body2" paragraph sx={{ color: '#6c757d' }}>
            • <strong>Node colors</strong> represent status: Red (To Do), Orange (In Progress), Green (Done)
          </Typography>
          <Typography variant="body2" paragraph sx={{ color: '#6c757d' }}>
            • <strong>Border colors</strong> represent teams
          </Typography>
          <Typography variant="body2" paragraph sx={{ color: '#6c757d' }}>
            • <strong>Lines</strong> show dependencies between epics and their stories
          </Typography>
          <Typography variant="body2" paragraph sx={{ color: '#6c757d' }}>
            • <strong>Drag nodes</strong> to rearrange the graph layout
          </Typography>
          <Typography variant="body2" paragraph sx={{ color: '#6c757d' }}>
            • <strong>Hover over nodes</strong> to see detailed information
          </Typography>
        </Box>
      </Container>
      
      {/* Jira Configuration Dialog */}
      <JiraConfigDialog
        open={showJiraConfig}
        onClose={() => setShowJiraConfig(false)}
        onConfigSaved={(config) => {
          console.log('Jira configuration saved:', config);
          setShowJiraConfig(false);
          // Optionally trigger refresh after config is saved
          // if (selectedDataSource) {
          //   loadDataSource(selectedDataSource).then(setCurrentData);
          // }
        }}
      />
    </Box>
  );
} 