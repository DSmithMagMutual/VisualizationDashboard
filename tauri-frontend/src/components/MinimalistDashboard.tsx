import React, { useState, useEffect, createContext, useContext } from 'react';
import { ArrowUp, ArrowDown, ChevronDown, ChevronUp, AlertCircle, RefreshCw } from 'lucide-react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Divider,
  CircularProgress,
  Paper,
  Tabs,
  Tab,
  Stack,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { loadAllDataSources } from '../lib/dataService';

interface WidgetError {
  message: string;
  retry?: () => void;
}

const ErrorWidget = ({ title, error, onRetry }: { title: string; error: WidgetError; onRetry?: () => void }) => {
  return (
    <Card sx={{ mb: 1.5, maxWidth: 420, mx: 'auto', borderLeft: '4px solid #f44336', bgcolor: '#fff', boxShadow: 1 }}>
      <CardContent sx={{ p: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
          <Box display="flex" alignItems="center" gap={1}>
            <AlertCircle color="#f44336" size={18} />
            <Typography variant="subtitle1" color="error" fontWeight={600}>{title}</Typography>
          </Box>
          {onRetry && (
            <Button onClick={onRetry} size="small" startIcon={<RefreshCw size={14} />} color="primary" variant="outlined">
              Retry
            </Button>
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" mb={0.5} fontSize={13}>{error.message}</Typography>
        <Paper variant="outlined" sx={{ p: 1, bgcolor: '#fafafa' }}>
          <Typography variant="caption" color="text.secondary" fontSize={12}>
            This widget is temporarily unavailable. Other widgets should continue to function normally.
          </Typography>
        </Paper>
      </CardContent>
    </Card>
  );
};

const MetricCard = ({ title, current, target, trend, status, isDummyData = false, children }: {
  title: string;
  current: number;
  target: number;
  trend: 'up' | 'down';
  status: 'green' | 'yellow' | 'red';
  isDummyData?: boolean;
  children: React.ReactNode;
}) => {
  const [expanded, setExpanded] = useState(false);
  const statusColors: Record<string, string> = {
    green: '#4caf50',
    yellow: '#ffb300',
    red: '#f44336',
  };
  const getStatusIcon = () => (
    trend === 'up' ? <ArrowUp color="#4caf50" size={20} /> : <ArrowDown color="#f44336" size={20} />
  );
  return (
    <Card sx={{ mb: 2, maxWidth: 420, mx: 'auto' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
          <Box>
            <Typography variant="h6">{title}</Typography>
            {isDummyData && <Chip label="Demo Data" size="small" sx={{ mt: 0.5 }} />}
          </Box>
          <Box width={16} height={16} borderRadius={8} bgcolor={statusColors[status]} />
        </Box>
        <Box display="flex" justifyContent="space-between" alignItems="flex-end" mb={2}>
          <Box>
            <Typography variant="caption" color="text.secondary">Current</Typography>
            <Typography variant="h4">{current}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Target</Typography>
            <Typography variant="h6">{target}</Typography>
          </Box>
          <Box display="flex" alignItems="center">{getStatusIcon()}</Box>
        </Box>
        <Button size="small" color="primary" onClick={() => setExpanded(e => !e)} endIcon={expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />} sx={{ mb: expanded ? 2 : 0 }}>
          {expanded ? 'Hide details' : 'Show details'}
        </Button>
        {expanded && <Divider sx={{ my: 2 }} />}
        {expanded && children}
      </CardContent>
    </Card>
  );
};

const getTargets = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('dashboard_targets');
    if (stored) return JSON.parse(stored);
  }
  return {
    sprintProgress: 10,
    featureStatus: 10,
    teamUtilization: 80,
    codeQuality: 90,
    techDebt: 90,
    crossTeam: 85,
    codeReview: 85,
  };
};

// Board context for managing boards and active board
const defaultBoards = [
  { name: 'JPP', id: 634 },
  { name: 'ADVICE', id: 1164 },
];

const BoardContext = createContext({
  boards: defaultBoards,
  activeBoard: defaultBoards[0],
  setActiveBoard: (_b: any) => {},
  addBoard: (_b: any) => {},
});

export function useBoard() {
  return useContext(BoardContext);
}

function BoardProvider({ children }: { children: React.ReactNode }) {
  const [boards, setBoards] = useState(defaultBoards);
  const [activeBoard, setActiveBoard] = useState(defaultBoards[0]);
  const addBoard = (board: { name: string; id: number }) => {
    setBoards((prev) => [...prev, board]);
    setActiveBoard(board);
  };
  return (
    <BoardContext.Provider value={{ boards, activeBoard, setActiveBoard, addBoard }}>
      {children}
    </BoardContext.Provider>
  );
}

function BoardSwitcher() {
  const { boards, activeBoard, setActiveBoard, addBoard } = useBoard();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newId, setNewId] = useState('');
  return (
    <Box display="flex" alignItems="center" gap={2} mb={3}>
      <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>
        Board:
      </Typography>
      <select
        aria-label="Select board"
        value={activeBoard.id}
        onChange={e => {
          const b = boards.find(b => b.id === Number(e.target.value));
          if (b) setActiveBoard(b);
        }}
        style={{ padding: 8, borderRadius: 8, fontSize: 16 }}
      >
        {boards.map(b => (
          <option key={b.id} value={b.id}>{b.name} (ID: {b.id})</option>
        ))}
      </select>
      <button
        onClick={() => setOpen(true)}
        style={{ marginLeft: 8, padding: '6px 12px', borderRadius: 8, background: '#6C63FF', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
        aria-label="Add board"
      >
        + Add Board
      </button>
      {open && (
        <div role="dialog" aria-modal="true" style={{ background: '#23293A', color: '#fff', padding: 24, borderRadius: 12, position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 10, minWidth: 320 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Add Board</Typography>
          <input
            aria-label="Board name"
            placeholder="Board name/key"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={{ width: '100%', marginBottom: 12, padding: 8, borderRadius: 6, border: '1px solid #444', background: '#181C24', color: '#fff' }}
          />
          <input
            aria-label="Board ID"
            placeholder="Board ID"
            value={newId}
            onChange={e => setNewId(e.target.value)}
            style={{ width: '100%', marginBottom: 12, padding: 8, borderRadius: 6, border: '1px solid #444', background: '#181C24', color: '#fff' }}
          />
          <Box display="flex" gap={2}>
            <button
              onClick={() => {
                if (newName && newId) {
                  addBoard({ name: newName, id: Number(newId) });
                  setNewName('');
                  setNewId('');
                  setOpen(false);
                }
              }}
              style={{ padding: '6px 16px', borderRadius: 8, background: '#6C63FF', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
              aria-label="Save board"
            >
              Save
            </button>
            <button
              onClick={() => setOpen(false)}
              style={{ padding: '6px 16px', borderRadius: 8, background: '#444', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
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

const MinimalistDashboard = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [targets] = useState(getTargets());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await loadAllDataSources();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Tab labels
  const tabLabels = ['Overview', 'Team Performance', 'Delivery Metrics'];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <ErrorWidget title="Dashboard Error" error={{ message: error }} />
      </Box>
    );
  }

  return (
    <Box minHeight="100vh" bgcolor="#f6f7fb">
      {/* Dashboard Header */}
      <Paper elevation={0} square sx={{ borderBottom: 1, borderColor: 'divider', mb: 0, bgcolor: '#fff' }}>
        <Box maxWidth="md" mx="auto" px={2} py={4}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="h4" fontWeight={700} gutterBottom>Jira Dashboard</Typography>
              <Typography variant="caption" color="text.secondary">Updated: {new Date().toLocaleDateString()}</Typography>
            </Box>
            <Stack direction="row" spacing={2} alignItems="center">
              <Paper elevation={0} sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#f0f4f8' }}>
                <Typography fontWeight={500} color="text.secondary">Overall Score</Typography>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Typography variant="h5" color="success.main" fontWeight={700}>
                    85%
                  </Typography>
                  <ArrowUp color="#4caf50" size={16} />
                </Box>
              </Paper>
              <Chip label="Good" color="success" size="small" />
            </Stack>
          </Box>
          <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mt: 2 }} textColor="primary" indicatorColor="primary">
            {tabLabels.map((label) => (
              <Tab key={label} label={label} sx={{ fontWeight: 500, fontSize: 16, minWidth: 160 }} />
            ))}
          </Tabs>
        </Box>
      </Paper>
      <Box maxWidth="lg" mx="auto" px={2} py={5}>
        <BoardSwitcher />
        {activeTab === 0 && (
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={3}>
                <MetricCard
                  title="Sprint Progress"
                  current={75}
                  target={targets.sprintProgress}
                  trend="up"
                  status="green"
                  isDummyData
                >
                  <Typography variant="body2" color="text.secondary">Current sprint completion rate.</Typography>
                </MetricCard>
                <MetricCard
                  title="Feature Status"
                  current={8}
                  target={targets.featureStatus}
                  trend="up"
                  status="green"
                  isDummyData
                >
                  <Typography variant="body2" color="text.secondary">Features completed this sprint.</Typography>
                </MetricCard>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={3}>
                <MetricCard
                  title="Team Utilization"
                  current={82}
                  target={targets.teamUtilization}
                  trend="up"
                  status="green"
                  isDummyData
                >
                  <Typography variant="body2" color="text.secondary">Team capacity utilization.</Typography>
                </MetricCard>
                <MetricCard
                  title="Code Quality"
                  current={87}
                  target={targets.codeQuality}
                  trend="up"
                  status="green"
                  isDummyData
                >
                  <Typography variant="body2" color="text.secondary">Code quality metrics score.</Typography>
                </MetricCard>
              </Stack>
            </Grid>
          </Grid>
        )}
        {activeTab === 1 && (
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 8 }}>
              <MetricCard
                title="Team Performance"
                current={85}
                target={90}
                trend="up"
                status="yellow"
                isDummyData
              >
                <Typography variant="body2" color="text.secondary">Overall team performance metrics.</Typography>
              </MetricCard>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <MetricCard
                title="Code Review Efficiency"
                current={78}
                target={targets.codeReview}
                trend="up"
                status="yellow"
                isDummyData
              >
                <Typography variant="body2" color="text.secondary">Avg. time to review and merge PRs.</Typography>
              </MetricCard>
            </Grid>
          </Grid>
        )}
        {activeTab === 2 && (
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={3}>
                <MetricCard 
                  title="Sprint Velocity" 
                  current={12}
                  target={15}
                  trend="up"
                  status="green"
                  isDummyData
                >
                  <Typography variant="body2" color="text.secondary">Story points completed this sprint.</Typography>
                </MetricCard>
                <MetricCard 
                  title="Bug Resolution Time" 
                  current={2.5}
                  target={1.5}
                  trend="down"
                  status="red"
                  isDummyData
                >
                  <Typography variant="body2" color="text.secondary">Average days to resolve bugs.</Typography>
                </MetricCard>
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Stack spacing={3}>
                <MetricCard 
                  title="Delivery Metrics" 
                  current={92}
                  target={95}
                  trend="up"
                  status="green"
                  isDummyData
                >
                  <Typography variant="body2" color="text.secondary">On-time delivery percentage.</Typography>
                </MetricCard>
                <MetricCard 
                  title="Cross-team Collaboration" 
                  current={88}
                  target={targets.crossTeam}
                  trend="up"
                  status="green"
                  isDummyData
                >
                  <Typography variant="body2" color="text.secondary">Cross-team collaboration effectiveness.</Typography>
                </MetricCard>
              </Stack>
            </Grid>
          </Grid>
        )}
      </Box>
    </Box>
  );
};

export default function DashboardWithBoardProvider() {
  return (
    <BoardProvider>
      <MinimalistDashboard />
    </BoardProvider>
  );
} 