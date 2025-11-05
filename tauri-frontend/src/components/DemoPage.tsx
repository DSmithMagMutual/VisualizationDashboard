import React, { useState, useEffect } from "react";
import { Box, Card, CardContent, Typography, Button, TextField, LinearProgress, Chip, Tooltip, CircularProgress, IconButton, Select, MenuItem, InputLabel, FormControl, OutlinedInput, Checkbox, ListItemText, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Close, ExpandMore, ExpandLess, Edit, Save, Cancel } from '@mui/icons-material';
import { BarChart } from '@mui/x-charts/BarChart';
import RefreshIcon from '@mui/icons-material/Refresh';
import { loadDataSource, getAllAvailableBoards } from '../lib/dataService';
import { invoke } from '@tauri-apps/api/core';
import { fetchCardData, fetchChildIssues, saveBoardDataToPublic } from '../lib/jiraDataService';
import JiraConfigDialog from './JiraConfigDialog';
import LastUpdatedIndicator from './LastUpdatedIndicator';
import ChildWorkItemsWidget from './ChildWorkItemsWidget';
import { useAppState } from '../contexts/AppStateContext';

const ITERATIONS = [
  { key: "5.1", label: "2025 Iteration 5.1", range: "October 7 - October 20" },
  { key: "5.2", label: "2025 Iteration 5.2", range: "October 21 - November 3" },
  { key: "5.3", label: "2025 Iteration 5.3", range: "November 4 - November 17" },
  { key: "5.4", label: "2025 Iteration 5.4", range: "November 18 - December 1" },
  { key: "5.5IP", label: "2025 Iteration 5.5IP", range: "December 2 - December 15" },
  { key: "uncommitted", label: "Uncommitted", range: "" },
];

const teamColorMap: Record<string, string> = {
  'OG Team': '#6C63FF',
  // Add more known teams and colors as needed
};

