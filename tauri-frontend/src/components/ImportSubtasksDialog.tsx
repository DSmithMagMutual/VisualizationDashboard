import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Alert,
  CircularProgress,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  LinearProgress,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import { Upload, CheckCircle, Error } from '@mui/icons-material';
import { createSubtask } from '../lib/jiraDataService';

interface ImportSubtasksDialogProps {
  open: boolean;
  onClose: () => void;
  onSubtasksImported: () => void;
  availableParents: Array<{ key: string; summary: string }>;
}

interface ImportRow {
  parentKey: string;
  summary: string;
  description: string;
  assigneeEmail: string;
  priority: string;
  status: 'pending' | 'success' | 'error';
  error?: string;
}

const ImportSubtasksDialog: React.FC<ImportSubtasksDialogProps> = ({
  open,
  onClose,
  onSubtasksImported,
  availableParents
}) => {
  const [step, setStep] = useState(0);
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = ['Upload CSV', 'Preview Data', 'Import Sub-tasks'];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          setError('CSV file must have at least a header row and one data row');
          return;
        }

        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
        const requiredHeaders = ['parent key', 'summary'];
        
        for (const required of requiredHeaders) {
          if (!headers.includes(required)) {
            setError(`CSV file must contain "${required}" column`);
            return;
          }
        }

        const data: ImportRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          if (values.length < headers.length) continue;

          const row: ImportRow = {
            parentKey: values[headers.indexOf('parent key')] || '',
            summary: values[headers.indexOf('summary')] || '',
            description: values[headers.indexOf('description')] || '',
            assigneeEmail: values[headers.indexOf('assignee email')] || '',
            priority: values[headers.indexOf('priority')] || 'Medium',
            status: 'pending'
          };

          // Validate parent key exists
          if (!availableParents.find(p => p.key === row.parentKey)) {
            row.status = 'error';
            row.error = 'Parent issue not found';
          }

          // Validate required fields
          if (!row.parentKey || !row.summary) {
            row.status = 'error';
            row.error = 'Parent key and summary are required';
          }

          data.push(row);
        }

        setImportData(data);
        setError(null);
        setStep(1);
      } catch (error) {
        setError('Failed to parse CSV file');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setStep(2);
    setLoading(true);
    setProgress(0);

    const validRows = importData.filter(row => row.status === 'pending');
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        await createSubtask(
          row.parentKey,
          row.summary,
          row.description || undefined,
          row.assigneeEmail || undefined,
          row.priority
        );
        
        row.status = 'success';
        successCount++;
      } catch (error) {
        row.status = 'error';
        row.error = error instanceof Error ? (error as Error).message : 'Unknown error';
        errorCount++;
      }

      setProgress(((i + 1) / validRows.length) * 100);
      setImportData([...importData]);
    }

    setLoading(false);
    
    if (successCount > 0) {
      onSubtasksImported();
    }
  };

  const handleClose = () => {
    setStep(0);
    setImportData([]);
    setError(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle color="success" fontSize="small" />;
      case 'error':
        return <Error color="error" fontSize="small" />;
      default:
        return <CircularProgress size={16} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>Import Sub-tasks</DialogTitle>
      <DialogContent>
        <Box sx={{ mt: 2 }}>
          <Stepper activeStep={step} sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {step === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <Button
                variant="outlined"
                startIcon={<Upload />}
                onClick={() => fileInputRef.current?.click()}
                sx={{ mb: 2 }}
              >
                Upload CSV File
              </Button>
              <Typography variant="body2" color="text.secondary">
                CSV format: Parent Key, Summary, Description, Assignee Email, Priority
              </Typography>
            </Box>
          )}

          {step === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Preview Import Data ({importData.length} rows)
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Status</TableCell>
                      <TableCell>Parent Key</TableCell>
                      <TableCell>Summary</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Assignee</TableCell>
                      <TableCell>Priority</TableCell>
                      <TableCell>Error</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {importData.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {getStatusIcon(row.status)}
                        </TableCell>
                        <TableCell>{row.parentKey}</TableCell>
                        <TableCell>{row.summary}</TableCell>
                        <TableCell>{row.description}</TableCell>
                        <TableCell>{row.assigneeEmail}</TableCell>
                        <TableCell>
                          <Chip
                            label={row.priority}
                            size="small"
                            color={getStatusColor(row.status)}
                          />
                        </TableCell>
                        <TableCell>
                          {row.error && (
                            <Typography variant="caption" color="error">
                              {row.error}
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {step === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Importing Sub-tasks...
              </Typography>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{ mb: 2 }}
              />
              <Typography variant="body2" color="text.secondary">
                {Math.round(progress)}% complete
              </Typography>
              
              <TableContainer component={Paper} sx={{ maxHeight: 400, mt: 2 }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Status</TableCell>
                      <TableCell>Parent Key</TableCell>
                      <TableCell>Summary</TableCell>
                      <TableCell>Error</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {importData.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {getStatusIcon(row.status)}
                        </TableCell>
                        <TableCell>{row.parentKey}</TableCell>
                        <TableCell>{row.summary}</TableCell>
                        <TableCell>
                          {row.error && (
                            <Typography variant="caption" color="error">
                              {row.error}
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          {step === 2 ? 'Close' : 'Cancel'}
        </Button>
        {step === 1 && (
          <Button
            onClick={handleImport}
            variant="contained"
            disabled={importData.some(row => row.status === 'error')}
          >
            Import Sub-tasks
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ImportSubtasksDialog;
