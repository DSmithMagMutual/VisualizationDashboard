import React from 'react';
import MetricCard from './MetricCard';
import ErrorWidget, { WidgetError } from './ErrorWidget';
import LoadingWidget from './LoadingWidget';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface SprintProgressWidgetProps {
  data?: { completed: number; inProgress: number; planned: number };
  target: number;
  error?: WidgetError;
  loading: boolean;
  onRetry?: () => void;
}

const SprintProgressWidget: React.FC<SprintProgressWidgetProps> = ({ data, target, error, loading, onRetry }) => {
  if (loading) return <LoadingWidget title="Sprint Progress" />;
  if (error) return <ErrorWidget title="Sprint Progress" error={error} onRetry={onRetry} />;
  if (!data) return null;
  return (
    <MetricCard title="Sprint Progress" current={data.completed} target={target} trend="up" status="green">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={[
              { name: 'Completed', value: data.completed, color: '#3B82F6' },
              { name: 'In Progress', value: data.inProgress, color: '#4CAF50' },
              { name: 'Planned', value: data.planned, color: '#FFB74D' }
            ]}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            dataKey="value"
          >
            {[
              { name: 'Completed', value: data.completed, color: '#3B82F6' },
              { name: 'In Progress', value: data.inProgress, color: '#4CAF50' },
              { name: 'Planned', value: data.planned, color: '#FFB74D' }
            ].map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </MetricCard>
  );
};

export default SprintProgressWidget; 