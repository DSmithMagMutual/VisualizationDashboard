import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import DashboardWithBoardProvider from './components/MinimalistDashboard';
import DemoPage from './components/DemoPage';
import DependencyGraphPage from './components/DependencyGraphPage';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#6C63FF',
    },
    secondary: {
      main: '#f50057',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
});

function Navigation() {
  return (
    <AppBar position="static" sx={{ backgroundColor: '#fff', color: '#212529', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700, color: '#6C63FF' }}>
          Jira Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            color="inherit" 
            component={Link} 
            to="/"
            sx={{ 
              color: '#212529', 
              fontWeight: 500,
              '&:hover': { backgroundColor: 'rgba(108, 99, 255, 0.1)' }
            }}
          >
            Dashboard
          </Button>
          <Button 
            color="inherit" 
            component={Link} 
            to="/demo"
            sx={{ 
              color: '#212529', 
              fontWeight: 500,
              '&:hover': { backgroundColor: 'rgba(108, 99, 255, 0.1)' }
            }}
          >
            Demo Board
          </Button>
          <Button 
            color="inherit" 
            component={Link} 
            to="/dependency-graph"
            sx={{ 
              color: '#212529', 
              fontWeight: 500,
              '&:hover': { backgroundColor: 'rgba(108, 99, 255, 0.1)' }
            }}
          >
            Dependency Graph
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Navigation />
        <Routes>
          <Route path="/" element={<DashboardWithBoardProvider />} />
          <Route path="/demo" element={<DemoPage />} />
          <Route path="/dependency-graph" element={<DependencyGraphPage />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
