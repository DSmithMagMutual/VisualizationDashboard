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
  if (pct === 100) return '#4caf50';
  if (pct >= 75) return '#8bc34a';
  if (pct >= 50) return '#ffb300';
  if (pct >= 25) return '#ff9800';
  return '#f44336';
};

const statusIcon = (statusCategory: string) => {
  if (statusCategory === 'done') return <CheckCircle color="success" fontSize="small" aria-label="Done" />;
  if (statusCategory === 'indeterminate') return <AccessTime color="warning" fontSize="small" aria-label="In Progress" />;
  return <ErrorOutline color="error" fontSize="small" aria-label="To Do" />;
};

const statusLabel = (statusCategory: string) => {
  if (statusCategory === 'done') return 'Done';
  if (statusCategory === 'indeterminate') return 'In Progress';
  return 'To Do';
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
      <Card sx={{ mb: 4, p: 2, maxWidth: 900, mx: 'auto' }}>
        <CardContent sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
          <CircularProgress color="primary" size={40} aria-label="Loading" sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Loading feature progress…
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            Project: {activeBoard?.name || 'Unknown'}
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ mb: 4, p: 2, maxWidth: 900, mx: 'auto' }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" color="error" gutterBottom tabIndex={0}>
            Feature Progress (Epics)
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {error}
          </Typography>
          <Typography variant="caption" color="text.secondary">
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
    <Card sx={{ mb: 4, p: 2, maxWidth: 900, mx: 'auto' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6" fontWeight={700}>Feature Progress</Typography>
          <Box display="flex" alignItems="center" gap={2}>
            <FormControlLabel
              control={<Switch checked={hideCompleted} onChange={e => setHideCompleted(e.target.checked)} />}
              label="Hide Completed"
            />
            <FormControlLabel
              control={<Switch checked={hideEmptyFeatures} onChange={e => setHideEmptyFeatures(e.target.checked)} />}
              label="Hide Empty Features"
            />
            <Button onClick={handleExpandAll} startIcon={<UnfoldMore />}>Expand All</Button>
            <Button onClick={handleCollapseAll} startIcon={<UnfoldLess />}>Collapse All</Button>
          </Box>
        </Box>
        <Box mb={2}>
          <Typography variant="body2" sx={{ mb: 1 }}>Overall: {overallPct}% of features complete</Typography>
          <LinearProgress
            variant="determinate"
            value={overallPct}
            sx={{ height: 12, borderRadius: 6, background: '#433E3F', '& .MuiLinearProgress-bar': { background: progressColor(overallPct) } }}
            aria-label={`Overall feature progress: ${overallPct}% complete`}
          />
        </Box>
        {filteredFeatures.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            {hideCompleted && hideEmptyFeatures ? 'No incomplete features with stories found.' :
             hideCompleted ? 'No incomplete features found.' :
             hideEmptyFeatures ? 'No features with stories found.' :
             'No features found in this project.'}
          </Typography>
        ) : (
          filteredFeatures.map(feature => (
            <Box key={feature.id} mb={3}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center" gap={2}>
                  <Typography variant="subtitle1" fontWeight={600}>{feature.key}</Typography>
                  <Typography variant="body2" color="text.secondary">{feature.summary}</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2" color="text.secondary">{feature.completedStories}/{feature.totalStories}</Typography>
                  <Tooltip title={statusLabel(feature.statusCategory)}>
                    {statusIcon(feature.statusCategory)}
                  </Tooltip>
                  <Typography variant="body2" fontWeight={600} sx={{ minWidth: 40, textAlign: 'right', color: progressColor(feature.progressPercentage) }}>{feature.progressPercentage}%</Typography>
                  <IconButton
                    aria-label={expanded[feature.id] ? 'Collapse feature details' : 'Expand feature details'}
                    onClick={() => setExpanded(e => ({ ...e, [feature.id]: !e[feature.id] }))}
                    size="small"
                  >
                    {expanded[feature.id] ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>
              </Box>
              <Box mt={1} mb={1} display="flex" alignItems="center" gap={2}>
                <LinearProgress
                  variant="determinate"
                  value={feature.progressPercentage}
                  sx={{ height: 10, borderRadius: 5, background: '#433E3F', flex: 1, '& .MuiLinearProgress-bar': { background: progressColor(feature.progressPercentage) } }}
                  aria-label={`Feature ${feature.key} progress: ${feature.progressPercentage}% complete`}
                />
                <Typography variant="body2" fontWeight={600} sx={{ minWidth: 40, textAlign: 'right', color: progressColor(feature.progressPercentage) }}>{feature.progressPercentage}%</Typography>
              </Box>
              <Collapse in={!!expanded[feature.id]} timeout="auto" unmountOnExit>
                <Box pl={3}>
                  {feature.stories.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">No stories linked to this feature.</Typography>
                  ) : (
                    feature.stories.map(story => (
                      <Box key={story.id} display="flex" alignItems="center" gap={2} mb={1}>
                        <Typography variant="body2" fontWeight={500}>{story.key}</Typography>
                        <Typography variant="body2" color="text.secondary">{story.summary}</Typography>
                        <Tooltip title={statusLabel(story.statusCategory)}>
                          {statusIcon(story.statusCategory)}
                        </Tooltip>
                        {story.assignee && <Avatar sx={{ width: 24, height: 24, fontSize: 12 }}>{story.assignee[0]}</Avatar>}
                      </Box>
                    ))
                  )}
                </Box>
              </Collapse>
            </Box>
          ))
        )}
      </CardContent>
      <Box display="flex" justifyContent="flex-end" px={2} pb={2}>
        <Button size="small" variant="outlined" onClick={() => setDebugOpen(d => !d)}>
          {debugOpen ? 'Hide Debug Panel' : 'Show Debug Panel'}
        </Button>
      </Box>
      {debugOpen && (
        <Box sx={{ bgcolor: '#222', color: '#fff', p: 2, borderRadius: 2, maxHeight: 400, overflow: 'auto', fontSize: 12 }}>
          <Typography variant="subtitle2" sx={{ color: '#8bc34a' }}>Raw API Data:</Typography>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(rawData, null, 2)}</pre>
          <Typography variant="subtitle2" sx={{ color: '#4caf50', mt: 2 }}>Mapped Features:</Typography>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{JSON.stringify(features, null, 2)}</pre>
        </Box>
      )}
    </Card>
  );
} 