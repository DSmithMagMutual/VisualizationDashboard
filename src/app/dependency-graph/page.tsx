'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Container, Typography, FormControl, InputLabel, Select, MenuItem, OutlinedInput, Checkbox, ListItemText } from '@mui/material';
import DependencyGraphWidget from '@/components/widgets/DependencyGraphWidget';

// Import the demo data
import demoData from '../../../board-save.json';
import adviceData from '../../../board-saveAdvice.json';
import pddData from '../../../board-savePDD.json';

const dataSources = {
  'board-save': demoData,
  'board-saveAdvice': adviceData,
  'board-savePDD': pddData
};

export default function DependencyGraphPage() {
  const [selectedDataSource, setSelectedDataSource] = useState('board-save');
  const [currentData, setCurrentData] = useState(dataSources['board-save']);
  const [teamFilter, setTeamFilter] = useState<string[]>([]);

  useEffect(() => {
    setCurrentData(dataSources[selectedDataSource as keyof typeof dataSources]);
    // Reset team filter when data source changes
    setTeamFilter([]);
  }, [selectedDataSource]);

  // Get all unique teams from current data
  const allTeams = useMemo(() => {
    const teams = new Set<string>();
    Object.values(currentData.columns).forEach(epics => {
      epics.forEach(epic => {
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
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Jira Dependency Graph
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Visualize dependencies between epics and stories with color-coded status and team information.
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Data Source</InputLabel>
            <Select
              value={selectedDataSource}
              label="Data Source"
              onChange={(e) => setSelectedDataSource(e.target.value)}
            >
              <MenuItem value="board-save">Board Save (JPP)</MenuItem>
              <MenuItem value="board-saveAdvice">Board Save Advice (ADVICE)</MenuItem>
              <MenuItem value="board-savePDD">Board Save PDD</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 300 }}>
            <InputLabel id="team-filter-label">Filter by Team</InputLabel>
            <Select
              labelId="team-filter-label"
              multiple
              value={teamFilter}
              onChange={e => setTeamFilter(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              input={<OutlinedInput label="Filter by Team" />}
              renderValue={(selected) => selected.length === 0 ? 'All Teams' : selected.join(', ')}
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
      </Box>

      <Box sx={{ width: '100%' }}>
        <DependencyGraphWidget 
          data={currentData} 
          title={`Dependency Graph - ${selectedDataSource}`}
          teamFilter={teamFilter}
        />
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          How to Use
        </Typography>
        <Typography variant="body2" paragraph>
          • <strong>Epics</strong> are shown as larger circles, <strong>Stories</strong> as smaller circles
        </Typography>
        <Typography variant="body2" paragraph>
          • <strong>Node colors</strong> represent status: Red (To Do), Orange (In Progress), Green (Done)
        </Typography>
        <Typography variant="body2" paragraph>
          • <strong>Border colors</strong> represent teams
        </Typography>
        <Typography variant="body2" paragraph>
          • <strong>Lines</strong> show dependencies between epics and their stories
        </Typography>
        <Typography variant="body2" paragraph>
          • <strong>Drag nodes</strong> to rearrange the graph layout
        </Typography>
        <Typography variant="body2" paragraph>
          • <strong>Hover over nodes</strong> to see detailed information
        </Typography>
      </Box>
    </Container>
  );
} 