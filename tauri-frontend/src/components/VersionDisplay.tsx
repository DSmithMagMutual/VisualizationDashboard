import { Box, Typography, Tooltip } from '@mui/material';
import { useState, useEffect } from 'react';
import { getVersionInfo } from '../utils/version';

interface VersionDisplayProps {
  className?: string;
}

const VersionDisplay: React.FC<VersionDisplayProps> = ({ className }) => {
  const [versionInfo, setVersionInfo] = useState(getVersionInfo());

  useEffect(() => {
    // Get version info on component mount
    setVersionInfo(getVersionInfo());
  }, []);

  return (
    <Box
      className={className}
      sx={{
        position: 'fixed',
        bottom: 8,
        right: 8,
        zIndex: 1000,
        pointerEvents: 'none', // Allow clicking through
      }}
    >
      <Tooltip 
        title={`Version ${versionInfo.version} (${versionInfo.environment}) - Built ${versionInfo.buildDate}`} 
        placement="top"
      >
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(0, 0, 0, 0.4)',
            fontSize: '0.7rem',
            fontWeight: 500,
            fontFamily: 'monospace',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            padding: '2px 6px',
            borderRadius: '4px',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(4px)',
            pointerEvents: 'auto', // Re-enable pointer events for the tooltip
            userSelect: 'none',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              color: 'rgba(0, 0, 0, 0.6)',
            }
          }}
        >
          v{versionInfo.version}
        </Typography>
      </Tooltip>
    </Box>
  );
};

export default VersionDisplay; 