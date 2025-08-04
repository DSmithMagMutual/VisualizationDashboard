import React from 'react';
import { Box, Typography } from '@mui/material';

interface VersionDisplayProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const VersionDisplay: React.FC<VersionDisplayProps> = ({ position = 'bottom-right' }) => {
  const version = '0.1.0'; // You can update this or make it dynamic

  const getPositionStyles = () => {
    switch (position) {
      case 'top-left':
        return { top: 8, left: 8 };
      case 'top-right':
        return { top: 8, right: 8 };
      case 'bottom-left':
        return { bottom: 8, left: 8 };
      case 'bottom-right':
      default:
        return { bottom: 8, right: 8 };
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        ...getPositionStyles(),
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: 'rgba(0, 0, 0, 0.4)',
          fontSize: '0.7rem',
          fontFamily: 'monospace',
          userSelect: 'none',
        }}
      >
        v{version}
      </Typography>
    </Box>
  );
};

export default VersionDisplay; 