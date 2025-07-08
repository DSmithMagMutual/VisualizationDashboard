import React from 'react';
import MetricCard from './MetricCard';
import ErrorWidget, { WidgetError } from './ErrorWidget';
import LoadingWidget from './LoadingWidget';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface FeatureStatusWidgetProps {
  data?: { completed: number; inProgress: number; blocked: number };
  target: number;
  error?: WidgetError;
  loading: boolean;
  onRetry?: () => void;
}

const FeatureStatusWidget: React.FC<FeatureStatusWidgetProps> = ({ data, target, error, loading, onRetry }) => {
  if (loading) return <LoadingWidget title="Feature Status" />;
  if (error) return <ErrorWidget title="Feature Status" error={error} onRetry={onRetry} />;
  if (!data) return null;
  return (
    <MetricCard title="Feature Status" current={data.completed} target={target} trend="up" status="green">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={[
          { name: 'Completed', value: data.completed },
          { name: 'In Progress', value: data.inProgress },
          { name: 'Blocked', value: data.blocked }
        ]}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#6366F1" />
        </BarChart>
      </ResponsiveContainer>
    </MetricCard>
  );
};

export default FeatureStatusWidget; 