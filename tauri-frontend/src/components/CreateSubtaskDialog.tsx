import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import { createSubtask } from '../lib/jiraDataService';

interface CreateSubtaskDialogProps {
  open: boolean;
  onClose: () => void;
  onSubtaskCreated: () => void;
  parentKey: string;
  availableParents: Array<{ key: string; summary: string }>;
}

const CreateSubtaskDialog: React.FC<CreateSubtaskDialogProps> = ({
  open,
  onClose,
  onSubtaskCreated,
  parentKey,
  availableParents
}) => {
  const [formData, setFormData] = useState({
    parentKey: parentKey || '',
    summary: '',
    description: '',
    assigneeEmail: '',
    priority: 'Medium'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: string) => (event: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSubmit = async () => {
    if (!formData.parentKey || !formData.summary.trim()) {
      setError('Parent issue and summary are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createSubtask(
        formData.parentKey,
        formData.summary.trim(),
        formData.description.trim() || undefined,
        formData.assigneeEmail.trim() || undefined,
        formData.priority
      );
      
      onSubtaskCreated();
      handleClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create sub-task');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      parentKey: parentKey || '',
      summary: '',
      description: '',
      assigneeEmail: '',
      priority: 'Medium'
    });
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Sub-task</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {error && (
            <Alert severity="error">
              {error}
            </Alert>
          )}

          <FormControl fullWidth required>
            <InputLabel>Parent Issue</InputLabel>
            <Select
              value={formData.parentKey}
              onChange={handleInputChange('parentKey')}
              label="Parent Issue"
            >
              {availableParents.map((parent) => (
                <MenuItem key={parent.key} value={parent.key}>
                  {parent.key}: {parent.summary}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            required
            label="Summary"
            value={formData.summary}
            onChange={handleInputChange('summary')}
            placeholder="Enter sub-task summary"
            multiline
            rows={2}
          />

          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={handleInputChange('description')}
            placeholder="Enter sub-task description (optional)"
            multiline
            rows={3}
          />

          <TextField
            fullWidth
            label="Assignee Email"
            value={formData.assigneeEmail}
            onChange={handleInputChange('assigneeEmail')}
            placeholder="user@example.com (optional)"
            type="email"
          />

          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select
              value={formData.priority}
              onChange={handleInputChange('priority')}
              label="Priority"
            >
              <MenuItem value="Lowest">Lowest</MenuItem>
              <MenuItem value="Low">Low</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="High">High</MenuItem>
              <MenuItem value="Highest">Highest</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || !formData.parentKey || !formData.summary.trim()}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          {loading ? 'Creating...' : 'Create Sub-task'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateSubtaskDialog;
