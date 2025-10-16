import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { loadIterations, saveIterations, type IterationsConfig } from '../lib/iterationsService';

interface AppState {
  selectedDataSource: string;
  teamFilter: string[];
  setSelectedDataSource: (dataSource: string) => void;
  setTeamFilter: (teams: string[]) => void;
  resetSelections: () => void;
  iterations: IterationsConfig;
  setIterations: (iters: IterationsConfig) => void;
  saveIterationsConfig: (iters: IterationsConfig) => Promise<void>;
}

const AppStateContext = createContext<AppState | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [selectedDataSource, setSelectedDataSource] = useState<string>('');
  const [teamFilter, setTeamFilter] = useState<string[]>([]);
  const [iterations, setIterations] = useState<IterationsConfig>([
    { key: '4.1', label: '2025 Iteration 4.1', startDate: '2025-07-09', endDate: '2025-07-22' },
    { key: '4.2', label: '2025 Iteration 4.2', startDate: '2025-07-23', endDate: '2025-08-05' },
    { key: '4.3', label: '2025 Iteration 4.3', startDate: '2025-08-06', endDate: '2025-08-19' },
    { key: '4.4', label: '2025 Iteration 4.4', startDate: '2025-08-20', endDate: '2025-09-02' },
    { key: '4.5IP', label: '2025 Iteration 4.5IP', startDate: '2025-09-03', endDate: '2025-09-16' },
    { key: 'uncommitted', label: 'Uncommitted' }
  ]);

  useEffect(() => {
    (async () => {
      const loaded = await loadIterations();
      if (loaded && Array.isArray(loaded) && loaded.length > 0) {
        setIterations(loaded);
      }
    })();
  }, []);

  const saveIterationsConfig = async (iters: IterationsConfig) => {
    setIterations(iters);
    await saveIterations(iters);
  };

  const resetSelections = () => {
    setSelectedDataSource('');
    setTeamFilter([]);
  };

  const value: AppState = {
    selectedDataSource,
    teamFilter,
    setSelectedDataSource,
    setTeamFilter,
    resetSelections,
    iterations,
    setIterations,
    saveIterationsConfig,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
} 