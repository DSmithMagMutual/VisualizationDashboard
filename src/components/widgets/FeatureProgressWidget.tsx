'use client'

import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, LinearProgress, IconButton, Collapse, Avatar, Tooltip, CircularProgress, Alert, FormControlLabel, Switch, Button, MenuItem, Select, Chip } from '@mui/material';
import { ExpandMore, ExpandLess, CheckCircle, AccessTime, ErrorOutline, UnfoldMore, UnfoldLess } from '@mui/icons-material';
import { getFeaturesWithStories } from '@/lib/jira-proxy';
import { useBoard } from '@/components/BoardContext';

interface Story {
  id: string;
  key: string;
  summary: string;
  status: string;
  statusCategory: string;
  assignee?: string;
  team?: string;
}

interface Feature {
  id: string;
  originalId?: string;
  key: string;
  summary: string;
  status: string;
  statusCategory: string;
  stories: Story[];
  completedStories: number;
  totalStories: number;
  progressPercentage: number;
  team?: string;
}

const progressColor = (pct: number) => {
  if (pct === 100) return '#198754';
  if (pct >= 75) return '#0d6efd';
  if (pct >= 50) return '#fd7e14';
  if (pct >= 25) return '#ffc107';
  return '#dc3545';
};

const statusIcon = (statusCategory: string) => {
  if (statusCategory === 'done') return <CheckCircle sx={{ color: '#198754' }} fontSize="small" aria-label="Done" />;
  if (statusCategory === 'indeterminate') return <AccessTime sx={{ color: '#fd7e14' }} fontSize="small" aria-label="In Progress" />;
  return <ErrorOutline sx={{ color: '#dc3545' }} fontSize="small" aria-label="To Do" />;
};

const statusLabel = (statusCategory: string) => {
  if (statusCategory === 'done') return 'Done';
  if (statusCategory === 'indeterminate') return 'In Progress';
  return 'To Do';
};

const getJiraIssueUrl = (issueKey: string) => {
  // Extract the base URL from the current environment or use a fallback
  const baseUrl = process.env.NEXT_PUBLIC_JIRA_BASE_URL || 'https://magmutual.atlassian.net';
  return `${baseUrl}/browse/${issueKey}`;
};

const featureProgressCache: { [key: string]: { data: Feature[]; timestamp: number } } = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Add props for team filtering and callback
interface FeatureProgressWidgetProps {
  onTeamsUpdate?: (teams: string[]) => void;
  selectedTeams?: string[];
}

