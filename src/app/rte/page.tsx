import React from 'react';
import FeatureProgressWidget from '@/components/widgets/FeatureProgressWidget';

export default function FeatureProgressDashboardPage() {
  return (
    <main style={{ padding: 32 }}>
      <h1>Feature Progress Dashboard</h1>
      <p>This page displays the Feature Progress Dashboard for the ADVICE project.</p>
      <FeatureProgressWidget />
    </main>
  );
} 