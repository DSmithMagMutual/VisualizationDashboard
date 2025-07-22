'use client'

import React from 'react';
import { Box, Typography, MenuItem, Select, Checkbox, ListItemText, OutlinedInput } from '@mui/material';
import FeatureProgressWidget from '@/components/widgets/FeatureProgressWidget';
import { useBoard, BoardProvider } from '@/components/BoardContext';

function BoardSwitcher() {
  const { boards, selectedBoards, toggleBoard, addBoard } = useBoard();
  const [open, setOpen] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newId, setNewId] = React.useState('');
  const [newProjectKey, setNewProjectKey] = React.useState('');

  // Color map for known board IDs
  const colorMap: Record<number, string> = {
    1070: '#6C63FF', // Hogwarts Express
    1164: '#00B894', // Feature Freight
    1069: '#0984E3', // CAD
    // Add more known board IDs and colors as needed
  };
  // Fallback color generator for unknown board IDs
  function getColorForBoardId(id: number) {
    if (colorMap[id]) return colorMap[id];
    // Simple hash to color
    let hash = id;
    hash = ((hash << 5) - hash) + 12345;
    const c = (hash & 0x00FFFFFF)
      .toString(16)
      .toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  }

  return (
    <Box display="flex" alignItems="center" gap={2} mb={3}>
      <Typography variant="h6" sx={{ color: '#212529', fontWeight: 700 }}>
        Boards:
      </Typography>
      <Box display="flex" flexWrap="wrap" gap={1}>
        {boards.map(board => {
          const isSelected = selectedBoards.some(b => b.id === board.id);
          const outlineColor = getColorForBoardId(board.id);
          return (
            <button
              key={board.id}
              onClick={() => toggleBoard(board)}
              style={{ 
                padding: '6px 12px', 
                borderRadius: 8, 
                background: isSelected ? outlineColor : '#ffffff',
                color: isSelected ? '#ffffff' : '#212529',
                border: `2.5px solid ${outlineColor}`,
                fontWeight: 600, 
                cursor: 'pointer',
                fontSize: 14,
                boxShadow: isSelected ? `0 0 0 2px ${outlineColor}55` : undefined,
                transition: 'box-shadow 0.2s, border 0.2s',
              }}
              aria-label={`${isSelected ? 'Deselect' : 'Select'} ${board.name}`}
            >
              {board.name}
            </button>
          );
        })}
      </Box>
      <button
        onClick={() => setOpen(true)}
        style={{ 
          marginLeft: 8, 
          padding: '6px 12px', 
          borderRadius: 8, 
          background: '#6C63FF', 
          color: '#fff', 
          border: 'none', 
          fontWeight: 600, 
          cursor: 'pointer' 
        }}
        aria-label="Add board"
      >
        + Add Board
      </button>
      {open && (
        <div role="dialog" aria-modal="true" style={{ 
          background: '#ffffff', 
          color: '#212529', 
          padding: 24, 
          borderRadius: 12, 
          position: 'absolute', 
          top: 80, 
          left: '50%', 
          transform: 'translateX(-50%)', 
          zIndex: 10, 
          minWidth: 320,
          border: '1px solid #dee2e6',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#212529' }}>Add Board</Typography>
          <input
            aria-label="Board name"
            placeholder="Board name/key"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={{ 
              width: '100%', 
              marginBottom: 12, 
              padding: 8, 
              borderRadius: 6, 
              border: '1px solid #dee2e6', 
              background: '#ffffff', 
              color: '#212529' 
            }}
          />
          <input
            aria-label="Board ID"
            placeholder="Board ID"
            value={newId}
            onChange={e => setNewId(e.target.value)}
            style={{ 
              width: '100%', 
              marginBottom: 12, 
              padding: 8, 
              borderRadius: 6, 
              border: '1px solid #dee2e6', 
              background: '#ffffff', 
              color: '#212529' 
            }}
          />
          <input
            aria-label="Project Key"
            placeholder="Project Key (e.g., JPP, CAD)"
            value={newProjectKey}
            onChange={e => setNewProjectKey(e.target.value)}
            style={{ 
              width: '100%', 
              marginBottom: 12, 
              padding: 8, 
              borderRadius: 6, 
              border: '1px solid #dee2e6', 
              background: '#ffffff', 
              color: '#212529' 
            }}
          />
          <Box display="flex" gap={2}>
            <button
              onClick={() => {
                if (newName && newId && newProjectKey) {
                  addBoard({ name: newName, id: Number(newId), projectKey: newProjectKey });
                  setNewName('');
                  setNewId('');
                  setNewProjectKey('');
                  setOpen(false);
                }
              }}
              style={{ 
                padding: '6px 16px', 
                borderRadius: 8, 
                background: '#6C63FF', 
                color: '#fff', 
                border: 'none', 
                fontWeight: 600, 
                cursor: 'pointer' 
              }}
              aria-label="Save board"
            >
              Save
            </button>
            <button
              onClick={() => setOpen(false)}
              style={{ 
                padding: '6px 16px', 
                borderRadius: 8, 
                background: '#6c757d', 
                color: '#fff', 
                border: 'none', 
                fontWeight: 600, 
                cursor: 'pointer' 
              }}
              aria-label="Cancel add board"
            >
              Cancel
            </button>
          </Box>
        </div>
      )}
    </Box>
  );
}

function FeatureProgressDashboardContent() {
  // Add state for team filtering
  const [allTeams, setAllTeams] = React.useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = React.useState<string[]>([]);
  const [useCache, setUseCache] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  // Callback to receive teams from FeatureProgressWidget
  const handleTeamsUpdate = React.useCallback((teams: string[]) => {
    setAllTeams(teams);
  }, []);

  // Ensure selectedTeams is set to allTeams on first load or when allTeams changes and selectedTeams is empty
  React.useEffect(() => {
    if (allTeams.length > 0 && selectedTeams.length === 0) {
      setSelectedTeams(allTeams);
    }
  }, [allTeams, selectedTeams.length]);

  // Team multiselect UI
  function getColorForTeam(team: string) {
    // Use the same color logic as in FeatureProgressWidget
    const teamColorMap: Record<string, string> = {
      'OG Team': '#6C63FF',
      // Add more known teams and colors as needed
    };
    if (teamColorMap[team]) return teamColorMap[team];
    let hash = 0;
    for (let i = 0; i < team.length; i++) {
      hash = team.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  }

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetch('/api/jira-cache', { method: 'DELETE' }); // clear cache via API
    setUseCache(false); // force re-fetch
    setTimeout(() => setUseCache(true), 100); // allow widget to re-mount and re-fetch
    setRefreshing(false);
  };

  const teamSelect = (
    <Box mt={2} mb={3}>
      <Typography variant="subtitle1" sx={{ color: '#212529', fontWeight: 600, mb: 1 }}>Teams:</Typography>
      <Select
        multiple
        value={selectedTeams}
        onChange={e => setSelectedTeams(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
        input={<OutlinedInput label="Teams" />}
        renderValue={(selected: string[]) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {selected.map((team: string) => (
              <Box key={team} display="flex" alignItems="center" gap={0.5} sx={{ px: 1, py: 0.5, borderRadius: 2, bgcolor: '#f3f4f6' }}>
                <span style={{
                  display: 'inline-block',
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: getColorForTeam(team),
                  border: '1.5px solid #fff',
                  boxShadow: '0 0 0 1px #dee2e6',
                  marginRight: 4
                }} />
                <Typography variant="caption" sx={{ color: '#212529', fontWeight: 500 }}>{team}</Typography>
              </Box>
            ))}
          </Box>
        )}
        sx={{ minWidth: 240, background: '#fff', borderRadius: 2 }}
      >
        {allTeams.map(team => (
          <MenuItem key={team} value={team}>
            <Checkbox checked={selectedTeams.indexOf(team) > -1} />
            <ListItemText primary={team} />
          </MenuItem>
        ))}
      </Select>
    </Box>
  );

  return (
    <main style={{ padding: 32, backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <Box maxWidth="1350" mx="auto">
        <Typography variant="h4" sx={{ color: '#212529', fontWeight: 700, mb: 2 }}>
          Feature Progress Dashboard
        </Typography>
        <Typography variant="body1" sx={{ color: '#6c757d', mb: 4 }}>
          Track the progress of features (Epics/Features) based on the completion of their associated stories.
        </Typography>
        <Box display="flex" alignItems="center" gap={2} mb={2}>
          <BoardSwitcher />
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            style={{
              padding: '6px 16px',
              borderRadius: 8,
              background: '#0d6efd',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              cursor: refreshing ? 'not-allowed' : 'pointer',
              opacity: refreshing ? 0.6 : 1
            }}
            aria-label="Manual Refresh"
          >
            {refreshing ? 'Refreshing...' : 'Manual Refresh'}
          </button>
        </Box>
        {teamSelect}
        {useCache && <FeatureProgressWidget onTeamsUpdate={handleTeamsUpdate} selectedTeams={selectedTeams} />}
        {!useCache && null}
      </Box>
    </main>
  );
}

export default function FeatureProgressDashboardPage() {
  return (
    <BoardProvider>
      <FeatureProgressDashboardContent />
    </BoardProvider>
  );
} 