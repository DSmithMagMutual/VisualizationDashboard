import { useState } from 'react';
import {
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Link,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { refreshAllData, loadJiraConfig, testJiraConnection, type JiraConfig } from '../lib/refreshService';

interface GlobalRefreshButtonProps {
  onRefreshComplete?: (success: boolean) => void;
  variant?: 'outlined' | 'contained' | 'text';
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  showText?: boolean;
}

export default function GlobalRefreshButton({
  onRefreshComplete,
  variant = 'outlined',
  size = 'medium',
  color = 'primary',
  showText = true,
}: GlobalRefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [config, setConfig] = useState<JiraConfig>({
    base_url: '',
    email: '',
    api_token: '',
  });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      // First, try to load existing config
      const existingConfig = await loadJiraConfig();
      
      if (!existingConfig) {
        // No config found, show config dialog
        setShowConfigDialog(true);
        setIsRefreshing(false);
        return;
      }

      // Test connection first
      const testResult = await testJiraConnection(existingConfig);
      if (!testResult.success) {
        setSnackbar({
          open: true,
          message: `Connection test failed: ${testResult.message}`,
          severity: 'error',
        });
        setIsRefreshing(false);
        return;
      }

      // Proceed with refresh
      const result = await refreshAllData(existingConfig);

      if (result.success) {
        // Build a detailed success message
        let message = `Data refreshed successfully! Updated ${result.files_updated.length} files.`;
        
        if (result.results) {
          const details = Object.entries(result.results).map(([project, data]: [string, any]) => 
            `${project}: ${data.issues} issues`
          ).join(', ');
          message += ` ${details}`;
        }
        
        // Add warning if there were errors
        if (result.errors) {
          const errorDetails = Object.entries(result.errors).map(([project, error]) => 
            `${project}: ${error}`
          ).join(', ');
          message += ` (Warnings: ${errorDetails})`;
        }
        
        setSnackbar({
          open: true,
          message,
          severity: result.errors ? 'warning' : 'success',
        });
        
        // Call the callback if provided
        if (onRefreshComplete) {
          onRefreshComplete(true);
        }
      } else {
        throw new Error(result.message || 'Failed to refresh data');
      }
    } catch (error) {
      console.error('Refresh failed:', error);
      setSnackbar({
        open: true,
        message: `Refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      });
      
      if (onRefreshComplete) {
        onRefreshComplete(false);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config.base_url || !config.email || !config.api_token) {
      setSnackbar({
        open: true,
        message: 'Please fill in all fields before testing the connection.',
        severity: 'error',
      });
      return;
    }

    setIsTesting(true);
    
    try {
      const result = await testJiraConnection(config);
      
      if (result.success) {
        setSnackbar({
          open: true,
          message: result.message,
          severity: 'success',
        });
      } else {
        setSnackbar({
          open: true,
          message: result.message,
          severity: 'error',
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndRefresh = async () => {
    if (!config.base_url || !config.email || !config.api_token) {
      setSnackbar({
        open: true,
        message: 'Please fill in all fields.',
        severity: 'error',
      });
      return;
    }

    setIsRefreshing(true);
    setShowConfigDialog(false);
    
    try {
      // Test connection first
      const testResult = await testJiraConnection(config);
      if (!testResult.success) {
        setSnackbar({
          open: true,
          message: `Connection test failed: ${testResult.message}`,
          severity: 'error',
        });
        setIsRefreshing(false);
        return;
      }

      // Proceed with refresh
      const result = await refreshAllData(config);

      if (result.success) {
        let message = `Data refreshed successfully! Updated ${result.files_updated.length} files.`;
        
        if (result.results) {
          const details = Object.entries(result.results).map(([project, data]: [string, any]) => 
            `${project}: ${data.issues} issues`
          ).join(', ');
          message += ` ${details}`;
        }
        
        if (result.errors) {
          const errorDetails = Object.entries(result.errors).map(([project, error]) => 
            `${project}: ${error}`
          ).join(', ');
          message += ` (Warnings: ${errorDetails})`;
        }
        
        setSnackbar({
          open: true,
          message,
          severity: result.errors ? 'warning' : 'success',
        });
        
        if (onRefreshComplete) {
          onRefreshComplete(true);
        }
      } else {
        throw new Error(result.message || 'Failed to refresh data');
      }
    } catch (error) {
      console.error('Refresh failed:', error);
      setSnackbar({
        open: true,
        message: `Refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      });
      
      if (onRefreshComplete) {
        onRefreshComplete(false);
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  return (
    <>
      <Button
        onClick={handleRefresh}
        disabled={isRefreshing}
        variant={variant}
        size={size}
        color={color}
        startIcon={isRefreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
        sx={{
          fontWeight: 600,
          borderRadius: 1,
          ...(variant === 'outlined' && {
            borderColor: '#0d6efd',
            color: '#0d6efd',
            '&:hover': {
              borderColor: '#0b5ed7',
              backgroundColor: 'rgba(13, 110, 253, 0.04)',
            },
          }),
        }}
      >
        {showText && (isRefreshing ? 'Refreshing...' : 'Refresh All Data')}
      </Button>

      {/* Configuration Dialog */}
      <Dialog
        open={showConfigDialog}
        onClose={() => setShowConfigDialog(false)}
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
            maxWidth: '90vw',
          },
        }}
      >
        <DialogTitle>Jira Configuration Required</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Configure your Jira instance to refresh data. Your credentials are stored securely on your device.
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
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setShowConfigDialog(false)} disabled={isRefreshing}>
            Cancel
          </Button>
          <Button
            onClick={handleTestConnection}
            disabled={isTesting || isRefreshing || !config.base_url || !config.email || !config.api_token}
            startIcon={isTesting ? <CircularProgress size={16} /> : null}
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </Button>
          <Button
            onClick={handleSaveAndRefresh}
            variant="contained"
            disabled={isRefreshing || isTesting || !config.base_url || !config.email || !config.api_token}
            startIcon={isRefreshing ? <CircularProgress size={16} /> : null}
          >
            {isRefreshing ? 'Refreshing...' : 'Save & Refresh'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
} 