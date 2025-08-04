import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip
} from '@mui/material';
import { Close, FileUpload, Delete } from '@mui/icons-material';

interface FileImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (data: any, fileName: string) => void;
}

interface ImportedFile {
  name: string;
  data: any;
  key: string;
}

export default function FileImportDialog({ open, onClose, onImport }: FileImportDialogProps) {
  const [importedFiles, setImportedFiles] = useState<ImportedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      setLoading(true);
      setError(null);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          // Read the file content
          const content = await file.text();
          const data = JSON.parse(content);
          
          // Extract filename
          const fileName = file.name;
          const key = fileName.replace('.json', '');
          
          // Check if file is already imported
          if (importedFiles.some(f => f.key === key)) {
            setError(`File ${fileName} is already imported`);
            continue;
          }

          // Validate that it's a valid Jira board data structure
          if (!data.columns && !data.issues) {
            console.warn(`File ${fileName} doesn't have expected structure, but continuing anyway`);
            // Don't block import, just warn
          }

          const newFile: ImportedFile = {
            name: fileName,
            data: data,
            key: key
          };

          setImportedFiles(prev => [...prev, newFile]);
          
        } catch (parseError) {
          setError(`Failed to parse ${file.name}: ${parseError}`);
        }
      }
    } catch (error) {
      setError(`Failed to read file: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFile = (key: string) => {
    setImportedFiles(prev => prev.filter(f => f.key !== key));
  };

  const handleImport = () => {
    console.log('Importing files:', importedFiles.map(f => f.name));
    importedFiles.forEach(file => {
      console.log('Importing file:', file.name, 'with data structure:', Object.keys(file.data));
      onImport(file.data, file.key);
    });
    setImportedFiles([]);
    onClose();
  };

  const handleClose = () => {
    setImportedFiles([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Import Jira Board Data</Typography>
          <IconButton onClick={handleClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select JSON files from your computer to import Jira board data.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".json"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        <Button
          variant="outlined"
          startIcon={loading ? <CircularProgress size={20} /> : <FileUpload />}
          onClick={triggerFileSelect}
          disabled={loading}
          sx={{ mb: 2 }}
        >
          {loading ? 'Loading...' : 'Select JSON Files'}
        </Button>

        {importedFiles.length > 0 && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Files to Import ({importedFiles.length}):
            </Typography>
            <List dense>
              {importedFiles.map((file) => (
                <ListItem key={file.key} sx={{ border: '1px solid #e0e0e0', borderRadius: 1, mb: 1 }}>
                  <ListItemText
                    primary={file.name}
                    secondary={`Key: ${file.key}`}
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => handleRemoveFile(file.key)}
                      size="small"
                    >
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleImport}
          variant="contained"
          disabled={importedFiles.length === 0}
        >
          Import {importedFiles.length > 0 ? `(${importedFiles.length})` : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
} 