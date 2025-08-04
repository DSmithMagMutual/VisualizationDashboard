'use client'

import React, { createContext, useContext, useState } from 'react';

// BoardContext type definition
export const BoardContext = createContext<{
  boards: Array<{ name: string; id: number; projectKey: string }>;
  selectedBoards: Array<{ name: string; id: number; projectKey: string }>;
  activeBoard: { name: string; id: number; projectKey: string };
  setSelectedBoards: (boards: Array<{ name: string; id: number; projectKey: string }>) => void;
  setActiveBoard: (board: { name: string; id: number; projectKey: string }) => void;
  addBoard: (board: { name: string; id: number; projectKey: string }) => void;
  toggleBoard: (board: { name: string; id: number; projectKey: string }) => void;
} | null>(null);

// useBoard hook
export function useBoard() {
  const context = useContext(BoardContext);
  if (!context) {
    throw new Error('useBoard must be used within a BoardProvider');
  }
  return context;
}

// BoardProvider component (updated for multiselect with compatibility)
export function BoardProvider({ children }: { children: React.ReactNode }) {
  // Remove 'Other' from defaultBoards and selectedBoards
  const defaultBoards = [
    { name: 'Hogwarts Express', id: 1070, projectKey: 'ADVICE' },
    { name: 'Feature Freight', id: 1164, projectKey: 'ADVICE' },
    { name: 'CAD', id: 1069, projectKey: 'ADVICE' }
  ];
  const [boards, setBoards] = useState(defaultBoards);
  const [selectedBoards, setSelectedBoards] = useState([
    { name: 'Hogwarts Express', id: 1070, projectKey: 'ADVICE' }
  ]);

  // For compatibility with existing widgets, provide activeBoard as the first selected board
  const activeBoard = selectedBoards.length > 0 ? selectedBoards[0] : { name: '', id: 0, projectKey: '' };
  const setActiveBoard = (board: { name: string; id: number; projectKey: string }) => {
    setSelectedBoards([board]);
  };

  const addBoard = (board: { name: string; id: number; projectKey: string }) => {
    setBoards(prev => [...prev, board]);
  };

  const toggleBoard = (board: { name: string; id: number; projectKey: string }) => {
    setSelectedBoards(prev => {
      const isSelected = prev.some(b => b.id === board.id);
      if (isSelected) {
        return prev.filter(b => b.id !== board.id);
      } else {
        return [...prev, board];
      }
    });
  };

  return (
    <BoardContext.Provider value={{ 
      boards, 
      selectedBoards, 
      activeBoard,
      setSelectedBoards, 
      setActiveBoard,
      addBoard, 
      toggleBoard 
    }}>
      {children}
    </BoardContext.Provider>
  );
} 