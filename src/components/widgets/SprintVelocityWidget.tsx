import React from 'react';
import MetricCard from './MetricCard';
import ErrorWidget, { WidgetError } from './ErrorWidget';
import LoadingWidget from './LoadingWidget';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

interface SprintVelocityWidgetProps {
  data?: Array<{ month: string; value: number }>;
  target: number;
  error?: WidgetError;
  loading: boolean;
  onRetry?: () => void;
}

const SprintVelocityWidget: React.FC<SprintVelocityWidgetProps> = ({ data, target, error, loading, onRetry }) => {
  if (loading) return <LoadingWidget title="Sprint Velocity" />;
  if (error) return <ErrorWidget title="Sprint Velocity" error={error} onRetry={onRetry} />;
  if (!data || data.length === 0) return null;
  const currentVelocity = data[data.length - 1]?.value || 0;
  return (
    <MetricCard title="Sprint Velocity" current={currentVelocity} target={target} trend="up" status="green">
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#3b82f6" />
        </LineChart>
      </ResponsiveContainer>
    </MetricCard>
  );
};

export default SprintVelocityWidget; 