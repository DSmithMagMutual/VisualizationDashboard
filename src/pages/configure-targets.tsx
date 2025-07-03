import React, { useEffect, useState } from 'react';
import Link from 'next/link';

const DEFAULT_TARGETS = {
  sprintProgress: 10,
  featureStatus: 10,
  teamUtilization: 80,
  codeQuality: 90,
  techDebt: 90,
  crossTeam: 85,
  codeReview: 85,
};

const TARGETS_KEY = 'dashboard_targets';

export default function ConfigureTargets() {
  const [targets, setTargets] = useState(DEFAULT_TARGETS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(TARGETS_KEY);
    if (stored) {
      setTargets(JSON.parse(stored));
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTargets((prev) => ({ ...prev, [name]: Number(value) }));
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem(TARGETS_KEY, JSON.stringify(targets));
    setSaved(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <div className="w-full max-w-md mb-4">
        <Link href="/" className="inline-block bg-slate-200 hover:bg-slate-300 text-slate-800 px-4 py-2 rounded mb-2 font-medium transition">← Back to Home</Link>
      </div>
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4">Configure Dashboard Targets</h1>
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleSave(); }}>
          <div>
            <label className="block text-sm font-medium mb-1">Sprint Progress Target</label>
            <input type="number" name="sprintProgress" value={targets.sprintProgress} onChange={handleChange} className="w-full border rounded px-3 py-2" min={0} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Feature Status Target</label>
            <input type="number" name="featureStatus" value={targets.featureStatus} onChange={handleChange} className="w-full border rounded px-3 py-2" min={0} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Team Utilization Target</label>
            <input type="number" name="teamUtilization" value={targets.teamUtilization} onChange={handleChange} className="w-full border rounded px-3 py-2" min={0} max={100} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Code Quality Target</label>
            <input type="number" name="codeQuality" value={targets.codeQuality} onChange={handleChange} className="w-full border rounded px-3 py-2" min={0} max={100} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tech Debt Resolution Target</label>
            <input type="number" name="techDebt" value={targets.techDebt} onChange={handleChange} className="w-full border rounded px-3 py-2" min={0} max={100} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Cross-Team Collaboration Target</label>
            <input type="number" name="crossTeam" value={targets.crossTeam} onChange={handleChange} className="w-full border rounded px-3 py-2" min={0} max={100} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Code Review Efficiency Target</label>
            <input type="number" name="codeReview" value={targets.codeReview} onChange={handleChange} className="w-full border rounded px-3 py-2" min={0} max={100} />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded mt-4 hover:bg-indigo-700">Save Targets</button>
          {saved && <div className="text-green-600 text-sm mt-2">Targets saved!</div>}
        </form>
      </div>
    </div>
  );
} 