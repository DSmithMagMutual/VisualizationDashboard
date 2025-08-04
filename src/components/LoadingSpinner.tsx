'use client'

import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

interface LoadingSpinnerProps {
  message?: string;
}

export default function LoadingSpinner({ message = "Loading..." }: LoadingSpinnerProps) {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(2px)',
      }}
    >
      <CircularProgress 
        size={60} 
        thickness={4}
        sx={{ 
          color: '#0d6efd',
          mb: 2
        }} 
      />
      <Typography 
        variant="h6" 
        sx={{ 
          color: '#495057',
          fontWeight: 500,
          textAlign: 'center'
        }}
      >
        {message}
      </Typography>
    </Box>
  );
} 