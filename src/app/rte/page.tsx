'use client'

import React from 'react';
import { Box, Typography } from '@mui/material';
import FeatureProgressWidget from '@/components/widgets/FeatureProgressWidget';
import { useBoard, BoardProvider } from '@/components/BoardContext';

function BoardSwitcher() {
  const { boards, selectedBoards, toggleBoard, addBoard } = useBoard();
  const [open, setOpen] = React.useState(false);
  const [newName, setNewName] = React.useState('');
  const [newId, setNewId] = React.useState('');
  const [newProjectKey, setNewProjectKey] = React.useState('');
  
  return (
    <Box display="flex" alignItems="center" gap={2} mb={3}>
      <Typography variant="h6" sx={{ color: '#212529', fontWeight: 700 }}>
        Boards:
      </Typography>
      <Box display="flex" flexWrap="wrap" gap={1}>
        {boards.map(board => {
          const isSelected = selectedBoards.some(b => b.id === board.id);
          return (
            <button
              key={board.id}
              onClick={() => toggleBoard(board)}
              style={{ 
                padding: '6px 12px', 
                borderRadius: 8, 
                background: isSelected ? '#6C63FF' : '#ffffff',
                color: isSelected ? '#ffffff' : '#212529',
                border: `1px solid ${isSelected ? '#6C63FF' : '#dee2e6'}`,
                fontWeight: 600, 
                cursor: 'pointer',
                fontSize: 14
              }}
              aria-label={`${isSelected ? 'Deselect' : 'Select'} ${board.name}`}
            >
              {board.name}
            </button>
          );
        })}
      </Box>
      <button
        onClick={() => setOpen(true)}
        style={{ 
          marginLeft: 8, 
          padding: '6px 12px', 
          borderRadius: 8, 
          background: '#6C63FF', 
          color: '#fff', 
          border: 'none', 
          fontWeight: 600, 
          cursor: 'pointer' 
        }}
        aria-label="Add board"
      >
        + Add Board
      </button>
      {open && (
        <div role="dialog" aria-modal="true" style={{ 
          background: '#ffffff', 
          color: '#212529', 
          padding: 24, 
          borderRadius: 12, 
          position: 'absolute', 
          top: 80, 
          left: '50%', 
          transform: 'translateX(-50%)', 
          zIndex: 10, 
          minWidth: 320,
          border: '1px solid #dee2e6',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          <Typography variant="h6" sx={{ mb: 2, color: '#212529' }}>Add Board</Typography>
          <input
            aria-label="Board name"
            placeholder="Board name/key"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={{ 
              width: '100%', 
              marginBottom: 12, 
              padding: 8, 
              borderRadius: 6, 
              border: '1px solid #dee2e6', 
              background: '#ffffff', 
              color: '#212529' 
            }}
          />
          <input
            aria-label="Board ID"
            placeholder="Board ID"
            value={newId}
            onChange={e => setNewId(e.target.value)}
            style={{ 
              width: '100%', 
              marginBottom: 12, 
              padding: 8, 
              borderRadius: 6, 
              border: '1px solid #dee2e6', 
              background: '#ffffff', 
              color: '#212529' 
            }}
          />
          <input
            aria-label="Project Key"
            placeholder="Project Key (e.g., JPP, CAD)"
            value={newProjectKey}
            onChange={e => setNewProjectKey(e.target.value)}
            style={{ 
              width: '100%', 
              marginBottom: 12, 
              padding: 8, 
              borderRadius: 6, 
              border: '1px solid #dee2e6', 
              background: '#ffffff', 
              color: '#212529' 
            }}
          />
          <Box display="flex" gap={2}>
            <button
              onClick={() => {
                if (newName && newId && newProjectKey) {
                  addBoard({ name: newName, id: Number(newId), projectKey: newProjectKey });
                  setNewName('');
                  setNewId('');
                  setNewProjectKey('');
                  setOpen(false);
                }
              }}
              style={{ 
                padding: '6px 16px', 
                borderRadius: 8, 
                background: '#6C63FF', 
                color: '#fff', 
                border: 'none', 
                fontWeight: 600, 
                cursor: 'pointer' 
              }}
              aria-label="Save board"
            >
              Save
            </button>
            <button
              onClick={() => setOpen(false)}
              style={{ 
                padding: '6px 16px', 
                borderRadius: 8, 
                background: '#6c757d', 
                color: '#fff', 
                border: 'none', 
                fontWeight: 600, 
                cursor: 'pointer' 
              }}
              aria-label="Cancel add board"
            >
              Cancel
            </button>
          </Box>
        </div>
      )}
    </Box>
  );
}

function FeatureProgressDashboardContent() {
  return (
    <main style={{ padding: 32, backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <Box maxWidth="1350" mx="auto">
        <Typography variant="h4" sx={{ color: '#212529', fontWeight: 700, mb: 2 }}>
          Feature Progress Dashboard
        </Typography>
        <Typography variant="body1" sx={{ color: '#6c757d', mb: 4 }}>
          Track the progress of features (Epics/Features) based on the completion of their associated stories.
        </Typography>
        <BoardSwitcher />
        <FeatureProgressWidget />
      </Box>
    </main>
  );
}

export default function FeatureProgressDashboardPage() {
  return (
    <BoardProvider>
      <FeatureProgressDashboardContent />
    </BoardProvider>
  );
} 