import React, { useState } from 'react';
import { Card, CardContent, Typography, Button, Chip, Divider, Box } from '@mui/material';
import { ArrowUp, ArrowDown, ChevronUp, ChevronDown } from 'lucide-react';

interface MetricCardProps {
  title: string;
  current: number;
  target: number;
  trend: 'up' | 'down';
  status: 'green' | 'yellow' | 'red';
  isDummyData?: boolean;
  children: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, current, target, trend, status, isDummyData = false, children }) => {
  const [expanded, setExpanded] = useState(false);
  const statusColors: Record<string, string> = {
    green: '#4caf50',
    yellow: '#ffb300',
    red: '#f44336',
  };
  const getStatusIcon = () => (
    trend === 'up' ? <ArrowUp color="#4caf50" size={20} /> : <ArrowDown color="#f44336" size={20} />
  );
  return (
    <Card sx={{ mb: 2, maxWidth: 420, mx: 'auto' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Box>
            <Typography variant="h6">{title}</Typography>
            {isDummyData && <Chip label="Demo Data" size="small" sx={{ mt: 0.5 }} />}
          </Box>
          <Box width={16} height={16} borderRadius={8} bgcolor={statusColors[status]} />
        </Box>
        <Box display="flex" justifyContent="space-between" alignItems="flex-end" mb={2}>
          <Box>
            <Typography variant="caption" color="text.secondary">Current</Typography>
            <Typography variant="h4">{current}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Target</Typography>
            <Typography variant="h6">{target}</Typography>
          </Box>
          <Box display="flex" alignItems="center">{getStatusIcon()}</Box>
        </Box>
        <Button size="small" color="primary" onClick={() => setExpanded(e => !e)} endIcon={expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />} sx={{ mb: expanded ? 2 : 0 }}>
          {expanded ? 'Hide details' : 'Show details'}
        </Button>
        {expanded && <Divider sx={{ my: 2 }} />}
        {expanded && children}
      </CardContent>
    </Card>
  );
};

export default MetricCard; 