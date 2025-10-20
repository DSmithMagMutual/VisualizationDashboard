import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Divider
} from '@mui/material';
import {
  ExpandMore,
  Add,
  Upload,
  Refresh,
  CheckCircle,
  PlayCircle,
  RadioButtonUnchecked,
  Person,
  Task
} from '@mui/icons-material';
import type { ParentIssue, ChildWorkItemsStats, JiraSubtask } from '../types/childWorkItems';
import { getIssueWithChildren } from '../lib/jiraDataService';
import CreateSubtaskDialog from './CreateSubtaskDialog';
import ImportSubtasksDialog from './ImportSubtasksDialog';

interface ChildWorkItemsWidgetProps {
  boardData: any;
  onRefresh: () => void;
}

const ChildWorkItemsWidget: React.FC<ChildWorkItemsWidgetProps> = ({ boardData, onRefresh }) => {
  const [parentIssues, setParentIssues] = useState<ParentIssue[]>([]);
  const [stats, setStats] = useState<ChildWorkItemsStats>({
    totalParents: 0,
    totalChildren: 0,
    completedChildren: 0,
    inProgressChildren: 0,
    todoChildren: 0,
    completionPercentage: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedParent, setSelectedParent] = useState<string>('');

  // Load child work items data
  useEffect(() => {
    loadChildWorkItems();
  }, [boardData]);

  const loadChildWorkItems = async () => {
    if (!boardData?.columns) return;

    setLoading(true);
    setError(null);

    try {
      const allCards = Object.values(boardData.columns).flat();
      const parentIssuesData: ParentIssue[] = [];
      let totalChildren = 0;
      let completedChildren = 0;
      let inProgressChildren = 0;
      let todoChildren = 0;

      // Process each card to get its children
      for (const card of allCards) {
        const cardData = card as any;
        if (cardData.key) {
          try {
            const issueData = await getIssueWithChildren(cardData.key);
            const children = issueData.fields?.subtasks || [];
            
            const childrenData: JiraSubtask[] = children.map((child: any) => ({
              id: child.id,
              key: child.key,
              fields: {
                summary: child.fields.summary,
                status: {
                  name: child.fields.status.name,
                  statusCategory: {
                    key: child.fields.status.statusCategory.key,
                    name: child.fields.status.statusCategory.name
                  }
                },
                assignee: child.fields.assignee,
                parent: {
                  key: cardData.key,
                  fields: { summary: cardData.summary }
                },
                issuetype: child.fields.issuetype,
                priority: child.fields.priority,
                description: child.fields.description,
                created: child.fields.created,
                updated: child.fields.updated
              }
            }));

            const completed = childrenData.filter(c => c.fields.status.statusCategory.key === 'done').length;
            const inProgress = childrenData.filter(c => c.fields.status.statusCategory.key === 'indeterminate').length;
            const todo = childrenData.filter(c => c.fields.status.statusCategory.key === 'new').length;

            totalChildren += childrenData.length;
            completedChildren += completed;
            inProgressChildren += inProgress;
            todoChildren += todo;

            if (childrenData.length > 0) {
              parentIssuesData.push({
                key: cardData.key,
                summary: cardData.summary,
                status: cardData.status,
                assignee: cardData.assignee,
                children: childrenData,
                completionStats: {
                  total: childrenData.length,
                  completed,
                  inProgress,
                  todo,
                  percentage: childrenData.length > 0 ? Math.round((completed / childrenData.length) * 100) : 0
                }
              });
            }
          } catch (error) {
            console.error(`Failed to load children for ${cardData.key}:`, error);
          }
        }
      }

      setParentIssues(parentIssuesData);
      setStats({
        totalParents: parentIssuesData.length,
        totalChildren,
        completedChildren,
        inProgressChildren,
        todoChildren,
        completionPercentage: totalChildren > 0 ? Math.round((completedChildren / totalChildren) * 100) : 0
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load child work items');
    } finally {
      setLoading(false);
    }
  };

  const handleExpandParent = (parentKey: string) => {
    const newExpanded = new Set(expandedParents);
    if (newExpanded.has(parentKey)) {
      newExpanded.delete(parentKey);
    } else {
      newExpanded.add(parentKey);
    }
    setExpandedParents(newExpanded);
  };

  const handleCreateSubtask = (parentKey: string) => {
    setSelectedParent(parentKey);
    setShowCreateDialog(true);
  };

  const handleSubtaskCreated = () => {
    setShowCreateDialog(false);
    loadChildWorkItems();
    onRefresh();
  };

  const handleImportSubtasks = () => {
    setShowImportDialog(true);
  };

  const handleSubtasksImported = () => {
    setShowImportDialog(false);
    loadChildWorkItems();
    onRefresh();
  };

  const getStatusIcon = (statusCategory: string) => {
    switch (statusCategory) {
      case 'done':
        return <CheckCircle color="success" fontSize="small" />;
      case 'indeterminate':
        return <PlayCircle color="warning" fontSize="small" />;
      default:
        return <RadioButtonUnchecked color="disabled" fontSize="small" />;
    }
  };

  const getStatusColor = (statusCategory: string) => {
    switch (statusCategory) {
      case 'done':
        return 'success';
      case 'indeterminate':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getIssueTypeIcon = (issueType: string) => {
    switch (issueType.toLowerCase()) {
      case 'bug':
        return <Task fontSize="small" color="error" />;
      case 'task':
        return <Task fontSize="small" />;
      case 'story':
        return <Task fontSize="small" color="primary" />;
      default:
        return <Task fontSize="small" />;
    }
  };

  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" component="h2">
              Child Work Items
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                startIcon={<Add />}
                onClick={() => setShowCreateDialog(true)}
                variant="outlined"
                color="primary"
              >
                Create
              </Button>
              <Button
                size="small"
                startIcon={<Upload />}
                onClick={handleImportSubtasks}
                variant="outlined"
                color="secondary"
              >
                Import
              </Button>
              <Tooltip title="Refresh">
                <IconButton size="small" onClick={loadChildWorkItems}>
                  <Refresh />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Stats Summary */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {stats.totalParents}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Parent Issues
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="primary">
                  {stats.totalChildren}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Child Items
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" color="success.main">
                  {stats.completionPercentage}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Complete
                </Typography>
              </Box>
            </Box>
            <LinearProgress
              variant="determinate"
              value={stats.completionPercentage}
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Chip
                icon={<CheckCircle />}
                label={`${stats.completedChildren} Done`}
                color="success"
                size="small"
              />
              <Chip
                icon={<PlayCircle />}
                label={`${stats.inProgressChildren} In Progress`}
                color="warning"
                size="small"
              />
              <Chip
                icon={<RadioButtonUnchecked />}
                label={`${stats.todoChildren} To Do`}
                color="default"
                size="small"
              />
            </Box>
          </Box>

          {/* Parent Issues List */}
          {parentIssues.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                No parent issues with child work items found
              </Typography>
            </Box>
          ) : (
            <Box>
              {parentIssues.map((parent) => (
                <Accordion
                  key={parent.key}
                  expanded={expandedParents.has(parent.key)}
                  onChange={() => handleExpandParent(parent.key)}
                  sx={{ mb: 1 }}
                >
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1" fontWeight="medium">
                          {parent.key}: {parent.summary}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                          <Chip
                            label={parent.status}
                            size="small"
                            color={getStatusColor(parent.status)}
                          />
                          {parent.assignee && (
                            <Chip
                              icon={<Person />}
                              label={parent.assignee}
                              size="small"
                              variant="outlined"
                            />
                          )}
                          <Chip
                            label={`${parent.completionStats.total} children`}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {parent.completionStats.percentage}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={parent.completionStats.percentage}
                          sx={{ width: 60, height: 4, borderRadius: 2 }}
                        />
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateSubtask(parent.key);
                          }}
                        >
                          <Add />
                        </IconButton>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      {parent.children.map((child, index) => (
                        <React.Fragment key={child.key}>
                          <ListItem>
                            <ListItemIcon>
                              {getStatusIcon(child.fields.status.statusCategory.key)}
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2" fontWeight="medium">
                                    {child.key}
                                  </Typography>
                                  {getIssueTypeIcon(child.fields.issuetype.name)}
                                  <Chip
                                    label={child.fields.status.name}
                                    size="small"
                                    color={getStatusColor(child.fields.status.statusCategory.key)}
                                  />
                                </Box>
                              }
                              secondary={
                                <Box>
                                  <Typography variant="body2" color="text.secondary">
                                    {child.fields.summary}
                                  </Typography>
                                  {child.fields.assignee && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                      <Avatar sx={{ width: 16, height: 16 }}>
                                        <Person fontSize="small" />
                                      </Avatar>
                                      <Typography variant="caption" color="text.secondary">
                                        {child.fields.assignee.displayName}
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                              }
                            />
                          </ListItem>
                          {index < parent.children.length - 1 && <Divider />}
                        </React.Fragment>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Create Sub-task Dialog */}
      <CreateSubtaskDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSubtaskCreated={handleSubtaskCreated}
        parentKey={selectedParent}
        availableParents={parentIssues.map(p => ({ key: p.key, summary: p.summary }))}
      />

      {/* Import Sub-tasks Dialog */}
      <ImportSubtasksDialog
        open={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        onSubtasksImported={handleSubtasksImported}
        availableParents={parentIssues.map(p => ({ key: p.key, summary: p.summary }))}
      />
    </>
  );
};

export default ChildWorkItemsWidget;
