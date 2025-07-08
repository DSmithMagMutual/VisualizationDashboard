import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box
} from '@mui/material';

interface ConfigureTargetsDialogProps {
  open: boolean;
  onClose: () => void;
  targets: Record<string, number>;
  onSave: (newTargets: Record<string, number>) => void;
}

const ConfigureTargetsDialog: React.FC<ConfigureTargetsDialogProps> = ({ open, onClose, targets, onSave }) => {
  const [editTargets, setEditTargets] = useState(targets);

  useEffect(() => {
    setEditTargets(targets);
  }, [open, targets]);

  const handleTargetChange = (key: string, value: number) => {
    setEditTargets((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(editTargets);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Configure Targets</DialogTitle>
      <DialogContent>
        <Typography variant="body1" mb={2}>Set your target values for each dashboard metric:</Typography>
        <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {Object.entries(editTargets).map(([key, value]) => (
            <Box key={key} display="flex" alignItems="center" gap={2}>
              <Typography sx={{ minWidth: 180, textTransform: 'capitalize' }}>
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
              </Typography>
              <input
                type="number"
                value={Number(value)}
                min={0}
                style={{ width: 80, fontSize: 16, padding: 4 }}
                onChange={e => handleTargetChange(key, Number(e.target.value))}
              />
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button onClick={handleSave} color="primary" variant="contained">Save</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfigureTargetsDialog; 