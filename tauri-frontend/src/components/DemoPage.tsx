import React, { useState, useEffect, useRef, useMemo } from "react";
import { Box, Card, CardContent, Typography, Button, TextField, LinearProgress, Chip, Tooltip, CircularProgress, IconButton, Select, MenuItem, InputLabel, FormControl, OutlinedInput, Checkbox, ListItemText, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Paper, List, ListItem, ListItemButton, ListItemText as MuiListItemText, InputAdornment } from '@mui/material';
import { Close, ExpandMore, ExpandLess, Edit, Save, Cancel, Search } from '@mui/icons-material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { loadDataSource, getAllAvailableBoards } from '../lib/dataService';
import { invoke } from '@tauri-apps/api/core';
import { fetchCardData, fetchChildIssues, saveBoardDataToPublic, logBoardAction } from '../lib/jiraDataService';
import JiraConfigDialog from './JiraConfigDialog';
import LastUpdatedIndicator from './LastUpdatedIndicator';
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

// Simplified color palette
const colors = {
  // Status colors
  notStarted: '#dc3545',    // Red
  inProgress: '#fd7e14',    // Orange
  done: '#32cd32',          // Green (lime)
  neutral: '#6c757d',       // Gray
  
  // UI colors
  primary: '#0d6efd',       // Blue
  text: '#212529',          // Dark gray
  textSecondary: '#495057', // Medium gray
  border: '#dee2e6',        // Light gray
  borderHover: '#adb5bd',  // Medium gray (for hover states)
  background: '#f8f9fa',    // Very light gray
  white: '#fff',
  
  // Special states
  overdue: '#dc3545',       // Red (same as notStarted)
  placeholder: '#6c757d',   // Gray
  success: '#28a745'        // Green (for success actions)
};

