import React from 'react';
import { Box, Typography, IconButton, Tooltip, Chip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { formatDistanceToNow } from 'date-fns';

interface LastUpdatedIndicatorProps {
  lastUpdated?: string;
  source?: 'jira' | 'static';
  projectKey?: string;
  onRefresh?: () => void;
  loading?: boolean;
}

const LastUpdatedIndicator: React.FC<LastUpdatedIndicatorProps> = ({
  lastUpdated,
  source,
  projectKey,
  onRefresh,
  loading = false
}) => {
  const formatLastUpdated = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'Unknown';
    }
  };

  const getSourceColor = (source?: string) => {
    switch (source) {
      case 'jira':
        return 'primary';
      case 'static':
        return 'default';
      default:
        return 'default';
    }
  };

  const getSourceLabel = (source?: string) => {
    switch (source) {
      case 'jira':
        return 'Live Data';
      case 'static':
        return 'Static Data';
      default:
        return 'Unknown';
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.02)',
        borderRadius: 1,
        border: '1px solid rgba(0, 0, 0, 0.08)',
        minWidth: 'fit-content'
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          fontSize: '0.75rem',
          fontWeight: 500
        }}
      >
        Last updated:
      </Typography>
      
      <Typography
        variant="caption"
        sx={{
          color: 'text.primary',
          fontSize: '0.75rem',
          fontWeight: 600
        }}
      >
        {lastUpdated ? formatLastUpdated(lastUpdated) : 'Never'}
      </Typography>

      {source && (
        <Chip
          label={getSourceLabel(source)}
          size="small"
          color={getSourceColor(source)}
          variant="outlined"
          sx={{ height: 20, fontSize: '0.65rem' }}
        />
      )}

      {projectKey && (
        <Chip
          label={projectKey}
          size="small"
          variant="outlined"
          sx={{ height: 20, fontSize: '0.65rem' }}
        />
      )}

      {onRefresh && (
        <Tooltip title="Refresh data">
          <IconButton
            size="small"
            onClick={onRefresh}
            disabled={loading}
            sx={{
              width: 24,
              height: 24,
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
                backgroundColor: 'rgba(25, 118, 210, 0.04)'
              }
            }}
          >
            <RefreshIcon 
              fontSize="small" 
              sx={{
                animation: loading ? 'spin 1s linear infinite' : 'none',
                '@keyframes spin': {
                  '0%': { transform: 'rotate(0deg)' },
                  '100%': { transform: 'rotate(360deg)' }
                }
              }}
            />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
};

export default LastUpdatedIndicator; 