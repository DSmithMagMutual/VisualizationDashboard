import React from 'react';
import { Card, CardContent, Typography, Box, CircularProgress } from '@mui/material';

interface LoadingWidgetProps {
  title: string;
}

const LoadingWidget: React.FC<LoadingWidgetProps> = ({ title }) => {
  return (
    <Card sx={{ mb: 2, maxWidth: 420, mx: 'auto' }}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="h6">{title}</Typography>
          <CircularProgress size={20} />
        </Box>
        <Box height={24} mb={1} bgcolor="#eee" borderRadius={1} />
        <Box height={24} width="75%" bgcolor="#eee" borderRadius={1} />
      </CardContent>
    </Card>
  );
};

export default LoadingWidget; 