export default function FeatureProgressWidget({ onTeamsUpdate, selectedTeams }: FeatureProgressWidgetProps) {
  const { selectedBoards, activeBoard } = useBoard();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [hideCompleted, setHideCompleted] = useState(false);
  const [hideEmptyFeatures, setHideEmptyFeatures] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [rawData, setRawData] = useState<any>(null);
  const [allTeams, setAllTeams] = useState<string[]>([]);

  // Color map and color function (copy from BoardSwitcher)
  const teamColorMap: Record<string, string> = {
    'OG Team': '#6C63FF',
    // Add more known teams and colors as needed
  };
  function getColorForTeam(team: string) {
    if (teamColorMap[team]) return teamColorMap[team];
    // Simple hash to color
    let hash = 0;
    for (let i = 0; i < team.length; i++) {
      hash = team.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF)
      .toString(16)
      .toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  }

  // Helper to get all boards associated with a feature (by originalId)
  function getBoardsForFeature(originalId: string | undefined) {
    if (!originalId) return [] as { name: string; id: number; projectKey: string }[];
    // For now, all selectedBoards are relevant
    return selectedBoards;
  }

  // Helper to get all unique teams for a feature (including its stories)
  function getTeamsForFeature(feature: Feature) {
    const teams = new Set<string>();
    if (feature.team) teams.add(feature.team);
    feature.stories.forEach(story => { if (story.team) teams.add(story.team); });
    if (teams.size === 0) teams.add('Other');
    return Array.from(teams);
  }

  useEffect(() => {
    // Clear cache for boards that are no longer selected
    const selectedCacheKeys = new Set(selectedBoards.map(b => `${b.projectKey}-${b.id}`));
    Object.keys(featureProgressCache).forEach(key => {
      if (!selectedCacheKeys.has(key)) {
        delete featureProgressCache[key];
      }
    });

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (selectedBoards.length === 0) {
          setError('No boards selected');
          setLoading(false);
          return;
        }

        // Add timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          setError('Request timed out. Please check your Jira configuration.');
          setLoading(false);
        }, 30000); // 30 second timeout

        // Fetch data for all selected boards
        const allFeatures: Feature[] = [];
        let combinedRawData: any = { issues: [] };
        
        for (const board of selectedBoards) {
          const now = Date.now();
          const cacheKey = `${board.projectKey}-${board.id}`;
          
          // Check cache first
          if (featureProgressCache[cacheKey] && (now - featureProgressCache[cacheKey].timestamp < CACHE_DURATION)) {
            allFeatures.push(...featureProgressCache[cacheKey].data);
            continue;
          }
          
          console.log('Fetching feature progress for board:', board.name, 'project:', board.projectKey);
          
          try {
            const data = await getFeaturesWithStories(board.projectKey);
            
            // Combine raw data for debug panel
            if (data.issues) {
              combinedRawData.issues.push(...data.issues);
            }
            
            if (!data.issues) {
              console.warn(`No issues found for board: ${board.name}`);
              continue;
            }
            
            // Parse Features and Stories
            const features = data.issues.filter((i: any) => i.fields.issuetype.name === 'Feature');
            const stories = data.issues.filter((i: any) => i.fields.issuetype.name === 'Story');
            
            // Debug: Log all unique issue type names to see what's available
            const allIssueTypes = Array.from(new Set(data.issues.map((i: any) => i.fields.issuetype.name)));
            console.log(`Board ${board.name}: All available issue types:`, allIssueTypes);
            console.log(`Board ${board.name}: Found features:`, features.length, 'stories:', stories.length);
            console.log(`Board ${board.name}: Sample features:`, features.slice(0, 2).map(f => ({ key: f.key, summary: f.fields.summary })));
            console.log(`Board ${board.name}: Sample stories with parents:`, stories.slice(0, 3).map(s => ({ 
              key: s.key, 
              parentKey: s.fields.parent?.key, 
              parentId: s.fields.parent?.id 
            })));
            
            // Debug: Check if we're finding any features at all
            if (features.length === 0) {
              console.warn(`Board ${board.name}: No features found! Available issue types:`, 
                Array.from(new Set(data.issues.map((i: any) => i.fields.issuetype.name))));
            }
            
            // Debug: Log customfield_10001 structure for first few issues
            console.log(`Board ${board.name}: Sample customfield_10001 values:`, 
              data.issues.slice(0, 5).map(issue => ({
                key: issue.key,
                customfield_10001: issue.fields.customfield_10001,
                customfield_10001_type: typeof issue.fields.customfield_10001,
                customfield_10001_keys: issue.fields.customfield_10001 ? Object.keys(issue.fields.customfield_10001) : []
              }))
            );
            
                    // Map stories to features
        const featureMap: Record<string, Feature> = {};
        for (const feature of features) {
          // Use project key + feature id to ensure uniqueness across projects
          const uniqueId = `${board.projectKey}-${feature.id}`;
          featureMap[uniqueId] = {
            id: uniqueId, // Use unique ID for React keys
            originalId: feature.id, // Keep original ID for reference
            key: feature.key,
            summary: feature.fields.summary,
            status: feature.fields.status.name,
            statusCategory: feature.fields.status.statusCategory.key,
            stories: [],
            completedStories: 0,
            totalStories: 0,
            progressPercentage: 0,
            team: (() => {
              const field = feature.fields.customfield_10001;
              if (typeof field === 'object' && field?.name) {
                return field.name;
              } else if (typeof field === 'string' && field) {
                return field;
              } else {
                return 'Other';
              }
            })(),
          };
        }
            
            for (const story of stories) {
              // Prioritize parent field over customfield_10014 since that's what we see in the data
              const parentFeatureId = (story.fields.parent && story.fields.parent.id) || story.fields.customfield_10014;
              if (parentFeatureId) {
                // Find the feature by original ID
                const feature = Object.values(featureMap).find(f => f.originalId === parentFeatureId);
                if (feature) {
                  feature.stories.push({
                    id: story.id,
                    key: story.key,
                    summary: story.fields.summary,
                    status: story.fields.status.name,
                    statusCategory: story.fields.status.statusCategory.key,
                    assignee: story.fields.assignee?.displayName || story.fields.assignee?.emailAddress,
                    team: (() => {
                      const field = story.fields.customfield_10001;
                      if (typeof field === 'object' && field?.name) {
                        return field.name;
                      } else if (typeof field === 'string' && field) {
                        return field;
                      } else {
                        return (feature.team || 'Other');
                      }
                    })(),
                  });
                }
              }
            }
            
            // Calculate progress
            for (const feature of Object.values(featureMap)) {
              feature.totalStories = feature.stories.length;
              feature.completedStories = feature.stories.filter(s => s.statusCategory === 'done').length;
              feature.progressPercentage = feature.totalStories > 0 ? Math.round((feature.completedStories / feature.totalStories) * 100) : 0;
            }
            
            const boardFeatures = Object.values(featureMap);
            allFeatures.push(...boardFeatures);
            
            // Cache the result
            featureProgressCache[cacheKey] = { data: boardFeatures, timestamp: Date.now() };
            
          } catch (err) {
            console.error(`Error fetching data for board ${board.name}:`, err);
            // Continue with other boards even if one fails
          }
        }
        
        clearTimeout(timeoutId);
        
        setRawData(combinedRawData); // Save combined raw API data for debug panel
        console.log('Combined feature progress data:', combinedRawData);
        
        // Deduplicate features based on original ID to avoid duplicates from multiple boards in same project
        // Instead of merging, just keep the first occurrence (latest data for selected boards)
        const seen = new Set<string>();
        const uniqueFeatures = allFeatures.filter(feature => {
          if (feature.originalId && seen.has(feature.originalId)) return false;
          if (feature.originalId) seen.add(feature.originalId);
          return true;
        });

        // Sort by progress ascending
        const sorted = uniqueFeatures.sort((a, b) => a.progressPercentage - b.progressPercentage);
        console.log('Final processed features (after deduplication):', sorted.length);
        console.log('Sample features:', sorted.slice(0, 3).map(f => ({
          id: f.id,
          key: f.key,
          summary: f.summary,
          storiesCount: f.stories.length,
          progress: f.progressPercentage
        })));
        setFeatures(sorted);
        
        setLoading(false);
      } catch (err) {
        console.error('FeatureProgressWidget error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch feature progress');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [selectedBoards]);

  useEffect(() => {
    // Aggregate all unique teams from features and stories
    const teams = new Set<string>();
    features.forEach(feature => {
      if (feature.team) teams.add(feature.team);
      feature.stories.forEach(story => {
        if (story.team) teams.add(story.team);
      });
    });
    if (teams.size === 0) teams.add('Other');
    const teamArr = Array.from(teams);
    setAllTeams(teamArr);
    if (onTeamsUpdate) onTeamsUpdate(teamArr);
    // Debug log
    console.log('DEBUG: Aggregated teams:', teamArr);
    console.log('DEBUG: Features:', features);
    console.log('DEBUG: Raw Jira data:', rawData);
  }, [features, onTeamsUpdate]);

  const handleExpandAll = () => {
    const all: Record<string, boolean> = {};
    features.forEach(f => { all[f.id] = true; });
    setExpanded(all);
  };
  const handleCollapseAll = () => {
    setExpanded({});
  };

  if (loading) {
    return (
      <Card sx={{ mb: 4, p: 2, maxWidth: 1350, mx: 'auto', bgcolor: '#f8f9fa', border: '1px solid #e9ecef' }}>
        <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <CircularProgress sx={{ color: '#0d6efd', mb: 2 }} size={40} aria-label="Loading" />
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#212529' }}>
            Loading feature progress…
          </Typography>
          <Typography variant="caption" sx={{ mt: 1, color: '#6c757d' }}>
            Boards: {selectedBoards.map(b => `${b.name} (${b.projectKey})`).join(', ') || 'None selected'}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ mb: 4, p: 2, maxWidth: 1350, mx: 'auto', bgcolor: '#f8f9fa', border: '1px solid #e9ecef' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ color: '#dc3545', fontWeight: 700 }} gutterBottom tabIndex={0}>
            Feature Progress (Epics)
          </Typography>
          <Typography variant="body2" sx={{ color: '#212529', fontWeight: 500 }} gutterBottom>
            {error}
          </Typography>
          <Typography variant="caption" sx={{ color: '#6c757d' }}>
            Make sure your Jira environment variables are configured correctly.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Filter features and stories by selectedTeams if provided
  let filteredFeatures = features;
  if (hideCompleted) filteredFeatures = filteredFeatures.filter(f => f.progressPercentage < 100);
  if (hideEmptyFeatures) filteredFeatures = filteredFeatures.filter(f => f.totalStories > 0);
  if (selectedTeams && selectedTeams.length > 0) {
    filteredFeatures = filteredFeatures.filter(f =>
      getTeamsForFeature(f).some(team => selectedTeams.includes(team))
    ).map(f => ({
      ...f,
      stories: f.stories.filter(s => selectedTeams.includes(s.team || 'Other'))
    }));
  }

  const overallPct = features.length > 0 ? Math.round((features.filter(f => f.progressPercentage === 100).length / features.length) * 100) : 0;

  return (
    <Card sx={{ mb: 4, p: 2, maxWidth: 1350, mx: 'auto', bgcolor: '#f8f9fa', border: '1px solid #e9ecef' }}>
      <CardContent>
        <Box sx={{ 
          bgcolor: '#ffffff', 
          borderRadius: 2, 
          p: 2, 
          mb: 3,
          border: '1px solid #dee2e6',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#212529' }}>Feature Progress</Typography>
              <Typography variant="caption" sx={{ color: '#6c757d', fontWeight: 500 }}>
                Boards: {selectedBoards.map(b => `${b.name} (${b.projectKey})`).join(', ')}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={2}>
              <FormControlLabel
                control={<Switch checked={hideCompleted} onChange={e => setHideCompleted(e.target.checked)} />}
                label={<Typography sx={{ color: '#212529', fontWeight: 500 }}>Hide Completed</Typography>}
              />
              <FormControlLabel
                control={<Switch checked={hideEmptyFeatures} onChange={e => setHideEmptyFeatures(e.target.checked)} />}
                label={<Typography sx={{ color: '#212529', fontWeight: 500 }}>Hide Empty Features</Typography>}
              />
              <Button 
                onClick={handleExpandAll} 
                startIcon={<UnfoldMore />} 
                sx={{ 
                  color: '#0d6efd', 
                  fontWeight: 500,
                  border: '1px solid #0d6efd',
                  '&:hover': { 
                    backgroundColor: '#0d6efd', 
                    color: '#ffffff' 
                  }
                }}
              >
                Expand All
              </Button>
              <Button 
                onClick={handleCollapseAll} 
                startIcon={<UnfoldLess />} 
                sx={{ 
                  color: '#0d6efd', 
                  fontWeight: 500,
                  border: '1px solid #0d6efd',
                  '&:hover': { 
                    backgroundColor: '#0d6efd', 
                    color: '#ffffff' 
                  }
                }}
              >
                Collapse All
              </Button>
            </Box>
          </Box>
          <Box display="flex" alignItems="center" gap={2} mb={2} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
            <Typography variant="subtitle2" sx={{ color: '#212529', fontWeight: 600, mr: 1, mb: 0.5 }}>Teams:</Typography>
            {allTeams.map(team => (
              <Chip
                key={team}
                label={team}
                avatar={<span style={{
                  display: 'inline-block',
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: getColorForTeam(team),
                  border: '1.5px solid #fff',
                  boxShadow: '0 0 0 1px #dee2e6',
                }} />}
                sx={{
                  bgcolor: '#f3f4f6',
                  color: '#212529',
                  fontWeight: 500,
                  fontSize: '0.95em',
                  mr: 1,
                  mb: 0.5,
                  height: 28
                }}
              />
            ))}
          </Box>
          <Box>
            <Typography variant="body2" sx={{ mb: 1, color: '#212529', fontWeight: 500 }}>Overall: {overallPct}% of features complete</Typography>
            <LinearProgress
              variant="determinate"
              value={overallPct}
              sx={{ height: 12, borderRadius: 6, background: '#e9ecef', '& .MuiLinearProgress-bar': { background: progressColor(overallPct) } }}
              aria-label={`Overall feature progress: ${overallPct}% complete`}
            />
          </Box>
        </Box>
        {filteredFeatures.length === 0 ? (
          <Typography variant="body2" sx={{ textAlign: 'center', py: 4, color: '#6c757d', fontWeight: 500 }}>
            {hideCompleted && hideEmptyFeatures ? 'No incomplete features with stories found.' :
             hideCompleted ? 'No incomplete features found.' :
             hideEmptyFeatures ? 'No features with stories found.' :
             'No features found in this project.'}
          </Typography>
        ) : (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: 3,
            maxWidth: '100%',
            '@media (max-width: 1400px)': {
              gridTemplateColumns: 'repeat(2, 1fr)',
            },
            '@media (max-width: 900px)': {
              gridTemplateColumns: '1fr',
            }
          }}>
            {filteredFeatures.map(feature => (
              <Card key={feature.id} sx={{ 
                bgcolor: '#ffffff', 
                border: '1px solid #dee2e6',
                '&:hover': { borderColor: '#adb5bd', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }
              }}>
                <CardContent sx={{ p: 2 }}>
                  <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={1}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 0.5 }}>
                        <a 
                          href={getJiraIssueUrl(feature.key)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: '#0d6efd', textDecoration: 'none', cursor: 'pointer', fontWeight: 600 }}
                          onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                        >
                          {feature.key}
                        </a>
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        fontSize: '0.875rem',
                        lineHeight: 1.3,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: '#495057',
                        fontWeight: 400
                      }}>
                        {feature.summary}
                      </Typography>
                    </Box>
                    <IconButton
                      aria-label={expanded[feature.id] ? 'Collapse feature details' : 'Expand feature details'}
                      onClick={() => setExpanded(e => ({ ...e, [feature.id]: !e[feature.id] }))}
                      size="small"
                      sx={{ 
                        ml: 1, 
                        flexShrink: 0,
                        color: '#0d6efd',
                        '&:hover': {
                          backgroundColor: 'rgba(13, 110, 253, 0.1)'
                        }
                      }}
                    >
                      {expanded[feature.id] ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#495057', fontWeight: 500 }}>
                      {feature.completedStories}/{feature.totalStories}
                    </Typography>
                    <Tooltip title={statusLabel(feature.statusCategory)}>
                      {statusIcon(feature.statusCategory)}
                    </Tooltip>
                    <Typography variant="body2" fontWeight={600} sx={{ 
                      minWidth: 40, 
                      textAlign: 'right', 
                      color: progressColor(feature.progressPercentage),
                      fontSize: '0.875rem'
                    }}>
                      {feature.progressPercentage}%
                    </Typography>
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    {getTeamsForFeature(feature).map(team => (
                      <Tooltip key={team} title={team} placement="top">
                        <span style={{
                          display: 'inline-block',
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          background: getColorForTeam(team || 'Other'),
                          border: '1.5px solid #fff',
                          boxShadow: '0 0 0 1px #dee2e6',
                          marginRight: 2
                        }} />
                      </Tooltip>
                    ))}
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <LinearProgress
                      variant="determinate"
                      value={feature.progressPercentage}
                      sx={{ 
                        height: 8, 
                        borderRadius: 4, 
                        background: '#e9ecef', 
                        flex: 1, 
                        '& .MuiLinearProgress-bar': { background: progressColor(feature.progressPercentage) } 
                      }}
                      aria-label={`Feature ${feature.key} progress: ${feature.progressPercentage}% complete`}
                    />
                  </Box>
                  
                  <Collapse in={!!expanded[feature.id]} timeout="auto" unmountOnExit>
                    <Box sx={{ 
                      mt: 1, 
                      pt: 1, 
                      borderTop: '1px solid #dee2e6',
                      maxHeight: 200,
                      overflow: 'auto'
                    }}>
                      {feature.stories.length === 0 ? (
                        <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#6c757d', fontWeight: 400 }}>
                          No stories linked to this feature.
                        </Typography>
                      ) : (
                        feature.stories.map((story, idx) => (
                          <Box key={`${feature.id}-${story.id}-${idx}`} display="flex" alignItems="center" gap={1} mb={0.5}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Tooltip key={story.team || 'Other'} title={story.team || 'Other'} placement="top">
                                <span style={{
                                  display: 'inline-block',
                                  width: 10,
                                  height: 10,
                                  borderRadius: '50%',
                                  background: getColorForTeam(story.team || 'Other'),
                                  border: '1.5px solid #fff',
                                  boxShadow: '0 0 0 1px #dee2e6',
                                  marginRight: 1
                                }} />
                              </Tooltip>
                            </Box>
                            <Typography variant="body2" fontWeight={500} sx={{ fontSize: '0.75rem' }}>
                              <a 
                                href={getJiraIssueUrl(story.key)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{ color: '#0d6efd', textDecoration: 'none', cursor: 'pointer', fontWeight: 600 }}
                                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                              >
                                {story.key}
                              </a>
                            </Typography>
                            <Typography variant="body2" sx={{ 
                              fontSize: '0.75rem',
                              flex: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              color: '#495057',
                              fontWeight: 400
                            }}>
                              {story.summary}
                            </Typography>
                            <Tooltip title={statusLabel(story.statusCategory)}>
                              {statusIcon(story.statusCategory)}
                            </Tooltip>
                            {story.assignee && (
                              <Avatar sx={{ width: 16, height: 16, fontSize: 10 }}>
                                {story.assignee[0]}
                              </Avatar>
                            )}
                          </Box>
                        ))
                      )}
                    </Box>
                  </Collapse>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </CardContent>
      <Box display="flex" justifyContent="flex-end" px={2} pb={2}>
        <Button 
          size="small" 
          variant="outlined" 
          onClick={() => setDebugOpen(d => !d)}
          sx={{ 
            color: '#0d6efd',
            borderColor: '#0d6efd',
            fontWeight: 500,
            '&:hover': {
              backgroundColor: '#0d6efd',
              color: '#ffffff',
              borderColor: '#0d6efd'
            }
          }}
        >
          {debugOpen ? 'Hide Debug Panel' : 'Show Debug Panel'}
        </Button>
      </Box>
      {debugOpen && (
        <Box sx={{ bgcolor: '#f8f9fa', color: '#212529', p: 2, borderRadius: 2, maxHeight: 400, overflow: 'auto', fontSize: 12, border: '1px solid #dee2e6' }}>
          <Typography variant="subtitle2" sx={{ color: '#0d6efd', fontWeight: 700, fontSize: '0.875rem' }}>Raw API Data:</Typography>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#212529', fontSize: '0.75rem' }}>{JSON.stringify(rawData, null, 2)}</pre>
          <Typography variant="subtitle2" sx={{ color: '#0d6efd', mt: 2, fontWeight: 700, fontSize: '0.875rem' }}>Mapped Features:</Typography>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#212529', fontSize: '0.75rem' }}>{JSON.stringify(features, null, 2)}</pre>
        </Box>
      )}
    </Card>
  );
} 