import React from 'react';
import { Card, CardContent, Typography, Button } from '@mui/material';

interface SurveyCellProps {
  activeCount: number;
}

const SurveyCell: React.FC<SurveyCellProps> = ({ activeCount }) => (
  <Card sx={{ mb: 2 }}>
    <CardContent>
      <Typography variant="h6" mb={1}>Surveys & Feedback</Typography>
      <Typography variant="body1" mb={1}>Active Surveys: <b>{activeCount}</b></Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Collect feedback from your team and stakeholders to improve project outcomes.
      </Typography>
      <Button variant="contained" color="primary">Go to Surveys</Button>
    </CardContent>
  </Card>
);

export default SurveyCell; 