const statusColors: Record<string, string> = {
  'To Do': colors.notStarted,
  'In Progress': colors.inProgress, 
  'Done': colors.done,
  'Released': colors.done,
  'Ready': colors.neutral,
  'Ready for Release': colors.neutral,
  'Creating': colors.inProgress,
  'Validating': colors.inProgress,
  'UAT': colors.inProgress,
  'default': colors.neutral
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
  if (!team) return colors.neutral; // Default gray color for undefined/null teams
  if (teamColorMap[team]) return teamColorMap[team];
  let hash = 0;
  for (let i = 0; i < team.length; i++) {
    hash = team.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
}

function DemoCard({ card, onDelete, isMinimized, onToggleMinimize, iterationRange, isHighlighted, cardRef, highlightedChildKey, assigneeFilter }: {
  card: any; 
  onDelete: () => void; 
  isMinimized: boolean;
  onToggleMinimize: () => void;
  iterationRange?: string;
  isHighlighted?: boolean;
  cardRef?: (el: HTMLDivElement | null) => void;
  highlightedChildKey?: string | null;
  assigneeFilter?: string[];
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
  // Handle "Loading..." team - show as "Unknown Team" instead
  const team = (card.team && card.team !== 'Loading...') ? card.team : 'Unknown Team';
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
  
  // Determine border and shadow styles based on overdue and highlighted states
  const getBorderStyle = () => {
    if (isOverdue && isHighlighted) {
      // Both overdue and highlighted: double border effect - red outer, blue inner
      return {
        border: `3px solid ${colors.overdue}`,
        boxShadow: `
          0 0 0 3px rgba(220, 53, 69, 0.4),
          0 0 0 6px rgba(13, 110, 253, 0.5),
          0 0 0 9px rgba(220, 53, 69, 0.2),
          0 6px 16px rgba(220, 53, 69, 0.5),
          0 0 24px rgba(13, 110, 253, 0.4)
        `,
        padding: '3px',
      };
    } else if (isOverdue) {
      // Only overdue: red border
      return {
        border: `3px solid ${colors.overdue}`,
        boxShadow: `0 0 0 3px rgba(220, 53, 69, 0.3), 0 4px 12px rgba(220, 53, 69, 0.4)`,
        padding: '2px',
      };
    } else if (isHighlighted) {
      // Only highlighted: blue border
      return {
        border: `3px solid ${colors.primary}`,
        boxShadow: `0 0 0 3px rgba(13, 110, 253, 0.3), 0 4px 12px rgba(13, 110, 253, 0.4)`,
        padding: '2px',
      };
    }
    // Neither: no border
    return {
      border: 'none',
      boxShadow: 'none',
      padding: '0',
    };
  };

  const borderStyle = getBorderStyle();
  
  return (
    <Box 
      ref={cardRef}
      sx={{ 
        mb: 2,
        ...borderStyle,
        borderRadius: 1,
        position: 'relative',
        transition: 'all 0.3s ease-in-out'
      }}>
    <Card sx={{ 
        bgcolor: isPlaceholder ? colors.background : colors.white, 
        border: isPlaceholder 
          ? `2px dashed ${colors.placeholder}` 
          : `1px solid ${colors.border}`, 
      borderRadius: 1, 
      boxShadow: isPlaceholder ? 0 : 1, 
        mb: 0, 
      position: 'relative',
      opacity: isPlaceholder ? 0.8 : 1
    }}>
      <Box sx={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 0.5, zIndex: 1 }}>
        <Tooltip title={isMinimized ? "Expand card" : "Minimize card"}>
          <IconButton
            size="small"
            onClick={onToggleMinimize}
            sx={{ 
              color: colors.neutral, 
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
              color: colors.primary, 
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
              color: colors.notStarted, 
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
          <Typography variant="subtitle1" fontWeight={600} sx={{ color: isPlaceholder ? colors.placeholder : colors.primary, flex: 1, minWidth: 0 }}>
            {card.key ? (
              isPlaceholder ? (
                <span style={{ color: colors.placeholder, fontWeight: 600 }}>{card.key}</span>
              ) : (
                <a href={card.url} target="_blank" rel="noopener noreferrer" style={{ color: colors.primary, textDecoration: 'none', fontWeight: 600 }}>{card.key}</a>
              )
            ) : card.name}
          </Typography>
          {isPlaceholder && (
            <Chip 
              label="Placeholder" 
              size="small" 
              sx={{ 
                bgcolor: colors.placeholder, 
                color: colors.white, 
                fontWeight: 500, 
                borderRadius: 1,
                fontSize: '0.7rem'
              }} 
            />
          )}
        </Box>
        <Box mb={1}>
          {card.assignee ? (
            <Chip 
              label={card.assignee} 
              size="small" 
              sx={{ 
                bgcolor: colors.background, 
                color: colors.text, 
                fontWeight: 500, 
                borderRadius: 1,
                border: `1px solid ${colors.border}`,
                fontSize: '0.75rem'
              }} 
            />
          ) : (
            <Chip 
              label="Unassigned" 
              size="small" 
              sx={{ 
                bgcolor: colors.background, 
                color: colors.textSecondary, 
                fontWeight: 500, 
                borderRadius: 1,
                border: `1px solid ${colors.border}`,
                fontSize: '0.75rem',
                fontStyle: 'italic'
              }} 
            />
          )}
        </Box>
        {/* Summary - always visible at top level */}
        {card.summary && (
          <Typography variant="body2" sx={{ color: colors.text, fontSize: '0.95em', mb: 1, fontWeight: 500 }}>
            {card.summary}
          </Typography>
        )}
        <Box display="flex" alignItems="center" gap={1} mb={1} sx={{ flexWrap: 'wrap' }}>
          <Tooltip title={team} placement="top">
            <span style={{
              display: 'inline-block',
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: getColorForTeam(team),
              border: `1.5px solid ${colors.white}`,
              boxShadow: `0 0 0 1px ${colors.border}`,
              flexShrink: 0
            }} />
          </Tooltip>
          <Typography variant="caption" sx={{ color: colors.text, fontWeight: 500, flexShrink: 0 }}>{team}</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1} mb={1} sx={{ flexWrap: 'wrap' }}>
          <Chip 
            label={card.status} 
            size="small" 
            sx={{ 
              bgcolor: statusColors[card.status] || colors.background, 
              color: statusColors[card.status] ? colors.white : colors.text, 
              fontWeight: 500, 
              borderRadius: 1 
            }} 
          />
        </Box>
        
        {/* Progress bar - always visible */}
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Typography variant="body2" sx={{ fontSize: '0.75rem', color: colors.textSecondary, fontWeight: 500 }}>{doneCount}/{totalCount}</Typography>
          <span style={{ color: pct === 100 ? colors.done : pct > 0 ? colors.inProgress : colors.notStarted, fontSize: 18, verticalAlign: 'middle' }}>{pct === 100 ? '✔️' : pct > 0 ? '⏳' : '⚠️'}</span>
          <Typography variant="body2" fontWeight={600} sx={{ color: pct === 100 ? colors.done : pct > 0 ? colors.inProgress : colors.notStarted, fontSize: '0.875rem' }}>{pct}%</Typography>
        </Box>
        <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 1, background: colors.border, '& .MuiLinearProgress-bar': { background: pct === 100 ? colors.done : pct > 0 ? colors.inProgress : colors.notStarted } }} />
        
        {!isMinimized && (
          <>
            {filteredStories && filteredStories.length > 0 && (
              <Box mt={2}>
                <Typography variant="subtitle2" sx={{ color: colors.text, fontWeight: 600, mb: 1 }}>Child work items</Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  {filteredStories.map((story: any) => {
                    const storyAssignee = story.assignee?.displayName || story.assignee;
                    const isChildHighlighted = highlightedChildKey === story.key || 
                      (assigneeFilter && assigneeFilter.length > 0 && storyAssignee && assigneeFilter.includes(storyAssignee));
                    
                    return (
                      <li key={story.key} style={{ 
                        marginBottom: 8, 
                        background: isChildHighlighted ? 'rgba(13, 110, 253, 0.08)' : 'transparent', 
                        borderRadius: 4, 
                        padding: isChildHighlighted ? 8 : 4 
                      }}>
                        <Box>
                          <Box mb={0.5}>
                      <a 
                        href={'https://magmutual.atlassian.net/browse/' + story.key}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ 
                          fontWeight: 600, 
                                color: colors.primary, 
                          textDecoration: 'none'
                        }}
                      >
                        {story.key}
                      </a>
                          </Box>
                          <Box mb={1}>
                            {storyAssignee ? (
                              <Chip 
                                label={storyAssignee} 
                                size="small" 
                                sx={{ 
                                  bgcolor: colors.background, 
                                  color: colors.text, 
                                  fontWeight: 500, 
                                  borderRadius: 1,
                                  border: `1px solid ${colors.border}`,
                                  fontSize: '0.75rem'
                                }} 
                              />
                            ) : (
                              <Chip 
                                label="Unassigned" 
                                size="small" 
                                sx={{ 
                                  bgcolor: colors.background, 
                                  color: colors.textSecondary, 
                                  fontWeight: 500, 
                                  borderRadius: 1,
                                  border: `1px solid ${colors.border}`,
                                  fontSize: '0.75rem',
                                  fontStyle: 'italic'
                                }} 
                              />
                            )}
                          </Box>
                          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                            <span style={{ color: colors.textSecondary, marginRight: 8 }}>{story.summary}</span>
                      <Tooltip title={story.team} placement="top">
                        <span style={{
                          display: 'inline-block',
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          background: getColorForTeam(story.team),
                                border: `1px solid ${colors.white}`,
                                boxShadow: `0 0 0 1px ${colors.border}`,
                          marginRight: 4
                        }} />
                      </Tooltip>
                      <Chip 
                        label={story.status} 
                        size="small" 
                              sx={{ 
                                bgcolor: statusColors[story.status] || colors.background, 
                                color: statusColors[story.status] ? colors.white : colors.text, 
                                fontWeight: 500, 
                                borderRadius: 1
                              }} 
                        onClick={() => console.log(`Story ${story.key} status:`, story.status, 'statusCategory:', story.statusCategory)}
                      />
                          </Box>
                        </Box>
                    </li>
                    );
                  })}
                </Box>
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
    </Box>
  );
}

export default function DemoPage() {
  const { selectedDataSource, setSelectedDataSource, teamFilter, setTeamFilter, assigneeFilter, setAssigneeFilter } = useAppState();
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
  const [hasInitializedMinimized, setHasInitializedMinimized] = useState(false);
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
  // New: date pickers state + validation for iteration range
  const [editingIterationStart, setEditingIterationStart] = useState<string>('');
  const [editingIterationEnd, setEditingIterationEnd] = useState<string>('');
  const [editingRangeError, setEditingRangeError] = useState<string>('');
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
  
  // Global search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ card: any; iterationKey: string; cardId: string; source: 'card' | 'child'; childKey?: string; childSummary?: string }>>([]);
  const [highlightedCardId, setHighlightedCardId] = useState<string | null>(null);
  const [highlightedChildKey, setHighlightedChildKey] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  

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

  const allAssignees = React.useMemo(() => {
    const assignees = new Set<string>();
    Object.values(columns).forEach(cards => {
      cards.forEach(card => {
        if (card.assignee) assignees.add(card.assignee);
        if (Array.isArray(card.stories)) {
          card.stories.forEach((story: any) => {
            const assignee = story.assignee?.displayName || story.assignee;
            if (assignee) assignees.add(assignee);
          });
        }
      });
    });
    return Array.from(assignees).sort();
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

  function cardMatchesAssigneeFilter(card: any) {
    if (assigneeFilter.length === 0) return true;
    if (card.assignee && assigneeFilter.includes(card.assignee)) return true;
    if (Array.isArray(card.stories)) {
      return card.stories.some((story: any) => {
        const assignee = story.assignee?.displayName || story.assignee;
        return assignee && assigneeFilter.includes(assignee);
      });
    }
    return false;
  }

  // Combined filter function
  function cardMatchesFilters(card: any) {
    return cardMatchesTeamFilter(card) && cardMatchesAssigneeFilter(card);
  }

  // Global search function
  // Debounce search query to improve performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 200); // 200ms debounce delay
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Pre-compute searchable data for better performance
  const searchableData = useMemo(() => {
    const data: Array<{
      card: any;
      iterationKey: string;
      cardId: string;
      searchableKey: string;
      searchableSummary: string;
      searchableAssignee: string;
      children: Array<{
        key: string;
        summary: string;
        team: string;
        assignee: string;
      }>;
    }> = [];
    
    Object.entries(columns).forEach(([iterationKey, cards]) => {
      cards.forEach((card) => {
        const cardId = `${iterationKey}-${card.key}`;
        const children = (Array.isArray(card.stories) ? card.stories : []).map((story: any) => ({
          key: (story.key || '').toLowerCase(),
          summary: (story.summary || '').toLowerCase(),
          team: (story.team || '').toLowerCase(),
          assignee: ((story.assignee?.displayName || story.assignee) || '').toLowerCase(),
        }));
        
        data.push({
          card,
          iterationKey,
          cardId,
          searchableKey: (card.key || '').toLowerCase(),
          searchableSummary: (card.summary || '').toLowerCase(),
          searchableAssignee: (card.assignee || '').toLowerCase(),
          children,
        });
      });
    });
    
    return data;
  }, [columns]);

  const performSearch = useMemo(() => {
    const query = debouncedSearchQuery.toLowerCase().trim();
    
    // Early exit for empty or very short queries
    if (!query || query.length < 2) {
      return [];
    }
    
    const results: Array<{ card: any; iterationKey: string; cardId: string; source: 'card' | 'child'; childKey?: string; childSummary?: string }> = [];
    const MAX_RESULTS = 50; // Limit results for performance
    
    // Use pre-computed searchable data
    for (const item of searchableData) {
      if (results.length >= MAX_RESULTS) break;
      
      // Fast string matching using indexOf (faster than includes)
      if (
        item.searchableKey.indexOf(query) !== -1 ||
        item.searchableSummary.indexOf(query) !== -1 ||
        item.searchableAssignee.indexOf(query) !== -1
      ) {
        results.push({ 
          card: item.card, 
          iterationKey: item.iterationKey, 
          cardId: item.cardId, 
          source: 'card' 
        });
      }

      // Search child work items
      if (item.children.length > 0) {
        for (const child of item.children) {
          if (results.length >= MAX_RESULTS) break;
          
          if (
            child.key.indexOf(query) !== -1 ||
            child.summary.indexOf(query) !== -1 ||
            child.team.indexOf(query) !== -1 ||
            child.assignee.indexOf(query) !== -1
          ) {
            results.push({
              card: item.card,
              iterationKey: item.iterationKey,
              cardId: item.cardId,
              source: 'child',
              childKey: item.card.stories.find((s: any) => s.key?.toLowerCase() === child.key)?.key,
              childSummary: item.card.stories.find((s: any) => s.key?.toLowerCase() === child.key)?.summary,
            });
          }
        }
      }
    }
    
    return results;
  }, [debouncedSearchQuery, searchableData]);

  // Update search results when search query or columns change
  useEffect(() => {
    setSearchResults(performSearch);
  }, [performSearch]);

  // Keyboard shortcut for search (Ctrl/Cmd+K)
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+K (Windows/Linux) or Cmd+K (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // Escape to clear search
      if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('');
        setSearchResults([]);
        searchInputRef.current?.blur();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        // Don't close if clicking on search results
        if (searchResults.length > 0 && (event.target as HTMLElement).closest('[role="listbox"]')) {
          return;
        }
        // Only clear if not actively searching
        if (!searchInputRef.current?.matches(':focus')) {
          setSearchResults([]);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchResults]);

  // Handle navigation to a card
  const navigateToCard = (cardId: string, childKey?: string) => {
    setSearchQuery('');
    setSearchResults([]);
    
    // Small delay to ensure DOM is ready
    setTimeout(() => {
      // Scroll to the card
      const cardElement = cardRefs.current[cardId];
      if (cardElement) {
        // Highlight the card temporarily
        setHighlightedCardId(cardId);
        setTimeout(() => setHighlightedCardId(null), 3000);
        if (childKey) {
          setHighlightedChildKey(childKey);
          setTimeout(() => setHighlightedChildKey(null), 3000);
        }
        
        // Scroll into view with smooth behavior
        cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

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
        setAssigneeFilter([]); // Reset assignee filter when data source changes
        
        // Initialize all cards as minimized
        const allCardIds = new Set<string>();
        Object.entries(initializedColumns).forEach(([iterKey, cards]) => {
          cards.forEach((card) => {
            if (card.key) {
              allCardIds.add(`${iterKey}-${card.key}`);
            }
          });
        });
        setMinimizedCards(allCardIds);
        setHasInitializedMinimized(true);
        
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
      setHasInitializedMinimized(false); // Reset flag when data source changes
      loadDataSourceData(selectedDataSource);
    }
  }, [selectedDataSource]);
  
  // Initialize all cards as minimized when columns change (after initial load)
  useEffect(() => {
    if (!hasInitializedMinimized && Object.keys(columns).length > 0) {
      const allCardIds = new Set<string>();
      Object.entries(columns).forEach(([iterKey, cards]) => {
        cards.forEach((card) => {
          if (card.key) {
            allCardIds.add(`${iterKey}-${card.key}`);
          }
        });
      });
      if (allCardIds.size > 0) {
        setMinimizedCards(allCardIds);
        setHasInitializedMinimized(true);
      }
    }
  }, [columns, hasInitializedMinimized]);

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
    
    // Add new card to minimized set so it starts minimized
    const newCardId = `${colKey}-${cardName}`;
    setMinimizedCards(prev => new Set(prev).add(newCardId));
    
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
      let fileName = selectedDataSource || 'board-savePDD.json';
      // Ensure it ends with .json
      if (!fileName.endsWith('.json')) {
        fileName = fileName + '.json';
      }
      
      console.log(`Saving added card data to public directory: ${fileName}`);
      await saveBoardDataToPublic(boardData, fileName);
      console.log('Board data saved successfully after adding card');
      
      // Log the action
      if (selectedDataSource) {
        await logBoardAction(selectedDataSource, 'add_card', {
          cardKey: cardName,
          cardSummary: placeholderCard.summary,
          iterationKey: colKey,
          iterationLabel: iterations.find(iter => iter.key === colKey)?.label || colKey
        });
      }
      
      // Don't reload data after adding card - it causes issues with renamed iterations
      // The state is already updated, so we're good
      console.log('Card added successfully');
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
      // Determine the file name based on the current data source
      let fileName = selectedDataSource || 'board-savePDD.json';
      // Ensure it ends with .json
      if (!fileName.endsWith('.json')) {
        fileName = fileName + '.json';
      }
      
      console.log(`Saving moved card data to public directory: ${fileName}`);
      await saveBoardDataToPublic(boardData, fileName);
      console.log('Board data saved successfully after moving card');
      
      // Log the action
      if (selectedDataSource) {
        const fromIteration = iterations.find(iter => iter.key === sourceColumnKey);
        const toIteration = iterations.find(iter => iter.key === selectedTargetColumn);
        await logBoardAction(selectedDataSource, 'move_card', {
          cardKey: card.key,
          cardSummary: card.summary,
          fromIteration: sourceColumnKey,
          fromIterationLabel: fromIteration?.label || sourceColumnKey,
          toIteration: selectedTargetColumn,
          toIterationLabel: toIteration?.label || selectedTargetColumn
        });
      }
      
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
    
    // Get card data for logging before deleting
    const card = columns[colKey][cardIndex];
    
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
      // Determine the file name based on the current data source
      let fileName = selectedDataSource || 'board-savePDD.json';
      // Ensure it ends with .json
      if (!fileName.endsWith('.json')) {
        fileName = fileName + '.json';
      }
      
      console.log(`Saving deleted card data to public directory: ${fileName}`);
      await saveBoardDataToPublic(boardData, fileName);
      console.log('Board data saved successfully after deleting card');
      
      // Log the action
      if (selectedDataSource) {
        const iteration = iterations.find(iter => iter.key === colKey);
        await logBoardAction(selectedDataSource, 'delete_card', {
          cardKey: cardKey,
          cardSummary: card?.summary,
          iterationKey: colKey,
          iterationLabel: iteration?.label || colKey
        });
      }
      
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
      
      // Create a map to track updated cards by their ID (iterationKey-cardKey)
      const updatedCardsMap = new Map<string, any>();
      
      for (const card of allCards) {
        if (card.key) {
          try {
            // Find which iteration this card belongs to
            let cardIterationKey = '';
            for (const [iterKey, iterCards] of Object.entries(columns)) {
              if (iterCards.some(c => c.key === card.key)) {
                cardIterationKey = iterKey;
                break;
              }
            }
            
            const cardId = `${cardIterationKey}-${card.key}`;
            console.log(`Refreshing card: ${card.key} in iteration ${cardIterationKey}`);
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
              continue; // Skip this card if the API call failed
            }
            
            // Check if we got a valid response with fields
            if (!freshCardData || !freshCardData.fields) {
              console.error(`No valid data received for ${card.key}. Response:`, freshCardData);
              if (card.isPlaceholder) {
                console.log(`Keeping ${card.key} as placeholder - no valid response received`);
              }
              continue; // Skip this card if we didn't get valid data
            }
            
            // Create a new card object with updated data (don't mutate the original)
            if (freshCardData && freshCardData.fields) {
              const fields = freshCardData.fields;
              
              // Check if we got meaningful data (not just empty/error responses)
              const hasValidStatus = fields.status && fields.status.name && fields.status.name !== 'Loading...';
              const hasValidSummary = fields.summary && fields.summary !== `Loading data for ${card.key}...`;
              const hasValidTeam = (fields.customfield_10014 && fields.customfield_10014 !== 'Loading...') || 
                                   (fields.customfield_10001 && fields.customfield_10001.name && fields.customfield_10001.name !== 'Loading...');
              
              // Create updated card object
              const updatedCard = { ...card };
              
              // Only convert placeholder card to real card if we got meaningful data
              if (updatedCard.isPlaceholder && (hasValidStatus || hasValidSummary || hasValidTeam)) {
                console.log(`Converting placeholder card ${card.key} to real card with valid data`);
                updatedCard.isPlaceholder = false;
              } else if (updatedCard.isPlaceholder) {
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
                updatedCard.status = newStatus;
                updatedCard.statusCategory = newStatusCategory;
              } else {
                console.log(`No status found in fresh data for ${card.key}`);
              }
              
              // Update card summary
              if (fields.summary) {
                updatedCard.summary = fields.summary;
                console.log(`Updated summary for ${card.key}: ${updatedCard.summary}`);
              }
              
              // Update assignee
              if (fields.assignee && fields.assignee.displayName) {
                updatedCard.assignee = fields.assignee.displayName;
              } else {
                updatedCard.assignee = null;
              }
              
              // Update team if available (check both possible team fields)
              if (fields.customfield_10014) {
                updatedCard.team = fields.customfield_10014;
                console.log(`Updated team for ${card.key}: ${updatedCard.team} (from customfield_10014)`);
              } else if (fields.customfield_10001 && fields.customfield_10001.name) {
                updatedCard.team = fields.customfield_10001.name;
                console.log(`Updated team for ${card.key}: ${updatedCard.team} (from customfield_10001)`);
              } else {
                // If no team field is available, set to "Unknown Team" instead of keeping "Loading..."
                if (updatedCard.team === 'Loading...' || !updatedCard.team) {
                  updatedCard.team = 'Unknown Team';
                  console.log(`No team field found for ${card.key}, setting to "Unknown Team"`);
                }
              }
              
              // Update due date if available (check standard dueDate field and common custom fields)
              // Try multiple possible field names/IDs
              console.log(`Checking due date fields for ${card.key}:`, Object.keys(fields).filter(k => k.toLowerCase().includes('due')));
              
              if (fields.duedate) {
                updatedCard.dueDate = fields.duedate;
                console.log(`Found due date (duedate) for ${card.key}: ${updatedCard.dueDate}`);
              } else if (fields.dueDate) {
                updatedCard.dueDate = fields.dueDate;
                console.log(`Found due date (dueDate) for ${card.key}: ${updatedCard.dueDate}`);
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
                  updatedCard.dueDate = typeof dateValue === 'string' ? dateValue : (dateValue?.toString() || dateValue);
                  console.log(`Found due date field: ${dueDateField} = ${updatedCard.dueDate} for ${card.key}`);
                } else {
                  // Check common custom field IDs for date-like values
                  for (let i = 10000; i <= 10100; i++) {
                    const fieldKey = `customfield_${i}`;
                    const fieldValue = fields[fieldKey];
                    if (fieldValue) {
                      const valueStr = typeof fieldValue === 'string' ? fieldValue : (fieldValue?.toString() || '');
                      if (valueStr.match(/\d{4}-\d{2}-\d{2}/)) {
                        updatedCard.dueDate = valueStr;
                        console.log(`Found due date in custom field: ${fieldKey} = ${updatedCard.dueDate} for ${card.key}`);
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
              updatedCard.relationships = relationships;
              
              // Fetch and update child work items (stories)
              try {
                console.log(`Fetching child issues for ${card.key}`);
                
                const childIssuesData = await fetchChildIssues(card.key);
                console.log(`Child issues response for ${card.key}:`, childIssuesData);
                
                if (childIssuesData && childIssuesData.issues && Array.isArray(childIssuesData.issues)) {
                  // Filter out the parent card itself from the child issues
                  const actualChildIssues = childIssuesData.issues.filter((issue: any) => issue.key !== card.key);
                  console.log(`Found ${childIssuesData.issues.length} child issues for ${card.key}, ${actualChildIssues.length} after filtering out parent:`, actualChildIssues);
                  
                  const updatedStories = actualChildIssues.map((childIssue: any) => {
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
                    
                    // Extract assignee
                    const newAssignee = childIssue.fields.assignee?.displayName || childIssue.fields.assignee || null;
                    
                    console.log(`Processing child issue ${childIssue.key}:`, {
                      summary: newSummary,
                      status: newStatus,
                      team: newTeam,
                      assignee: newAssignee,
                      relationships
                    });
                    
                    return {
                      key: childIssue.key,
                      summary: newSummary,
                      status: newStatus,
                      statusCategory: newStatusCategory,
                      team: newTeam,
                      assignee: newAssignee,
                      relationships
                    };
                  });
                  
                  updatedCard.stories = updatedStories;
                  console.log(`Updated ${updatedStories.length} child work items for ${card.key}:`, updatedStories);
                } else {
                  console.log(`No child issues found for ${card.key}`);
                  updatedCard.stories = [];
                }
              } catch (error) {
                console.error(`Error fetching child issues for ${card.key}:`, error);
                // Keep existing stories if fetch fails
                updatedCard.stories = card.stories || [];
              }
              
              // Store the updated card in the map
              updatedCardsMap.set(cardId, updatedCard);
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
      
      // Create updated columns object with the updated cards
      console.log('Creating updated columns object');
      const updatedColumns: Record<string, any[]> = {};
      Object.keys(columns).forEach(colKey => {
        updatedColumns[colKey] = columns[colKey].map(card => {
          const cardId = `${colKey}-${card.key}`;
          // Use updated card if available, otherwise keep original
          return updatedCardsMap.has(cardId) ? updatedCardsMap.get(cardId)! : card;
        });
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
        let fileName = selectedDataSource || 'board-savePDD.json';
        // Ensure it ends with .json
        if (!fileName.endsWith('.json')) {
          fileName = fileName + '.json';
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
      <Box sx={{ background: colors.background, minHeight: '100vh', p: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress sx={{ color: colors.primary, mb: 2 }} size={40} />
          <Typography variant="body1" sx={{ color: colors.text, fontWeight: 600 }}>
            Loading saved board state...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ background: colors.background, minHeight: '100vh', p: 4 }}>
      {/* Global Search */}
      <Box ref={searchContainerRef} sx={{ mb: 3, position: 'relative' }}>
        <TextField
          inputRef={searchInputRef}
          fullWidth
          size="medium"
          placeholder="Search by key, summary, or assignee... (Ctrl/Cmd+K)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: colors.textSecondary }} />
              </InputAdornment>
            ),
          }}
          sx={{
            backgroundColor: colors.white,
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: colors.border,
              },
              '&:hover fieldset': {
                borderColor: colors.borderHover,
              },
              '&.Mui-focused fieldset': {
                borderColor: colors.primary,
              },
            },
          }}
        />
        {searchResults.length > 0 && (
          <Paper
            sx={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              mt: 1,
              maxHeight: 400,
              overflow: 'auto',
              zIndex: 1000,
              boxShadow: 3,
              border: `1px solid ${colors.border}`,
            }}
          >
            <List dense>
              {searchResults.map((result) => {
                const iteration = iterations.find(iter => iter.key === result.iterationKey);
                return (
                  <ListItem key={`${result.cardId}-${result.childKey || 'parent'}`} disablePadding>
                    <ListItemButton
                      onClick={() => navigateToCard(result.cardId, result.childKey)}
                      sx={{
                        '&:hover': {
                          backgroundColor: colors.background,
                        },
                      }}
                    >
                      <MuiListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight={600} sx={{ color: colors.primary }}>
                              {result.source === 'child' ? result.childKey : result.card.key}
                            </Typography>
                            <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                              {iteration?.label || result.iterationKey}
                            </Typography>
                            {result.source === 'child' && (
                              <Chip label="Child" size="small" sx={{ bgcolor: colors.background, border: `1px solid ${colors.border}`, height: 20 }} />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            {result.source === 'child' ? (
                              <>
                                <Typography variant="body2" sx={{ color: colors.text, mt: 0.5 }}>
                                  {result.childSummary || 'No summary'}
                                </Typography>
                                <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                                  Parent: {result.card.key} — {result.card.summary}
                                </Typography>
                              </>
                            ) : (
                              <Typography variant="body2" sx={{ color: colors.text, mt: 0.5 }}>
                                {result.card.summary || 'No summary'}
                              </Typography>
                            )}
                            {result.card.assignee && (
                              <Typography variant="caption" sx={{ color: colors.textSecondary }}>
                                Assigned to: {result.card.assignee}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Paper>
        )}
      </Box>
      
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
                  color: colors.text,
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
                color: colors.text, 
                cursor: 'pointer',
                '&:hover': { 
                  textDecoration: 'underline',
                  textDecorationColor: colors.primary
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
              color: colors.primary,
              borderColor: colors.primary,
              fontWeight: 500,
              borderRadius: 1,
              '&:hover': {
                backgroundColor: colors.primary,
                color: colors.white,
                borderColor: colors.primary
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
              color: colors.neutral,
              borderColor: colors.neutral,
              fontWeight: 500,
              borderRadius: 1,
              '&:hover': {
                backgroundColor: colors.neutral,
                color: colors.white,
                borderColor: colors.neutral
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
                color: colors.textSecondary, 
                fontWeight: 500,
                '&.Mui-focused': {
                  color: colors.primary,
                },
                '&.MuiInputLabel-shrink': {
                  color: colors.primary,
                }
              }}
            >
              Data Source
            </InputLabel>
            <Select
              labelId="data-source-label"
              value={selectedDataSource || ''}
              label="Data Source"
              onChange={(e) => {
                const newValue = e.target.value;
                if (newValue && availableBoards[newValue]) {
                  setSelectedDataSource(newValue);
                }
              }}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 300,
                    zIndex: 9999,
                  },
                },
                anchorOrigin: {
                  vertical: 'bottom',
                  horizontal: 'left',
                },
                transformOrigin: {
                  vertical: 'top',
                  horizontal: 'left',
                },
                disableScrollLock: false,
                disablePortal: false,
              }}
              sx={{
                backgroundColor: colors.white,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: colors.border,
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: colors.borderHover,
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: colors.primary,
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: colors.primary,
                },
              }}
              displayEmpty
            >
              {Object.keys(availableBoards).length === 0 ? (
                <MenuItem value="" disabled>Loading boards...</MenuItem>
              ) : (
                Object.entries(availableBoards).map(([key]) => (
                <MenuItem key={key} value={key}>
                  {key.replace('board-save', '').replace(/([A-Z])/g, ' $1').trim()}
                </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </Box>





        {/* Team Filter */}
        <Box sx={{ minWidth: 300 }}>
          <FormControl fullWidth size="small">
            <InputLabel 
              id="team-filter-label" 
              sx={{ 
                color: colors.textSecondary, 
                fontWeight: 500,
                '&.Mui-focused': {
                  color: colors.primary,
                },
                '&.MuiInputLabel-shrink': {
                  color: colors.primary,
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
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 300,
                    zIndex: 9999,
                  },
                },
                anchorOrigin: {
                  vertical: 'bottom',
                  horizontal: 'left',
                },
                transformOrigin: {
                  vertical: 'top',
                  horizontal: 'left',
                },
                disableScrollLock: false,
                disablePortal: false,
              }}
              sx={{
                backgroundColor: colors.white,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: colors.border,
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: colors.borderHover,
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: colors.primary,
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: colors.primary,
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

        {/* Assignee Filter */}
        <Box sx={{ minWidth: 300 }}>
          <FormControl fullWidth size="small">
            <InputLabel 
              id="assignee-filter-label" 
              sx={{ 
                color: colors.textSecondary, 
                fontWeight: 500,
                '&.Mui-focused': {
                  color: colors.primary,
                },
                '&.MuiInputLabel-shrink': {
                  color: colors.primary,
                }
              }}
            >
              Filter by Assignee
            </InputLabel>
            <Select
              labelId="assignee-filter-label"
              multiple
              value={assigneeFilter}
              onChange={e => setAssigneeFilter(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              input={<OutlinedInput label="Filter by Assignee" />}
              renderValue={(selected) => selected.length === 0 ? 'All Assignees' : selected.join(', ')}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 300,
                    zIndex: 9999,
                  },
                },
                anchorOrigin: {
                  vertical: 'bottom',
                  horizontal: 'left',
                },
                transformOrigin: {
                  vertical: 'top',
                  horizontal: 'left',
                },
                disableScrollLock: false,
                disablePortal: false,
              }}
              sx={{
                backgroundColor: colors.white,
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: colors.border,
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: colors.borderHover,
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: colors.primary,
                },
                '& .MuiInputLabel-root.Mui-focused': {
                  color: colors.primary,
                },
              }}
            >
              {allAssignees.map(assignee => (
                <MenuItem key={assignee} value={assignee}>
                  <Checkbox checked={assigneeFilter.indexOf(assignee) > -1} />
                  <ListItemText primary={assignee} />
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
              backgroundColor: colors.primary,
              color: colors.white,
              fontWeight: 600,
              '&:hover': {
                backgroundColor: colors.primary,
              },
              '&:disabled': {
                backgroundColor: colors.neutral,
                color: colors.white,
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
              borderColor: colors.neutral,
              color: colors.neutral,
              fontWeight: 600,
              '&:hover': {
                borderColor: colors.neutral,
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
              borderColor: colors.success,
              color: colors.success,
              fontWeight: 600,
              '&:hover': {
                borderColor: colors.success,
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
      <Box sx={{ mb: 4, maxWidth: 600, bgcolor: colors.white, border: `1px solid ${colors.border}`, borderRadius: 1, boxShadow: 1, p: 3 }}>
        {(() => {
          // Gather all child stories across all iterations, filtered by team if filter is applied
          const allStories = Object.values(columns).flat().flatMap(card => {
            if (!card.stories) return [];
            // Only include stories from cards that match the filters
            if (cardMatchesFilters(card)) {
              return card.stories;
            }
            return [];
          });
          const total = allStories.length;
          const done = allStories.filter((s: any) => getStatusCategory(s.status) === 'done').length;
          const inProgress = allStories.filter((s: any) => getStatusCategory(s.status) === 'indeterminate').length;
          const notStarted = allStories.filter((s: any) => getStatusCategory(s.status) === 'new').length;
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          let barColor = colors.border;
          if (pct === 100 && total > 0) barColor = colors.done;
          else if (pct > 0) barColor = colors.inProgress;
          else if (total > 0) barColor = colors.notStarted;
          let statusMsg = 'On Track';
          if (pct < 50) statusMsg = 'Behind';
          else if (pct < 80) statusMsg = 'At Risk';
          return (
            <>
              <Typography variant="h6" fontWeight={700} sx={{ color: colors.text, mb: 2 }}>PI Status Summary</Typography>
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Box flex={1}>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    sx={{ height: 12, borderRadius: 1, background: colors.border, '& .MuiLinearProgress-bar': { background: barColor } }}
                  />
                </Box>
                <Typography variant="h6" fontWeight={700} sx={{ color: barColor, minWidth: 72, textAlign: 'right' }}>{pct}% Done</Typography>
              </Box>
              <Box display="flex" gap={4} mb={2}>
                <Typography variant="body1" sx={{ color: colors.text }}>Total: <b>{total}</b></Typography>
                <Typography variant="body1" sx={{ color: colors.done }}>Done: <b>{done}</b></Typography>
                <Typography variant="body1" sx={{ color: colors.inProgress }}>In Progress: <b>{inProgress}</b></Typography>
                <Typography variant="body1" sx={{ color: colors.neutral }}>Not Started: <b>{notStarted}</b></Typography>
              </Box>
              <Typography variant="subtitle1" fontWeight={600} sx={{ color: barColor }}>{statusMsg}</Typography>
            </>
          );
        })()}
      </Box>
      {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}
      <Box sx={{ display: 'flex', gap: 3, overflowX: 'auto', minWidth: 1200 }}>
        {iterations.map(iter => (
          <Box key={iter.key} data-iteration-key={iter.key} sx={{ minWidth: 320, background: colors.white, border: `1px solid ${colors.border}`, borderRadius: 1, p: 2, display: 'flex', flexDirection: 'column', minHeight: 600 }}>
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
                  {/* Date range pickers with validation */}
                  <Box display="flex" gap={1} sx={{ mb: 1 }}>
                  <TextField
                      label="Start Date"
                      type="date"
                    fullWidth
                    size="small"
                      value={editingIterationStart}
                      onChange={(e) => {
                        setEditingIterationStart(e.target.value);
                        // clear error and validate
                        setEditingRangeError('');
                        if (editingIterationEnd && e.target.value && new Date(e.target.value) > new Date(editingIterationEnd)) {
                          setEditingRangeError('Start date must be on or before end date');
                        }
                      }}
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      label="End Date"
                      type="date"
                      fullWidth
                      size="small"
                      value={editingIterationEnd}
                      onChange={(e) => {
                        setEditingIterationEnd(e.target.value);
                        setEditingRangeError('');
                        if (editingIterationStart && e.target.value && new Date(e.target.value) < new Date(editingIterationStart)) {
                          setEditingRangeError('End date must be on or after start date');
                        }
                      }}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Box>
                  {editingRangeError && (
                    <Typography variant="caption" color="error" sx={{ mb: 1, display: 'block' }}>{editingRangeError}</Typography>
                  )}
                  <Box display="flex" gap={1}>
                    <IconButton
                      size="small"
                      onClick={async () => {
                        // Compose range string from valid dates; fallback to existing range if needed
                        let newRange = editingIterationRange;
                        if (!editingRangeError && editingIterationStart && editingIterationEnd) {
                          // Parse dates as local dates (not UTC) to avoid timezone issues
                          const parseLocalDate = (dateStr: string) => {
                            const [year, month, day] = dateStr.split('-').map(Number);
                            return new Date(year, month - 1, day); // month is 0-indexed
                          };
                          const start = parseLocalDate(editingIterationStart);
                          const end = parseLocalDate(editingIterationEnd);
                          if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
                            setEditingRangeError('Please enter a valid date range');
                            return;
                          }
                          const fmt = (d: Date) => d.toLocaleString(undefined, { month: 'long', day: 'numeric' });
                          newRange = `${fmt(start)} - ${fmt(end)}`;
                        }
                        // Get old values for logging
                        const oldIteration = iterations.find(i => i.key === iter.key);
                        const oldTitle = oldIteration?.label || '';
                        const oldRange = oldIteration?.range || '';
                        
                        const updated = iterations.map(i => 
                          i.key === iter.key 
                            ? { ...i, label: editingIterationTitle, range: newRange }
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
                        
                        // Determine the file name based on the current data source
                        let fileName = selectedDataSource || 'board-savePDD.json';
                        // Ensure it ends with .json
                        if (!fileName.endsWith('.json')) {
                          fileName = fileName + '.json';
                        }
                        
                        await saveBoardDataToPublic(boardData, fileName);
                        
                        // Log iteration changes
                        if (selectedDataSource) {
                          // Log rename if title changed
                          if (oldTitle !== editingIterationTitle) {
                            await logBoardAction(selectedDataSource, 'rename_iteration', {
                              iterationKey: iter.key,
                              oldValue: oldTitle,
                              newValue: editingIterationTitle
                            });
                          }
                          
                          // Log date change if range changed
                          if (oldRange !== newRange) {
                            await logBoardAction(selectedDataSource, 'change_iteration_date', {
                              iterationKey: iter.key,
                              iterationLabel: editingIterationTitle,
                              oldValue: oldRange,
                              newValue: newRange
                            });
                          }
                        }
                      }}
                      sx={{ color: colors.done }}
                    >
                      <Save />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditingIteration(null);
                      }}
                      sx={{ color: colors.notStarted }}
                    >
                      <Cancel />
                    </IconButton>
                  </Box>
                </Box>
              ) : (
                <Box>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box flex={1}>
                      <Typography variant="h6" fontWeight={600} sx={{ color: colors.text }}>{iter.label}</Typography>
                      <Typography variant="caption" sx={{ color: colors.neutral }}>{iter.range}</Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setEditingIteration(iter.key);
                        setEditingIterationTitle(iter.label);
                        setEditingIterationRange(iter.range);
                        // Initialize date pickers by parsing existing range
                        try {
                          const parts = (iter.range || '').split('-').map(s => s.trim());
                          if (parts.length >= 2) {
                            const currentYear = new Date().getFullYear();
                            // Parse dates as local dates to avoid timezone issues
                            const parseDateString = (dateStr: string) => {
                              // Try to parse formats like "October 20" or "Oct 20"
                              const date = new Date(`${dateStr} ${currentYear}`);
                              if (!isNaN(date.getTime())) {
                                // Format as YYYY-MM-DD for the date input (local date, not UTC)
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const day = String(date.getDate()).padStart(2, '0');
                                return `${year}-${month}-${day}`;
                              }
                              return null;
                            };
                            const startStr = parseDateString(parts[0]);
                            const endStr = parseDateString(parts[parts.length - 1]);
                            if (startStr) setEditingIterationStart(startStr);
                            if (endStr) setEditingIterationEnd(endStr);
                            if (!startStr || !endStr) {
                              setEditingIterationStart('');
                              setEditingIterationEnd('');
                            }
                          } else {
                            setEditingIterationStart('');
                            setEditingIterationEnd('');
                          }
                        } catch {
                          setEditingIterationStart('');
                          setEditingIterationEnd('');
                        }
                        setEditingRangeError('');
                      }}
                      sx={{ color: colors.neutral }}
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
              const filteredCards = cards.filter(cardMatchesFilters);
              const allStories = filteredCards.flatMap(card => card.stories || []);
              const total = allStories.length;
              const done = allStories.filter((s: any) => getStatusCategory(s.status) === 'done').length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              let barColor = colors.border;
              if (pct === 100 && total > 0) barColor = colors.done;
              else if (pct > 0) barColor = colors.inProgress;
              else if (total > 0) barColor = colors.notStarted;
              return (
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Box flex={1}>
                    <LinearProgress
                      variant="determinate"
                      value={pct}
                      sx={{ height: 8, borderRadius: 1, background: colors.border, '& .MuiLinearProgress-bar': { background: barColor } }}
                    />
                  </Box>
                  <Typography variant="body2" fontWeight={600} sx={{ color: barColor, minWidth: 56, textAlign: 'right' }}>{pct}% Done</Typography>
                </Box>
              );
            })()}
            <Box flex={1} mb={2}>
              {columns[iter.key].filter(cardMatchesFilters).map((card, idx) => {
                const cardId = `${iter.key}-${card.key}`;
                const isMinimized = minimizedCards.has(cardId);
                const isHighlighted = highlightedCardId === cardId;
                return (
                  <DemoCard 
                    key={card.key || idx} 
                    card={card} 
                    onDelete={() => handleDeleteCard(iter.key, card.key)}
                    isMinimized={isMinimized}
                    onToggleMinimize={() => handleToggleMinimize(iter.key, card.key)}
                    iterationRange={iter.range}
                    isHighlighted={isHighlighted}
                    cardRef={(el) => {
                      cardRefs.current[cardId] = el;
                    }}
                    highlightedChildKey={highlightedChildKey}
                    assigneeFilter={assigneeFilter}
                  />
                );
              })}
              {/* Quick Add Button - positioned directly under the last card */}
              <Box mt={2} mb={2}>
                <Button
                  variant="outlined"
                  color="primary"
                  fullWidth
                  onClick={() => {
                    // Find and focus the input field for this specific iteration
                    setTimeout(() => {
                      // Find the input that's in the same iteration column
                      const iterationBox = document.querySelector(`[data-iteration-key="${iter.key}"]`);
                      if (iterationBox) {
                        const input = iterationBox.querySelector(`input[placeholder="Add card (Jira key)..."]`) as HTMLInputElement;
                        if (input) {
                          input.focus();
                          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }
                    }, 100);
                  }}
                  sx={{ 
                    fontWeight: 600, 
                    borderRadius: 1,
                    borderColor: colors.primary,
                    color: colors.primary,
                    '&:hover': {
                      borderColor: colors.primary,
                      backgroundColor: `${colors.primary}15`
                    }
                  }}
                >
                  + Add Card
                </Button>
            </Box>
            </Box>
            <Box pt={2}>
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
                sx={{ mb: 1, background: colors.white, borderRadius: 1 }}
                inputProps={{ style: { color: colors.text } }}
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