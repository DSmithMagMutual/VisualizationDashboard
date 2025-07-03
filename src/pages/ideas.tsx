import React from 'react';
import Link from 'next/link';

const ideas = [
  {
    title: 'Custom Alerts',
    description: 'Set up custom alerts for metrics that fall below or exceed certain thresholds.'
  },
  {
    title: 'Historical Trends',
    description: 'Visualize trends over time for any metric, with exportable charts.'
  },
  {
    title: 'Team Comparison',
    description: 'Compare performance and metrics across multiple teams or projects.'
  },
  {
    title: 'Integration Marketplace',
    description: 'Add widgets from a marketplace of integrations (e.g., GitHub, Slack, Confluence).'
  },
  {
    title: 'Customizable Layouts',
    description: 'Drag and drop to rearrange dashboard widgets and save personalized layouts.'
  },
  {
    title: 'AI Insights',
    description: 'Get AI-driven suggestions for improving team performance and delivery.'
  },
];

export default function IdeasPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center py-10">
      <div className="w-full max-w-2xl mb-6">
        <Link href="/" className="inline-block bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded mb-2 font-medium transition">← Back to Home</Link>
      </div>
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">Ideas for Future Widgets</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ideas.map((idea, idx) => (
            <div key={idx} className="border rounded-lg p-4 bg-slate-100 shadow-sm">
              <h2 className="text-lg font-semibold mb-2">{idea.title}</h2>
              <p className="text-slate-700 text-sm">{idea.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 