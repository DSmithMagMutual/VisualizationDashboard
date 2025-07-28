'use client'

import React, { useState } from 'react';
import { Button, CircularProgress, Tooltip, Snackbar, Alert } from '@mui/material';
import { Refresh } from '@mui/icons-material';

interface RefreshButtonProps {
  onRefreshComplete?: (success: boolean) => void;
  variant?: 'text' | 'outlined' | 'contained';
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
}

export default function RefreshButton({ 
  onRefreshComplete, 
  variant = 'outlined', 
  size = 'medium',
  color = 'primary'
}: RefreshButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      const response = await fetch('/api/refresh-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        // Build a detailed success message
        let message = `Data refreshed successfully! Updated ${result.filesUpdated.length} files.`;
        
        if (result.results) {
          const details = Object.entries(result.results).map(([project, data]: [string, any]) => 
            `${project}: ${data.issues} issues`
          ).join(', ');
          message += ` ${details}`;
        }
        
        // Add warning if there were errors
        if (result.errors) {
          const errorDetails = Object.entries(result.errors).map(([project, error]) => 
            `${project}: ${error as string}`
          ).join(', ');
          message += ` (Warnings: ${errorDetails})`;
        }
        
        setSnackbar({
          open: true,
          message,
          severity: result.errors ? 'warning' : 'success'
        });
        
        // Call the callback if provided
        if (onRefreshComplete) {
          onRefreshComplete(true);
        }
      } else {
        throw new Error(result.error || 'Failed to refresh data');
      }
    } catch (error) {
      console.error('Refresh failed:', error);
      setSnackbar({
        open: true,
        message: error instanceof Error ? error.message : 'Failed to refresh data',
        severity: 'error'
      });
      
      // Call the callback with failure status
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
      <Tooltip title="Refresh all data from Jira">
        <Button
          variant={variant}
          size={size}
          color={color}
          onClick={handleRefresh}
          disabled={isRefreshing}
          startIcon={isRefreshing ? <CircularProgress size={16} /> : <Refresh />}
          sx={{
            minWidth: 'auto',
            ...(isRefreshing && {
              '& .MuiButton-startIcon': {
                animation: 'spin 1s linear infinite',
              },
            }),
          }}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
        </Button>
      </Tooltip>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
} 