
import { Alert, Button, Box, Typography } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';

interface CredentialsWarningProps {
  onOpenSettings: () => void;
}

export default function CredentialsWarning({ onOpenSettings }: CredentialsWarningProps) {
  return (
    <Box sx={{ p: 3, textAlign: 'center' }}>
      <Alert 
        severity="warning" 
        sx={{ 
          mb: 2,
          '& .MuiAlert-message': {
            width: '100%'
          }
        }}
      >
        <Typography variant="h6" sx={{ mb: 1 }}>
          Jira Configuration Required
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          To view live Jira data, you need to configure your Jira credentials first.
          Your credentials are stored securely on your device and never shared.
        </Typography>
        <Button
          variant="contained"
          startIcon={<SettingsIcon />}
          onClick={onOpenSettings}
          sx={{ mt: 1 }}
        >
          Configure Jira Settings
        </Button>
      </Alert>
    </Box>
  );
} 