'use client'

import React, { useState, useEffect } from "react";
import { Box, Card, CardContent, Typography, Button, TextField, LinearProgress, Chip, Tooltip, CircularProgress, IconButton } from '@mui/material';
import { Close, Refresh } from '@mui/icons-material';

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

function DemoCard({ card, onDelete, onReload }: { card: any; onDelete: () => void; onReload: () => void }) {
  const doneCount = card.stories?.filter((s: any) => s.statusCategory === 'done').length || 0;
  const totalCount = card.stories?.length || 0;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const team = card.team || 'Other';
  return (
    <Card sx={{ bgcolor: '#fff', border: '1px solid #dee2e6', borderRadius: 3, boxShadow: 1, mb: 2, position: 'relative' }}>
      <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5 }}>
        <Tooltip title="Refresh card data">
          <IconButton
            size="small"
            onClick={onReload}
            sx={{ 
              color: '#0d6efd', 
              bgcolor: 'rgba(13, 110, 253, 0.1)',
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
              '&:hover': { bgcolor: 'rgba(220, 53, 69, 0.2)' }
            }}
          >
            <Close fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      <CardContent sx={{ p: 2, pr: 6 }}>
        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
          <Typography variant="subtitle1" fontWeight={600} sx={{ color: '#0d6efd' }}>
            {card.key ? (
              <a href={card.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0d6efd', textDecoration: 'none', fontWeight: 600 }}>{card.key}</a>
            ) : card.name}
          </Typography>
          <Tooltip title={team} placement="top">
            <span style={{
              display: 'inline-block',
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: getColorForTeam(team),
              border: '1.5px solid #fff',
              boxShadow: '0 0 0 1px #dee2e6',
              marginRight: 4
            }} />
          </Tooltip>
          <Typography variant="caption" sx={{ color: '#212529', fontWeight: 500 }}>{team}</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Chip label={card.status} size="small" sx={{ bgcolor: '#f3f4f6', color: '#212529', fontWeight: 500 }} />
        </Box>
        <Typography variant="body2" sx={{ color: '#495057', fontSize: '0.95em', mb: 1 }}>
          {card.summary || 'Card subtitle or description'}
        </Typography>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#495057', fontWeight: 500 }}>{doneCount}/{totalCount}</Typography>
          <span style={{ color: pct === 100 ? '#198754' : pct > 0 ? '#fd7e14' : '#dc3545', fontSize: 18, verticalAlign: 'middle' }}>{pct === 100 ? '✔️' : pct > 0 ? '⏳' : '⚠️'}</span>
          <Typography variant="body2" fontWeight={600} sx={{ color: pct === 100 ? '#198754' : pct > 0 ? '#fd7e14' : '#dc3545', fontSize: '0.875rem' }}>{pct}%</Typography>
        </Box>
        <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 4, background: '#e9ecef', '& .MuiLinearProgress-bar': { background: pct === 100 ? '#198754' : pct > 0 ? '#fd7e14' : '#dc3545' } }} />
        {card.stories && card.stories.length > 0 && (
          <Box mt={2}>
            <Typography variant="subtitle2" sx={{ color: '#212529', fontWeight: 600, mb: 1 }}>Child work items</Typography>
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              {card.stories.map((story: any) => (
                <li key={story.key} style={{ marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: '#0d6efd', marginRight: 8 }}>{story.key}</span>
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
                  <Chip label={story.status} size="small" sx={{ bgcolor: '#f3f4f6', color: '#212529', fontWeight: 500 }} />
                </li>
              ))}
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

async function saveBoardState(columns: Record<string, any[]>) {
  await fetch('/api/board-save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ columns }),
  });
}

async function loadBoardState(): Promise<Record<string, any[]> | null> {
  try {
    const response = await fetch('/api/board-save');
    if (response.ok) {
      const data = await response.json();
      return data.columns || null;
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

  useEffect(() => {
    const loadSavedState = async () => {
      try {
        setLoading(true);
        const savedColumns = await loadBoardState();
        if (savedColumns) {
          // Ensure all iteration keys are present in the loaded state
          const initializedColumns = ITERATIONS.reduce((acc, iter) => {
            acc[iter.key] = savedColumns[iter.key] || [];
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
    await saveBoardState(newColumns);
  };

  const handleDeleteCard = async (colKey: string, cardIndex: number) => {
    const newColumns = {
      ...columns,
      [colKey]: columns[colKey].filter((_, index) => index !== cardIndex)
    };
    setColumns(newColumns);
    await saveBoardState(newColumns);
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
    await saveBoardState(newColumns);
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
      <Typography variant="h4" fontWeight={700} sx={{ color: '#212529', mb: 4 }}>
        Demo Iteration Board
      </Typography>
      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
      <Box sx={{ display: 'flex', gap: 3, overflowX: 'auto', minWidth: 1200 }}>
        {ITERATIONS.map(iter => (
          <Box key={iter.key} sx={{ minWidth: 320, background: '#fff', border: '1px solid #e9ecef', borderRadius: 3, p: 2, display: 'flex', flexDirection: 'column', minHeight: 600 }}>
            <Box mb={2}>
              <Typography variant="h6" fontWeight={600} sx={{ color: '#212529' }}>{iter.label}</Typography>
              <Typography variant="caption" sx={{ color: '#6c757d' }}>{iter.range}</Typography>
            </Box>
            <Box flex={1} mb={2}>
              {columns[iter.key].map((card, idx) => (
                <DemoCard 
                  key={idx} 
                  card={card} 
                  onDelete={() => handleDeleteCard(iter.key, idx)}
                  onReload={() => handleReloadCard(iter.key, idx)}
                />
              ))}
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
                sx={{ mb: 1, background: '#fff' }}
                inputProps={{ style: { color: '#212529' } }}
              />
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={() => handleAddCard(iter.key)}
                sx={{ fontWeight: 600 }}
              >
                Add
              </Button>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
} 