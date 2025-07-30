import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Box,
  Typography,
  Link,
} from '@mui/material';

interface JiraConfig {
  base_url: string;
  email: string;
  api_token: string;
}

interface JiraConfigDialogProps {
  open: boolean;
  onClose: () => void;
  onConfigSaved: (config: JiraConfig) => void;
}

export default function JiraConfigDialog({ open, onClose, onConfigSaved }: JiraConfigDialogProps) {
  const [config, setConfig] = useState<JiraConfig>({
    base_url: '',
    email: '',
    api_token: '',
  });
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);


  useEffect(() => {
    if (open) {
      loadExistingConfig();
    }
  }, [open]);

  const loadExistingConfig = async () => {
    // TODO: Implement when Tauri is properly configured
    console.log('Loading existing config - not yet implemented');
  };

  const handleTestConnection = async () => {
    if (!config.base_url || !config.email || !config.api_token) {
      setError('Please fill in all fields before testing the connection.');
      return;
    }

    setTesting(true);
    setError(null);
    setSuccess(null);

    // TODO: Implement when Tauri is properly configured
    setTimeout(() => {
      setSuccess('Connection test not yet implemented');
      setTesting(false);
    }, 1000);
  };

  const handleSave = async () => {
    if (!config.base_url || !config.email || !config.api_token) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError(null);

    // TODO: Implement when Tauri is properly configured
    setTimeout(() => {
      setSuccess('Configuration saved successfully! (Demo mode)');
      onConfigSaved(config);
      setLoading(false);
      
      // Auto-close after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    }, 1000);
  };

  const handleClose = () => {
    setError(null);
    setSuccess(null);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) !important',
          margin: 0,
          maxHeight: '90vh',
          maxWidth: '90vw'
        }
      }}
    >
      <DialogTitle>Jira Configuration</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Configure your Jira instance to fetch live data. Your credentials are stored securely on your device.
          </Typography>
          
          <Link 
            href="https://id.atlassian.com/manage-profile/security/api-tokens" 
            target="_blank" 
            rel="noopener noreferrer"
            sx={{ display: 'block', mb: 2 }}
          >
            How to generate an API token →
          </Link>
        </Box>

        <TextField
          fullWidth
          label="Jira Base URL"
          value={config.base_url}
          onChange={(e) => setConfig({ ...config, base_url: e.target.value })}
          placeholder="https://yourcompany.atlassian.net"
          margin="normal"
          helperText="Your Jira instance URL (without /rest/api/3)"
        />

        <TextField
          fullWidth
          label="Email"
          type="email"
          value={config.email}
          onChange={(e) => setConfig({ ...config, email: e.target.value })}
          placeholder="your-email@company.com"
          margin="normal"
        />

        <TextField
          fullWidth
          label="API Token"
          type="password"
          value={config.api_token}
          onChange={(e) => setConfig({ ...config, api_token: e.target.value })}
          placeholder="Your Jira API token"
          margin="normal"
          helperText="Not your password - generate an API token from Atlassian"
        />

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {success}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleTestConnection}
          disabled={testing || loading || !config.base_url || !config.email || !config.api_token}
          startIcon={testing ? <CircularProgress size={16} /> : null}
        >
          {testing ? 'Testing...' : 'Test Connection'}
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading || testing || !config.base_url || !config.email || !config.api_token}
          startIcon={loading ? <CircularProgress size={16} /> : null}
        >
          {loading ? 'Saving...' : 'Save Configuration'}
        </Button>
      </DialogActions>
    </Dialog>
  );
} 