const statusColors: Record<string, string> = {
  'To Do': '#dc3545',
  'In Progress': '#fd7e14', 
  'Done': '#32cd32',
  'Released': '#32cd32',
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
      statusLower.includes('resolved') ||
      statusLower.includes('released')) {
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

function StatusChart({ columns, iterations }: { columns: Record<string, any[]>; iterations: typeof ITERATIONS }) {
  const statusCategories = ['new', 'indeterminate', 'done'];
  
  // Calculate data for each iteration
  const chartData = iterations.map(iter => {
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

function DemoCard({ card, onDelete, isMinimized, onToggleMinimize, iterationRange }: {
  card: any; 
  onDelete: () => void; 
  isMinimized: boolean;
  onToggleMinimize: () => void;
  iterationRange?: string;
}) {
  // Show all child stories when card is visible (team filtering is handled at card level)
  const filteredStories = React.useMemo(() => {
    console.log(`DemoCard re-rendering for ${card.key}, stories:`, card.stories);
    if (!Array.isArray(card.stories)) return [];
    return card.stories; // Show all stories when card is visible
  }, [card.stories, card.key]);

  const doneCount = filteredStories.filter((s: any) => s.statusCategory === 'done').length || 0;
  const totalCount = filteredStories.length || 0;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  
  console.log(`Progress for ${card.key}: ${doneCount}/${totalCount} = ${pct}%`);
  const team = card.team || 'Other';
  // Check if this is a placeholder card (with backward compatibility)
  // Older JSON files won't have isPlaceholder field, so this will be false for them
  const isPlaceholder = card.isPlaceholder === true;
  
  // Parse iteration range to get end date (e.g., "October 7 - October 20" -> October 20)
  const parseIterationEndDate = React.useMemo(() => {
    if (!iterationRange || !iterationRange.trim()) return null;
    
    try {
      // Try to parse formats like "October 7 - October 20" or "Oct 7 - Oct 20" or "10/7 - 10/20"
      const parts = iterationRange.split('-').map(s => s.trim());
      if (parts.length >= 2) {
        const endDateStr = parts[parts.length - 1]; // Get the last part after the last dash
        const currentYear = new Date().getFullYear();
        
        // Try multiple date formats
        const dateFormats = [
          `${endDateStr} ${currentYear}`, // "October 20 2025"
          endDateStr, // Try as-is in case it already includes year
        ];
        
        for (const dateStr of dateFormats) {
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            // Validate the date is reasonable (not something like "October 40th")
            const day = parsedDate.getDate();
            const month = parsedDate.getMonth();
            const year = parsedDate.getFullYear();
            
            // Check if the parsed date matches what we expect
            // Re-parse to see if the day/month are valid
            const checkDate = new Date(year, month, day);
            if (checkDate.getDate() === day && checkDate.getMonth() === month) {
              console.log(`Parsed iteration end date from "${iterationRange}": ${parsedDate.toISOString().split('T')[0]}`);
              return parsedDate;
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error parsing iteration range "${iterationRange}":`, error);
    }
    return null;
  }, [iterationRange]);

  // Check if card is overdue
  const isOverdue = React.useMemo(() => {
    // First try to use card's dueDate, then fall back to iteration end date
    let dueDateValue = card.dueDate;
    let dueDateSource = 'card.dueDate';
    
    if (!dueDateValue && parseIterationEndDate) {
      dueDateValue = parseIterationEndDate.toISOString().split('T')[0];
      dueDateSource = 'iteration.endDate';
    }
    
    if (!dueDateValue) {
      console.log(`Card ${card.key} has no dueDate field and no iteration range`);
      return false;
    }
    
    try {
      const dueDate = new Date(dueDateValue);
      if (isNaN(dueDate.getTime())) {
        console.log(`Card ${card.key} has invalid dueDate: ${dueDateValue} (from ${dueDateSource})`);
        return false;
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);
      
      // Only show as overdue if status is not done/released
      const isDoneStatus = card.statusCategory === 'done' || 
                           card.status?.toLowerCase().includes('done') || 
                           card.status?.toLowerCase().includes('released');
      
      const overdue = dueDate < today && !isDoneStatus;
      
      if (overdue) {
        console.log(`Card ${card.key} is overdue: dueDate=${dueDateValue} (from ${dueDateSource}), status=${card.status}, statusCategory=${card.statusCategory}`);
      }
      
      return overdue;
    } catch (error) {
      console.error(`Error checking overdue for ${card.key}:`, error);
      return false;
    }
  }, [card.dueDate, card.status, card.statusCategory, card.key, parseIterationEndDate]);
  
  return (
    <Card sx={{ 
      bgcolor: isPlaceholder ? '#f8f9fa' : '#fff', 
      border: isOverdue 
        ? '2px solid #dc3545' 
        : isPlaceholder 
          ? '2px dashed #6c757d' 
          : '1px solid #dee2e6', 
      borderRadius: 1, 
      boxShadow: isPlaceholder ? 0 : 1, 
      mb: 2, 
      position: 'relative',
      opacity: isPlaceholder ? 0.8 : 1
    }}>
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
        {/* Individual refresh button disabled
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
        */}
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
          <Typography variant="subtitle1" fontWeight={600} sx={{ color: isPlaceholder ? '#6c757d' : '#0d6efd', flex: 1, minWidth: 0 }}>
            {card.key ? (
              isPlaceholder ? (
                <span style={{ color: '#6c757d', fontWeight: 600 }}>{card.key}</span>
              ) : (
                <a href={card.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0d6efd', textDecoration: 'none', fontWeight: 600 }}>{card.key}</a>
              )
            ) : card.name}
          </Typography>
          {isPlaceholder && (
            <Chip 
              label="Placeholder" 
              size="small" 
              sx={{ 
                bgcolor: '#6c757d', 
                color: '#fff', 
                fontWeight: 500, 
                borderRadius: 1,
                fontSize: '0.7rem'
              }} 
            />
          )}
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
          <Chip 
            label={card.status} 
            size="small" 
            sx={{ 
              bgcolor: statusColors[card.status] || '#f3f4f6', 
              color: statusColors[card.status] ? '#fff' : '#212529', 
              fontWeight: 500, 
              borderRadius: 1 
            }} 
          />
        </Box>
        
        {/* Progress bar - always visible */}
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#495057', fontWeight: 500 }}>{doneCount}/{totalCount}</Typography>
          <span style={{ color: pct === 100 ? '#32cd32' : pct > 0 ? '#fd7e14' : '#dc3545', fontSize: 18, verticalAlign: 'middle' }}>{pct === 100 ? '✔️' : pct > 0 ? '⏳' : '⚠️'}</span>
          <Typography variant="body2" fontWeight={600} sx={{ color: pct === 100 ? '#32cd32' : pct > 0 ? '#fd7e14' : '#dc3545', fontSize: '0.875rem' }}>{pct}%</Typography>
        </Box>
        <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 1, background: '#e9ecef', '& .MuiLinearProgress-bar': { background: pct === 100 ? '#32cd32' : pct > 0 ? '#fd7e14' : '#dc3545' } }} />
        
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
                        sx={{ 
                          bgcolor: statusColors[story.status] || '#f3f4f6', 
                          color: statusColors[story.status] ? '#fff' : '#212529', 
                          fontWeight: 500, 
                          borderRadius: 1 
                        }} 
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
  const { selectedDataSource, setSelectedDataSource, teamFilter, setTeamFilter } = useAppState();
  const [iterations, setIterations] = useState(ITERATIONS);
  const [availableBoards, setAvailableBoards] = useState<Record<string, string>>({});
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
  const [showJiraConfig, setShowJiraConfig] = useState(false);
  const [showMoveCardDialog, setShowMoveCardDialog] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string>('');
  const [selectedTargetColumn, setSelectedTargetColumn] = useState<string>('');
  const [lastUpdated, setLastUpdated] = useState<string | undefined>();
  const [dataSource, setDataSource] = useState<'jira' | 'static' | undefined>();
  const [projectKey, setProjectKey] = useState<string | undefined>();
  const [editingIteration, setEditingIteration] = useState<string | null>(null);
  const [editingIterationTitle, setEditingIterationTitle] = useState('');
  const [editingIterationRange, setEditingIterationRange] = useState('');
  const [showNewBoardDialog, setShowNewBoardDialog] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
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
  // Function to process relationship data for all cards (temporarily disabled)
  // const processRelationshipDataForAllCards = async (columnsData: Record<string, any[]>) => {
  //   console.log('Processing relationship data for all cards...');
  //   
  //   const processedColumns = { ...columnsData };
  //   
  //   // Process each column
  //   for (const [columnKey, cards] of Object.entries(processedColumns)) {
  //     for (let cardIndex = 0; cardIndex < cards.length; cardIndex++) {
  //       const card = cards[cardIndex];
  //       
  //       // Skip placeholder cards
  //       if (card.isPlaceholder) {
  //         console.log(`Skipping placeholder card ${card.key}`);
  //         continue;
  //       }
  //       
  //       try {
  //         console.log(`Processing relationships for card: ${card.key}`);
  //         
  //         // Fetch fresh data to get relationship information
  //         const freshCardData = await fetchCardData(card.key);
  //         
  //         if (freshCardData && freshCardData.fields && freshCardData.fields.issuelinks) {
  //           // Process relationship data for the main card
  //           const relationships = {
  //             relatesTo: [] as string[],
  //             blocks: [] as string[],
  //             blockedBy: [] as string[]
  //           };

  //           freshCardData.fields.issuelinks.forEach((link: any) => {
  //             const relatedIssue = link.outwardIssue || link.inwardIssue;
  //             if (relatedIssue) {
  //               const relationshipType = link.type.name.toLowerCase();
  //               const issueKey = relatedIssue.key;
  //             
  //               if (relationshipType.includes('relates to') || relationshipType.includes('related')) {
  //                 relationships.relatesTo.push(issueKey);
  //               } else if (relationshipType.includes('blocks')) {
  //                 if (link.outwardIssue) {
  //                   relationships.blocks.push(issueKey);
  //               } else {
  //                   relationships.blockedBy.push(issueKey);
  //                 }
  //               } else if (relationshipType.includes('blocked by')) {
  //                 if (link.outwardIssue) {
  //                   relationships.blockedBy.push(issueKey);
  //               } else {
  //                   relationships.blocks.push(issueKey);
  //                 }
  //               }
  //             }
  //           });
  //           
  //           // Update card with relationship data
  //           processedColumns[columnKey][cardIndex] = {
  //             ...card,
  //             relationships
  //           };
  //           
  //           console.log(`Updated relationships for ${card.key}:`, relationships);
  //         }
  //         
  //         // Process child stories if they exist
  //         if (card.stories && Array.isArray(card.stories) && card.stories.length > 0) {
  //           console.log(`Processing relationships for ${card.stories.length} child stories of ${card.key}`);
  //           
  //           const updatedStories = [];
  //           for (const story of card.stories) {
  //             try {
  //               const storyData = await fetchCardData(story.key);
  //               
  //               if (storyData && storyData.fields && storyData.fields.issuelinks) {
  //                 const storyRelationships = {
  //                   relatesTo: [] as string[],
  //                   blocks: [] as string[],
  //                   blockedBy: [] as string[]
  //                 };

  //                 storyData.fields.issuelinks.forEach((link: any) => {
  //                   const relatedIssue = link.outwardIssue || link.inwardIssue;
  //                   if (relatedIssue) {
  //                     const relationshipType = link.type.name.toLowerCase();
  //                     const issueKey = relatedIssue.key;
  //                     
  //                     if (relationshipType.includes('relates to') || relationshipType.includes('related')) {
  //                       storyRelationships.relatesTo.push(issueKey);
  //                     } else if (relationshipType.includes('blocks')) {
  //                       if (link.outwardIssue) {
  //                         storyRelationships.blocks.push(issueKey);
  //                       } else {
  //                         storyRelationships.blockedBy.push(issueKey);
  //                       }
  //                     } else if (relationshipType.includes('blocked by')) {
  //                       if (link.outwardIssue) {
  //                         storyRelationships.blockedBy.push(issueKey);
  //                       } else {
  //                         storyRelationships.blocks.push(issueKey);
  //                       }
  //                     }
  //                   }
  //                 });
  //                 
  //                 updatedStories.push({
  //                   ...story,
  //                   relationships: storyRelationships
  //                 });
  //                 
  //                 console.log(`Updated relationships for story ${story.key}:`, storyRelationships);
  //               } else {
  //                 updatedStories.push({
  //                   ...story,
  //                   relationships: { relatesTo: [], blocks: [], blockedBy: [] }
  //                 });
  //               }
  //             } catch (error) {
  //               console.error(`Failed to fetch relationship data for story ${story.key}:`, error);
  //               updatedStories.push({
  //                 ...story,
  //                 relationships: { relatesTo: [], blocks: [], blockedBy: [] }
  //               });
  //             }
  //           }
  //           
  //           processedColumns[columnKey][cardIndex].stories = updatedStories;
  //         }
  //         
  //       } catch (error) {
  //         console.error(`Failed to process relationships for card ${card.key}:`, error);
  //         // Add empty relationships if processing fails
  //         processedColumns[columnKey][cardIndex] = {
  //           ...card,
  //           relationships: { relatesTo: [], blocks: [], blockedBy: [] }
  //         };
  //       }
  //     }
  //   }
  //   
  //   return processedColumns;
  // };

  const loadDataSourceData = async (dataSourceKey: string) => {
    try {
      setLoading(true);
      const dataSource = await loadDataSource(dataSourceKey);
      if (dataSource && dataSource.columns) {
        // Load custom iterations if they exist in the data
        if (dataSource.iterations && Array.isArray(dataSource.iterations)) {
          setIterations(dataSource.iterations);
        } else {
          // Use default iterations
          setIterations(ITERATIONS);
        }
        
        // Ensure all iteration keys are present in the loaded state
        const currentIterations = dataSource.iterations && Array.isArray(dataSource.iterations) 
          ? dataSource.iterations 
          : ITERATIONS;
        const initializedColumns = currentIterations.reduce((acc: Record<string, any[]>, iter: any) => {
          acc[iter.key] = (dataSource.columns as Record<string, any[]>)?.[iter.key] || [];
          return acc;
        }, {});
        
        // Set columns immediately to show the board
        setColumns(initializedColumns);
        setBoardTitle(`Demo Iteration Board - ${dataSourceKey}`);
        setTeamFilter([]); // Reset team filter when data source changes
        
        // Update metadata
        setLastUpdated(dataSource.lastUpdated);
        setDataSource(dataSource.source);
        setProjectKey(dataSource.projectKey);
        
        // Temporarily disable relationship processing to fix white screen issue
        // setTimeout(async () => {
        //   try {
        //     console.log('Starting background relationship processing...');
        //     const processedColumns = await processRelationshipDataForAllCards(initializedColumns);
        //     
        //     // Update columns with relationship data
        //     setColumns(processedColumns);
        //     
        //     // Save the processed data with relationships
        //     const updatedDataSource = {
        //       ...dataSource,
        //       columns: processedColumns,
        //       lastUpdated: new Date().toISOString()
        //     };
        //     const fileName = dataSourceKey === 'board-saveAdvice' ? 'board-saveAdvice.json' : 'board-savePDD.json';
        //     await saveBoardData(updatedDataSource, fileName);
        //     console.log(`Saved board data with relationships for ${dataSourceKey}`);
        //   } catch (error) {
        //     console.error(`Failed to process relationships in background:`, error);
        //   }
        // }, 100); // Small delay to ensure UI is responsive
      }
    } catch (error) {
      console.error('Failed to load data source:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load available boards on component mount
  useEffect(() => {
    const loadAvailableBoards = async () => {
      try {
        const boards = await getAllAvailableBoards();
        setAvailableBoards(boards);
      } catch (error) {
        console.error('Failed to load available boards:', error);
      }
    };
    loadAvailableBoards();
  }, []);

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
    
    // Create a placeholder card that will be converted to real data when refreshed
    const placeholderCard = {
      key: cardName,
      url: `https://magmutual.atlassian.net/browse/${cardName}`,
      summary: `Loading data for ${cardName}...`,
      status: 'Loading...',
      statusCategory: 'new',
      team: 'Loading...',
      stories: [],
      isPlaceholder: true // Flag to identify placeholder cards
    };
    
    const newColumns = {
      ...columns,
      [colKey]: [
        ...columns[colKey],
        placeholderCard,
      ],
    };
    setColumns(newColumns);
    setInputs(inputs => ({ ...inputs, [colKey]: "" }));
    
    // Save the updated board data to JSON file
    try {
      const boardData = {
        iterations,
        columns: newColumns,
        lastUpdated: new Date().toISOString(),
        source: dataSource || 'jira',
        projectKey: projectKey
      };
      
      // Determine the file name based on the current data source
      let fileName = 'board-savePDD.json'; // default
      if (selectedDataSource === 'board-saveAdvice') {
        fileName = 'board-saveAdvice.json';
      } else if (selectedDataSource === 'board-savePI5Advice') {
        fileName = 'board-savePI5Advice.json';
      } else if (selectedDataSource === 'board-savePI5PDD') {
        fileName = 'board-savePI5PDD.json';
      }
      
      console.log(`Saving added card data to public directory: ${fileName}`);
      await saveBoardDataToPublic(boardData, fileName);
      console.log('Board data saved successfully after adding card');
      
      // Now reload the data from the JSON file to ensure we're in sync
      console.log('Reloading data from JSON file...');
      const reloadedData = await loadDataSource(selectedDataSource);
      if (reloadedData && reloadedData.columns) {
        // Load iterations if they exist
        if (reloadedData.iterations && Array.isArray(reloadedData.iterations)) {
          setIterations(reloadedData.iterations);
        }
        
        // Ensure all iteration keys are present in the reloaded state
        const currentIterations = reloadedData.iterations && Array.isArray(reloadedData.iterations) 
          ? reloadedData.iterations 
          : iterations;
        const initializedColumns = currentIterations.reduce((acc: Record<string, any[]>, iter: any) => {
          acc[iter.key] = (reloadedData.columns as Record<string, any[]>)?.[iter.key] || [];
          return acc;
        }, {});
        
        // Update state with reloaded data
        setColumns(initializedColumns);
        setLastUpdated(reloadedData.lastUpdated);
        setDataSource(reloadedData.source);
        setProjectKey(reloadedData.projectKey);
        console.log('Data reloaded successfully from JSON file');
      }
    } catch (error) {
      console.error('Failed to save or reload board data after adding card:', error);
    }
  };

  const handleMoveCard = async () => {
    if (!selectedCardId || !selectedTargetColumn) {
      setNotification({
        open: true,
        message: 'Please select both a card and target column',
        severity: 'warning'
      });
      return;
    }
    
    // Parse card ID: "columnKey:index"
    const [sourceColumnKey, cardIndex] = selectedCardId.split(':');
    const sourceIndex = parseInt(cardIndex);
    
    if (sourceColumnKey === selectedTargetColumn) {
      setNotification({
        open: true,
        message: 'Card is already in the target column',
        severity: 'info'
      });
      return;
    }
    
    // Get the card
    const sourceColumn = columns[sourceColumnKey] || [];
    const card = sourceColumn[sourceIndex];
    
    if (!card) {
      setNotification({
        open: true,
        message: 'Card not found',
        severity: 'error'
      });
      return;
    }
    
    // Move the card locally
    const newColumns = { ...columns };
    newColumns[sourceColumnKey] = sourceColumn.filter((_, index) => index !== sourceIndex);
    newColumns[selectedTargetColumn] = [...newColumns[selectedTargetColumn], card];
    
    // Update state immediately for UI responsiveness
    setColumns(newColumns);
    setShowMoveCardDialog(false);
    setSelectedCardId('');
    setSelectedTargetColumn('');
    
    // Save the updated board data to JSON file
    try {
      const boardData = {
        iterations,
        columns: newColumns,
        lastUpdated: new Date().toISOString(),
        source: dataSource || 'jira',
        projectKey: projectKey
      };
      
      // Determine the file name based on the current data source
      let fileName = 'board-savePDD.json'; // default
      if (selectedDataSource === 'board-saveAdvice') {
        fileName = 'board-saveAdvice.json';
      } else if (selectedDataSource === 'board-savePI5Advice') {
        fileName = 'board-savePI5Advice.json';
      } else if (selectedDataSource === 'board-savePI5PDD') {
        fileName = 'board-savePI5PDD.json';
      }
      
      console.log(`Saving moved card data to public directory: ${fileName}`);
      await saveBoardDataToPublic(boardData, fileName);
      console.log('Board data saved successfully after moving card');
      
      // Now reload the data from the JSON file to ensure we're in sync
      console.log('Reloading data from JSON file...');
      const reloadedData = await loadDataSource(selectedDataSource);
      if (reloadedData && reloadedData.columns) {
        // Load iterations if they exist
        if (reloadedData.iterations && Array.isArray(reloadedData.iterations)) {
          setIterations(reloadedData.iterations);
        }
        
        // Ensure all iteration keys are present in the reloaded state
        const currentIterations = reloadedData.iterations && Array.isArray(reloadedData.iterations) 
          ? reloadedData.iterations 
          : iterations;
        const initializedColumns = currentIterations.reduce((acc: Record<string, any[]>, iter: any) => {
          acc[iter.key] = (reloadedData.columns as Record<string, any[]>)?.[iter.key] || [];
          return acc;
        }, {});
        
        // Update state with reloaded data
        setColumns(initializedColumns);
        setLastUpdated(reloadedData.lastUpdated);
        setDataSource(reloadedData.source);
        setProjectKey(reloadedData.projectKey);
        console.log('Data reloaded successfully from JSON file');
      }
    } catch (error) {
      console.error('Failed to save or reload board data after moving card:', error);
      setNotification({
        open: true,
        message: 'Failed to save changes',
        severity: 'error'
      });
      return;
    }
    
    const targetIteration = ITERATIONS.find(iter => iter.key === selectedTargetColumn);
    setNotification({
      open: true,
      message: `Moved ${card.key} to ${targetIteration?.label || selectedTargetColumn}`,
      severity: 'success'
    });
  };

  const handleDeleteCard = async (colKey: string, cardKey: string) => {
    // Find the actual index in the unfiltered array
    const cardIndex = columns[colKey].findIndex(card => card.key === cardKey);
    if (cardIndex === -1) return; // Card not found
    
    const cardId = `${colKey}-${cardKey}`;
    
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
    
    // Save the updated board data to JSON file
    try {
      const boardData = {
        iterations,
        columns: newColumns,
        lastUpdated: new Date().toISOString(),
        source: dataSource || 'jira',
        projectKey: projectKey
      };
      
      // Determine the file name based on the current data source
      let fileName = 'board-savePDD.json'; // default
      if (selectedDataSource === 'board-saveAdvice') {
        fileName = 'board-saveAdvice.json';
      } else if (selectedDataSource === 'board-savePI5Advice') {
        fileName = 'board-savePI5Advice.json';
      } else if (selectedDataSource === 'board-savePI5PDD') {
        fileName = 'board-savePI5PDD.json';
      }
      
      console.log(`Saving deleted card data to public directory: ${fileName}`);
      await saveBoardDataToPublic(boardData, fileName);
      console.log('Board data saved successfully after deleting card');
      
      // Now reload the data from the JSON file to ensure we're in sync
      console.log('Reloading data from JSON file...');
      const reloadedData = await loadDataSource(selectedDataSource);
      if (reloadedData && reloadedData.columns) {
        // Load iterations if they exist
        if (reloadedData.iterations && Array.isArray(reloadedData.iterations)) {
          setIterations(reloadedData.iterations);
        }
        
        // Ensure all iteration keys are present in the reloaded state
        const currentIterations = reloadedData.iterations && Array.isArray(reloadedData.iterations) 
          ? reloadedData.iterations 
          : iterations;
        const initializedColumns = currentIterations.reduce((acc: Record<string, any[]>, iter: any) => {
          acc[iter.key] = (reloadedData.columns as Record<string, any[]>)?.[iter.key] || [];
          return acc;
        }, {});
        
        // Update state with reloaded data
        setColumns(initializedColumns);
        setLastUpdated(reloadedData.lastUpdated);
        setDataSource(reloadedData.source);
        setProjectKey(reloadedData.projectKey);
        console.log('Data reloaded successfully from JSON file');
      }
    } catch (error) {
      console.error('Failed to save or reload board data after deleting card:', error);
    }
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



  const handleToggleMinimize = (colKey: string, cardKey: string) => {
    const cardId = `${colKey}-${cardKey}`;
    
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

  const handleCreateNewBoard = async () => {
    if (!newBoardName.trim()) {
      setNotification({
        open: true,
        message: 'Please enter a board name',
        severity: 'warning'
      });
      return;
    }

    const boardKey = newBoardName.trim().replace(/\s+/g, '');
    const fileName = `board-save${boardKey}.json`;

    // Check if board already exists
    const existingBoards = ['board-saveAdvice', 'board-savePDD', 'board-savePI5Advice', 'board-savePI5PDD'];
    if (existingBoards.includes(`board-save${boardKey}`)) {
      setNotification({
        open: true,
        message: 'A board with this name already exists',
        severity: 'warning'
      });
      return;
    }

    try {
      // Create new board with default iterations
      const newBoardData = {
        iterations: ITERATIONS,
        columns: ITERATIONS.reduce((acc, iter) => {
          acc[iter.key] = [];
          return acc;
        }, {} as Record<string, any[]>),
        lastUpdated: new Date().toISOString(),
        source: 'static',
        projectKey: `board-save${boardKey}`
      };

      await saveBoardDataToPublic(newBoardData, fileName);
      
      setNotification({
        open: true,
        message: `New board "${newBoardName}" created successfully`,
        severity: 'success'
      });
      
      setShowNewBoardDialog(false);
      setNewBoardName('');
      
      // Update available boards list
      const updatedBoards = await getAllAvailableBoards();
      setAvailableBoards(updatedBoards);
      
      // Switch to the new board
      setSelectedDataSource(`board-save${boardKey}`);
    } catch (error) {
      console.error('Failed to create new board:', error);
      setNotification({
        open: true,
        message: 'Failed to create new board',
        severity: 'error'
      });
    }
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
            let freshCardData;
            try {
              freshCardData = await fetchCardData(card.key);
              console.log(`Fresh data for ${card.key}:`, freshCardData);
              console.log(`Fresh data fields for ${card.key}:`, freshCardData?.fields);
              console.log(`Status field for ${card.key}:`, freshCardData?.fields?.status);
            } catch (error) {
              console.error(`Failed to fetch data for ${card.key}:`, error);
              if (card.isPlaceholder) {
                console.log(`Keeping ${card.key} as placeholder - API call failed`);
              }
              return; // Don't update the card if the API call failed
            }
            
            // Check if we got a valid response with fields
            if (!freshCardData || !freshCardData.fields) {
              console.error(`No valid data received for ${card.key}. Response:`, freshCardData);
              if (card.isPlaceholder) {
                console.log(`Keeping ${card.key} as placeholder - no valid response received`);
              }
              return; // Don't update the card if we didn't get valid data
            }
            
            // Update the card with fresh data
            if (freshCardData && freshCardData.fields) {
              const fields = freshCardData.fields;
              
              // Check if we got meaningful data (not just empty/error responses)
              const hasValidStatus = fields.status && fields.status.name && fields.status.name !== 'Loading...';
              const hasValidSummary = fields.summary && fields.summary !== `Loading data for ${card.key}...`;
              const hasValidTeam = (fields.customfield_10014 && fields.customfield_10014 !== 'Loading...') || 
                                   (fields.customfield_10001 && fields.customfield_10001.name && fields.customfield_10001.name !== 'Loading...');
              
              // Only convert placeholder card to real card if we got meaningful data
              if (card.isPlaceholder && (hasValidStatus || hasValidSummary || hasValidTeam)) {
                console.log(`Converting placeholder card ${card.key} to real card with valid data`);
                card.isPlaceholder = false;
              } else if (card.isPlaceholder) {
                console.log(`Keeping ${card.key} as placeholder - no valid data received`);
              }
              
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
              
              // Update team if available (check both possible team fields)
              if (fields.customfield_10014) {
                card.team = fields.customfield_10014;
              } else if (fields.customfield_10001 && fields.customfield_10001.name) {
                card.team = fields.customfield_10001.name;
              }
              
              // Update due date if available (check standard dueDate field and common custom fields)
              // Try multiple possible field names/IDs
              console.log(`Checking due date fields for ${card.key}:`, Object.keys(fields).filter(k => k.toLowerCase().includes('due')));
              
              if (fields.duedate) {
                card.dueDate = fields.duedate;
                console.log(`Found due date (duedate) for ${card.key}: ${card.dueDate}`);
              } else if (fields.dueDate) {
                card.dueDate = fields.dueDate;
                console.log(`Found due date (dueDate) for ${card.key}: ${card.dueDate}`);
              } else {
                // Check all custom fields for a date field that might be the due date
                // Look for fields that contain "due" in the name (case insensitive)
                const fieldKeys = Object.keys(fields);
                const dueDateField = fieldKeys.find(key => {
                  const keyLower = key.toLowerCase();
                  return keyLower.includes('due') && 
                         fields[key] && 
                         (typeof fields[key] === 'string' || typeof fields[key] === 'object');
                });
                if (dueDateField) {
                  // Handle both string dates and date objects
                  const dateValue = fields[dueDateField];
                  card.dueDate = typeof dateValue === 'string' ? dateValue : (dateValue?.toString() || dateValue);
                  console.log(`Found due date field: ${dueDateField} = ${card.dueDate} for ${card.key}`);
                } else {
                  // Check common custom field IDs for date-like values
                  for (let i = 10000; i <= 10100; i++) {
                    const fieldKey = `customfield_${i}`;
                    const fieldValue = fields[fieldKey];
                    if (fieldValue) {
                      const valueStr = typeof fieldValue === 'string' ? fieldValue : (fieldValue?.toString() || '');
                      if (valueStr.match(/\d{4}-\d{2}-\d{2}/)) {
                        card.dueDate = valueStr;
                        console.log(`Found due date in custom field: ${fieldKey} = ${card.dueDate} for ${card.key}`);
                        break;
                      }
                    }
                  }
                }
              }
              
              // Process relationship data for the main card
              const relationships = {
                relatesTo: [] as string[],
                blocks: [] as string[],
                blockedBy: [] as string[]
              };

              if (fields.issuelinks) {
                fields.issuelinks.forEach((link: any) => {
                  const relatedIssue = link.outwardIssue || link.inwardIssue;
                  if (relatedIssue) {
                    const relationshipType = link.type.name.toLowerCase();
                    const issueKey = relatedIssue.key;
                    
                    if (relationshipType.includes('relates to') || relationshipType.includes('related')) {
                      relationships.relatesTo.push(issueKey);
                    } else if (relationshipType.includes('blocks')) {
                      if (link.outwardIssue) {
                        relationships.blocks.push(issueKey);
                      } else {
                        relationships.blockedBy.push(issueKey);
                      }
                    } else if (relationshipType.includes('blocked by')) {
                      if (link.outwardIssue) {
                        relationships.blockedBy.push(issueKey);
                      } else {
                        relationships.blocks.push(issueKey);
                      }
                    }
                  }
                });
              }
              
              // Update card relationships
              card.relationships = relationships;
              
              // Fetch and update child work items (stories)
              try {
                console.log(`Fetching child issues for ${card.key}`);
                
                const childIssuesData = await fetchChildIssues(card.key);
                console.log(`Child issues response for ${card.key}:`, childIssuesData);
                
                if (childIssuesData && childIssuesData.issues && Array.isArray(childIssuesData.issues)) {
                  console.log(`Found ${childIssuesData.issues.length} child issues for ${card.key}:`, childIssuesData.issues);
                  
                  const updatedStories = childIssuesData.issues.map((childIssue: any) => {
                    const newStatus = childIssue.fields.status?.name || 'Unknown';
                    const newStatusCategory = getStatusCategory(newStatus);
                    const newSummary = childIssue.fields.summary || childIssue.key;
                    const newTeam = childIssue.fields.customfield_10014 || 
                                    (childIssue.fields.customfield_10001 && childIssue.fields.customfield_10001.name) || 
                                    'Unknown Team';
                    
                    // Process relationship data
                    const relationships = {
                      relatesTo: [] as string[],
                      blocks: [] as string[],
                      blockedBy: [] as string[]
                    };

                    if (childIssue.fields.issuelinks) {
                      childIssue.fields.issuelinks.forEach((link: any) => {
                        const relatedIssue = link.outwardIssue || link.inwardIssue;
                        if (relatedIssue) {
                          const relationshipType = link.type.name.toLowerCase();
                          const issueKey = relatedIssue.key;
                          
                          if (relationshipType.includes('relates to') || relationshipType.includes('related')) {
                            relationships.relatesTo.push(issueKey);
                          } else if (relationshipType.includes('blocks')) {
                            if (link.outwardIssue) {
                              relationships.blocks.push(issueKey);
                            } else {
                              relationships.blockedBy.push(issueKey);
                            }
                          } else if (relationshipType.includes('blocked by')) {
                            if (link.outwardIssue) {
                              relationships.blockedBy.push(issueKey);
                            } else {
                              relationships.blocks.push(issueKey);
                            }
                          }
                        }
                      });
                    }
                    
                    console.log(`Processing child issue ${childIssue.key}:`, {
                      summary: newSummary,
                      status: newStatus,
                      team: newTeam,
                      relationships
                    });
                    
                    return {
                      key: childIssue.key,
                      summary: newSummary,
                      status: newStatus,
                      statusCategory: newStatusCategory,
                      team: newTeam,
                      relationships
                    };
                  });
                  
                  card.stories = updatedStories;
                  console.log(`Updated ${updatedStories.length} child work items for ${card.key}:`, updatedStories);
                } else {
                  console.log(`No child issues found for ${card.key}`);
                  card.stories = [];
                }
              } catch (error) {
                console.error(`Error fetching child issues for ${card.key}:`, error);
                // Keep existing stories if fetch fails
              }
              
              refreshedCount++;
            }
          } catch (error) {
            console.error(`Failed to refresh card ${card.key}:`, error);
            
            // If this is a placeholder card that failed to refresh, keep it as placeholder
            if (card.isPlaceholder) {
              console.log(`Keeping ${card.key} as placeholder due to refresh failure`);
              // Don't increment error count for placeholder cards that fail
            } else {
              errorCount++;
            }
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
          iterations,
          columns: updatedColumns,
          lastUpdated: new Date().toISOString(),
          source: 'jira',
          projectKey: projectKey
        };
        
        // Determine the file name based on the current data source
        let fileName = 'board-savePDD.json'; // default
        if (selectedDataSource === 'board-saveAdvice') {
          fileName = 'board-saveAdvice.json';
        } else if (selectedDataSource === 'board-savePI5Advice') {
          fileName = 'board-savePI5Advice.json';
        } else if (selectedDataSource === 'board-savePI5PDD') {
          fileName = 'board-savePI5PDD.json';
        }
        
        console.log(`Saving updated board data to public directory: ${fileName}`);
        await saveBoardDataToPublic(boardData, fileName);
        console.log('Board data saved successfully to public directory');
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
                cards.forEach((card) => {
                  allCardIds.add(`${colKey}-${card.key}`);
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
              {Object.entries(availableBoards).map(([key]) => (
                <MenuItem key={key} value={key}>
                  {key.replace('board-save', '').replace(/([A-Z])/g, ' $1').trim()}
                </MenuItem>
              ))}
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

        {/* Action Buttons */}
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
          
          <Button
            variant="outlined"
            size="small"
            onClick={() => setShowMoveCardDialog(true)}
            sx={{
              borderColor: '#6c757d',
              color: '#6c757d',
              fontWeight: 600,
              '&:hover': {
                borderColor: '#5a6268',
                backgroundColor: 'rgba(108, 117, 125, 0.1)'
              },
              textTransform: 'none',
            }}
          >
            Move Card
          </Button>
          
          <Button
            variant="outlined"
            size="small"
            onClick={() => setShowNewBoardDialog(true)}
            sx={{
              borderColor: '#28a745',
              color: '#28a745',
              fontWeight: 600,
              '&:hover': {
                borderColor: '#218838',
                backgroundColor: 'rgba(40, 167, 69, 0.1)'
              },
              textTransform: 'none',
            }}
          >
            New Board
          </Button>

        </Box>


      </Box>
      {/* PI Status Summary Box */}
      <Box sx={{ mb: 4, maxWidth: 600, bgcolor: '#fff', border: '1px solid #dee2e6', borderRadius: 1, boxShadow: 1, p: 3 }}>
        {(() => {
          // Gather all child stories across all iterations, filtered by team if filter is applied
          const allStories = Object.values(columns).flat().flatMap(card => {
            if (!card.stories) return [];
            // Only include stories from cards that match the team filter
            if (cardMatchesTeamFilter(card)) {
              return card.stories;
            }
            return [];
          });
          const total = allStories.length;
          const done = allStories.filter((s: any) => getStatusCategory(s.status) === 'done').length;
          const inProgress = allStories.filter((s: any) => getStatusCategory(s.status) === 'indeterminate').length;
          const notStarted = allStories.filter((s: any) => getStatusCategory(s.status) === 'new').length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          let barColor = '#e9ecef';
          if (pct === 100 && total > 0) barColor = '#32cd32';
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
                <Typography variant="body1" sx={{ color: '#32cd32' }}>Done: <b>{done}</b></Typography>
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
        {iterations.map(iter => (
          <Box key={iter.key} sx={{ minWidth: 320, background: '#fff', border: '1px solid #e9ecef', borderRadius: 1, p: 2, display: 'flex', flexDirection: 'column', minHeight: 600 }}>
            <Box mb={2} position="relative">
              {editingIteration === iter.key ? (
                <Box>
                  <TextField
                    fullWidth
                    size="small"
                    value={editingIterationTitle}
                    onChange={(e) => setEditingIterationTitle(e.target.value)}
                    placeholder="Iteration Title"
                    sx={{ mb: 1 }}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    value={editingIterationRange}
                    onChange={(e) => setEditingIterationRange(e.target.value)}
                    placeholder="Date Range"
                    sx={{ mb: 1 }}
                  />
                  <Box display="flex" gap={1}>
                    <IconButton
                      size="small"
                      onClick={async () => {
                        const updated = iterations.map(i => 
                          i.key === iter.key 
                            ? { ...i, label: editingIterationTitle, range: editingIterationRange }
                            : i
                        );
                        setIterations(updated);
                        setEditingIteration(null);
                        
                        // Save to JSON
                        const boardData = {
                          iterations: updated,
                          columns,
                          lastUpdated: new Date().toISOString(),
                          source: dataSource || 'jira',
                          projectKey: projectKey
                        };
                        
                        let fileName = 'board-savePDD.json';
                        if (selectedDataSource === 'board-saveAdvice') {
                          fileName = 'board-saveAdvice.json';
                        } else if (selectedDataSource === 'board-savePI5Advice') {
                          fileName = 'board-savePI5Advice.json';
                        } else if (selectedDataSource === 'board-savePI5PDD') {
                          fileName = 'board-savePI5PDD.json';
                        }
                        
                        await saveBoardDataToPublic(boardData, fileName);
                      }}
                      sx={{ color: '#32cd32' }}
                    >
                      <Save />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditingIteration(null);
                      }}
                      sx={{ color: '#dc3545' }}
                    >
                      <Cancel />
                    </IconButton>
                  </Box>
                </Box>
              ) : (
                <Box>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box flex={1}>
                      <Typography variant="h6" fontWeight={600} sx={{ color: '#212529' }}>{iter.label}</Typography>
                      <Typography variant="caption" sx={{ color: '#6c757d' }}>{iter.range}</Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditingIteration(iter.key);
                        setEditingIterationTitle(iter.label);
                        setEditingIterationRange(iter.range);
                      }}
                      sx={{ color: '#6c757d' }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              )}
            </Box>
            {(() => {
              // Gather all child stories for this iteration (filtered by team)
              const cards = columns[iter.key] || [];
              const filteredCards = cards.filter(cardMatchesTeamFilter);
              const allStories = filteredCards.flatMap(card => card.stories || []);
              const total = allStories.length;
              const done = allStories.filter((s: any) => getStatusCategory(s.status) === 'done').length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              let barColor = '#e9ecef';
              if (pct === 100 && total > 0) barColor = '#32cd32';
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
                const cardId = `${iter.key}-${card.key}`;
                const isMinimized = minimizedCards.has(cardId);
                return (
                  <DemoCard 
                    key={card.key || idx} 
                    card={card} 
                    onDelete={() => handleDeleteCard(iter.key, card.key)}
                    isMinimized={isMinimized}
                    onToggleMinimize={() => handleToggleMinimize(iter.key, card.key)}
                    iterationRange={iter.range}
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
      <StatusChart 
        columns={Object.fromEntries(
          Object.entries(columns).map(([key, cards]) => [
            key, 
            cards.filter(cardMatchesTeamFilter)
          ])
        )}
        iterations={iterations}
      />
      
      {/* Child Work Items Widget */}
      <Box sx={{ mb: 4 }}>
        <ChildWorkItemsWidget 
          boardData={{ columns }} 
          onRefresh={handleRefreshData}
        />
      </Box>
      
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

      {/* Move Card Dialog */}
      <Dialog open={showMoveCardDialog} onClose={() => setShowMoveCardDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Move Card Between Iterations</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <InputLabel>Select Card</InputLabel>
            <Select
              value={selectedCardId}
              onChange={(e) => setSelectedCardId(e.target.value)}
              label="Select Card"
            >
              {Object.entries(columns).map(([colKey, cards]) => 
                cards.map((card, index) => (
                  <MenuItem key={`${colKey}:${index}`} value={`${colKey}:${index}`}>
                    {card.key} - {card.summary} ({ITERATIONS.find(i => i.key === colKey)?.label || colKey})
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Target Column</InputLabel>
            <Select
              value={selectedTargetColumn}
              onChange={(e) => setSelectedTargetColumn(e.target.value)}
              label="Target Column"
            >
              {ITERATIONS.map(iter => (
                <MenuItem key={iter.key} value={iter.key}>
                  {iter.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowMoveCardDialog(false)}>Cancel</Button>
          <Button onClick={handleMoveCard} variant="contained">Move Card</Button>
        </DialogActions>
      </Dialog>

      {/* New Board Dialog */}
      <Dialog open={showNewBoardDialog} onClose={() => setShowNewBoardDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Board</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            fullWidth
            label="Board Name"
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
            placeholder="e.g., My Custom Board"
            sx={{ mb: 2 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreateNewBoard();
              }
            }}
          />
          <Typography variant="body2" color="text.secondary">
            This will create a new board file in your Downloads folder that you can customize with your own iterations and cards.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowNewBoardDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateNewBoard} variant="contained">Create Board</Button>
        </DialogActions>
      </Dialog>

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