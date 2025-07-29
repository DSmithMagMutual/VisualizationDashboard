import { useState, useEffect, useMemo } from 'react';
import { Box, Container, Typography, FormControl, InputLabel, Select, MenuItem, OutlinedInput, Checkbox, ListItemText, CircularProgress, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DependencyGraphWidget from './DependencyGraphWidget';
import { loadDataSource } from '../lib/dataService';

export default function DependencyGraphPage() {
  const [selectedDataSource, setSelectedDataSource] = useState('');
  const [currentData, setCurrentData] = useState<any>(null);
  const [teamFilter, setTeamFilter] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

        <Box sx={{ width: '100%' }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
              <CircularProgress size={60} />
            </Box>
          ) : currentData ? (
            <DependencyGraphWidget 
              data={currentData} 
              title={`Dependency Graph - ${selectedDataSource}`}
              teamFilter={teamFilter}
            />
          ) : (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
              <Typography variant="h6" sx={{ color: '#6c757d' }}>
                Please select a data source to view the dependency graph
              </Typography>
            </Box>
          )}
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
    </Box>
  );
} 