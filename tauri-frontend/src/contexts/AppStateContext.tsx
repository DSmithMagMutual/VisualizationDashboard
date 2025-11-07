import { createContext, useContext, useState, type ReactNode } from 'react';

interface AppState {
  selectedDataSource: string;
  teamFilter: string[];
  assigneeFilter: string[];
  setSelectedDataSource: (dataSource: string) => void;
  setTeamFilter: (teams: string[]) => void;
  setAssigneeFilter: (assignees: string[]) => void;
  resetSelections: () => void;
}

const AppStateContext = createContext<AppState | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [selectedDataSource, setSelectedDataSource] = useState<string>('');
  const [teamFilter, setTeamFilter] = useState<string[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]);

  const resetSelections = () => {
    setSelectedDataSource('');
    setTeamFilter([]);
    setAssigneeFilter([]);
  };

  const value: AppState = {
    selectedDataSource,
    teamFilter,
    assigneeFilter,
    setSelectedDataSource,
    setTeamFilter,
    setAssigneeFilter,
    resetSelections,
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