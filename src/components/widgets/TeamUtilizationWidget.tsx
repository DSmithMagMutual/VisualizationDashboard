import React from 'react';
import MetricCard from './MetricCard';
import ErrorWidget, { WidgetError } from './ErrorWidget';
import LoadingWidget from './LoadingWidget';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

interface TeamUtilizationWidgetProps {
  data?: Array<{ name: string; value: number }>;
  target: number;
  error?: WidgetError;
  loading: boolean;
  onRetry?: () => void;
}

const TeamUtilizationWidget: React.FC<TeamUtilizationWidgetProps> = ({ data, target, error, loading, onRetry }) => {
  if (loading) return <LoadingWidget title="Team Utilization" />;
  if (error) return <ErrorWidget title="Team Utilization" error={error} onRetry={onRetry} />;
  if (!data || data.length === 0) return null;
  const avgUtilization = Math.round(data.reduce((acc, curr) => acc + curr.value, 0) / data.length);
  return (
    <MetricCard title="Team Utilization" current={avgUtilization} target={target} trend="up" status="green">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#4CAF50" />
        </BarChart>
      </ResponsiveContainer>
    </MetricCard>
  );
};

export default TeamUtilizationWidget; 