import React from 'react';
import { Card, CardContent, Typography, Button, Paper, Box } from '@mui/material';
import { AlertCircle, RefreshCw } from 'lucide-react';

export interface WidgetError {
  message: string;
  retry?: () => void;
}

interface ErrorWidgetProps {
  title: string;
  error: WidgetError;
  onRetry?: () => void;
}

const ErrorWidget: React.FC<ErrorWidgetProps> = ({ title, error, onRetry }) => {
  return (
    <Card sx={{ mb: 1.5, maxWidth: 420, mx: 'auto', borderLeft: '4px solid #f44336', bgcolor: '#fff', boxShadow: 1 }}>
      <CardContent sx={{ p: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
          <Box display="flex" alignItems="center" gap={1}>
            <AlertCircle color="#f44336" size={18} />
            <Typography variant="subtitle1" color="error" fontWeight={600}>{title}</Typography>
          </Box>
          {onRetry && (
            <Button onClick={onRetry} size="small" startIcon={<RefreshCw size={14} />} color="primary" variant="outlined">
              Retry
            </Button>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" mb={0.5} fontSize={13}>{error.message}</Typography>
        <Paper variant="outlined" sx={{ p: 1, bgcolor: '#fafafa' }}>
          <Typography variant="caption" color="text.secondary" fontSize={12}>
            This widget is temporarily unavailable. Other widgets should continue to function normally.
          </Typography>
        </Paper>
      </CardContent>
    </Card>
  );
};

export default ErrorWidget; 