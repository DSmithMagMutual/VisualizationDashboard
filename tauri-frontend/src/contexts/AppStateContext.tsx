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
  const [selectedDataSource, setSelectedDataSource] = useState<string>('board-saveAdvice-PI5');
  const [teamFilter, setTeamFilter] = useState<string[]>([]);
  const [iterations, setIterations] = useState<IterationsConfig>([
    { key: '5.1', label: '2025 Iteration 5.1', startDate: '2025-09-17', endDate: '2025-09-30' },
    { key: '5.2', label: '2025 Iteration 5.2', startDate: '2025-10-01', endDate: '2025-10-14' },
    { key: '5.3', label: '2025 Iteration 5.3', startDate: '2025-10-15', endDate: '2025-10-28' },
    { key: '5.4', label: '2025 Iteration 5.4', startDate: '2025-10-29', endDate: '2025-11-11' },
    { key: '5.5IP', label: '2025 Iteration 5.5IP', startDate: '2025-11-12', endDate: '2025-11-25' },
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