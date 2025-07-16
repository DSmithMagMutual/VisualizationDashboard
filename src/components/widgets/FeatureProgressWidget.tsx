'use client'

import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, LinearProgress, IconButton, Collapse, Avatar, Tooltip, CircularProgress, Alert, FormControlLabel, Switch, Button, MenuItem, Select } from '@mui/material';
import { ExpandMore, ExpandLess, CheckCircle, AccessTime, ErrorOutline, UnfoldMore, UnfoldLess } from '@mui/icons-material';
import { getFeaturesWithStories } from '@/lib/jira-proxy';
import { useBoard } from '../MinimalistDashboard';

interface Story {
  id: string;
  key: string;
  summary: string;
  status: string;
  statusCategory: string;
  assignee?: string;
}

interface Feature {
  id: string;
  key: string;
  summary: string;
  status: string;
  statusCategory: string;
  stories: Story[];
  completedStories: number;
  totalStories: number;
  progressPercentage: number;
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

export default function FeatureProgressWidget() {
  const { activeBoard } = useBoard();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [hideCompleted, setHideCompleted] = useState(false);
  const [hideEmptyFeatures, setHideEmptyFeatures] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [rawData, setRawData] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const now = Date.now();
        if (activeBoard && activeBoard.name && featureProgressCache[activeBoard.name] && (now - featureProgressCache[activeBoard.name].timestamp < CACHE_DURATION)) {
          // Use cached data
          setFeatures(featureProgressCache[activeBoard.name].data);
          setLoading(false);
          return;
        }
        
        // Add timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          setError('Request timed out. Please check your Jira configuration.');
          setLoading(false);
        }, 30000); // 30 second timeout

        const projectKey = activeBoard.name;
        console.log('Fetching feature progress for project:', projectKey);
        
        const data = await getFeaturesWithStories(projectKey);
        setRawData(data); // Save raw API data for debug panel
        console.log('Feature progress data:', data);
        
        clearTimeout(timeoutId);
        
        if (!data.issues) {
          throw new Error('No issues found');
        }
        
        // Parse Features and Stories
        const features = data.issues.filter((i: any) => i.fields.issuetype.name === 'Feature');
        const stories = data.issues.filter((i: any) => i.fields.issuetype.name === 'Story');
        console.log('Found features:', features.length, 'stories:', stories.length);
        console.log('Features:', features.map((f: any) => ({ key: f.key, summary: f.fields.summary })));
        console.log('Sample stories with parents:', stories.slice(0, 3).map((s: any) => ({ 
          key: s.key, 
          parent: s.fields.parent?.key, 
          parentId: s.fields.parent?.id 
        })));
        
        // Map stories to features
        const featureMap: Record<string, Feature> = {};
        for (const feature of features) {
          featureMap[feature.id] = {
            id: feature.id,
            key: feature.key,
            summary: feature.fields.summary,
            status: feature.fields.status.name,
            statusCategory: feature.fields.status.statusCategory.key,
            stories: [],
            completedStories: 0,
            totalStories: 0,
            progressPercentage: 0,
          };
        }
        for (const story of stories) {
          // Prioritize parent field over customfield_10014 since that's what we see in the data
          const featureId = (story.fields.parent && story.fields.parent.id) || story.fields.customfield_10014;
          if (featureId && featureMap[featureId]) {
            featureMap[featureId].stories.push({
              id: story.id,
              key: story.key,
              summary: story.fields.summary,
              status: story.fields.status.name,
              statusCategory: story.fields.status.statusCategory.key,
              assignee: story.fields.assignee?.displayName || story.fields.assignee?.emailAddress,
            });
          }
        }
        // Calculate progress
        for (const feature of Object.values(featureMap)) {
          feature.totalStories = feature.stories.length;
          feature.completedStories = feature.stories.filter(s => s.statusCategory === 'done').length;
          feature.progressPercentage = feature.totalStories > 0 ? Math.round((feature.completedStories / feature.totalStories) * 100) : 0;
        }
        // Sort by progress ascending
        const sorted = Object.values(featureMap).sort((a, b) => a.progressPercentage - b.progressPercentage);
        setFeatures(sorted);
        
        // Cache the result
        if (activeBoard && activeBoard.name) {
          featureProgressCache[activeBoard.name] = { data: sorted, timestamp: Date.now() };
        }
        
        setLoading(false);
      } catch (err) {
        console.error('FeatureProgressWidget error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch feature progress');
        setLoading(false);
      }
    };
    
    if (activeBoard && activeBoard.name) {
      fetchData();
    } else {
      setError('No active board selected');
      setLoading(false);
    }
  }, [activeBoard]);

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
            Project: {activeBoard?.name || 'Unknown'}
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

  let filteredFeatures = features;
  if (hideCompleted) filteredFeatures = filteredFeatures.filter(f => f.progressPercentage < 100);
  if (hideEmptyFeatures) filteredFeatures = filteredFeatures.filter(f => f.totalStories > 0);

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
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#212529' }}>Feature Progress</Typography>
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
                        feature.stories.map(story => (
                          <Box key={story.id} display="flex" alignItems="center" gap={1} mb={0.5}>
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