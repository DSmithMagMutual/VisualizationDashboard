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
    // TODO: Replace with actual Tauri invoke call when Tauri integration is working
    // try {
    //   const existingConfig = await invoke('load_jira_config');
    //   if (existingConfig) {
    //     setConfig(existingConfig);
    //   }
    // } catch (error) {
    //   console.log('No existing config found or error loading:', error);
    // }
    console.log('Loading existing config - Tauri integration pending');
  };

  const handleTestConnection = async () => {
    if (!config.base_url || !config.email || !config.api_token) {
      setError('Please fill in all fields before testing the connection.');
      return;
    }

    setTesting(true);
    setError(null);
    setSuccess(null);

    try {
      // TODO: Replace with actual Tauri invoke call when Tauri integration is working
      // const result = await invoke('test_jira_connection', { config });
      
      // Simulate connection test for now
      const isValidUrl = config.base_url.includes('atlassian.net') || config.base_url.includes('jira.com');
      const isValidEmail = config.email.includes('@');
      const hasToken = config.api_token.length > 0;
      
      if (isValidUrl && isValidEmail && hasToken) {
        setSuccess('Connection test successful! (Demo mode - backend integration pending)');
      } else {
        setError('Please check your Jira URL, email, and API token format.');
      }
    } catch (error) {
      setError(`Connection test failed: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!config.base_url || !config.email || !config.api_token) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual Tauri invoke call when Tauri integration is working
      // await invoke('save_jira_config', { config });
      
      // Simulate save for now
      setSuccess('Configuration saved successfully! (Demo mode - backend integration pending)');
      onConfigSaved(config);
      
      // Auto-close after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      setError(`Failed to save configuration: ${error}`);
    } finally {
      setLoading(false);
    }
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