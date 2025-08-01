import { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Button, Box, IconButton, Tooltip, Slider } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import DemoPage from './components/DemoPage';
import DependencyGraphPage from './components/DependencyGraphPage';
import JiraConfigDialog from './components/JiraConfigDialog';

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

function Navigation({ onOpenSettings }: { onOpenSettings: () => void }) {
  const [zoomLevel, setZoomLevel] = useState(100); // Start at 100%

  // Function to apply zoom and update state
  const applyZoom = (newZoom: number) => {
    const roundedZoom = Math.round(newZoom);
    setZoomLevel(roundedZoom);
    const zoomFactor = roundedZoom / 100;
    
    // Apply zoom only to the content area, not the navigation
    const contentArea = document.getElementById('content-area');
    if (contentArea) {
      contentArea.style.transform = `scale(${zoomFactor})`;
      contentArea.style.transformOrigin = 'top left';
      
      // Allow horizontal expansion like a regular webpage
      // Remove width constraint to let content expand naturally
      contentArea.style.width = 'auto';
      contentArea.style.minWidth = `${100 / zoomFactor}%`;
      
      // Adjust top padding to account for zoom level
      const navHeight = 64; // Navigation bar height
      const adjustedPadding = navHeight / zoomFactor;
      contentArea.style.paddingTop = `${adjustedPadding}px`;
    }
  };

  const handleZoomChange = (_event: Event, newValue: number | number[]) => {
    const zoom = Math.round(newValue as number);
    applyZoom(zoom);
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(Math.round(zoomLevel + 10), 150);
    applyZoom(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(Math.round(zoomLevel - 10), 50);
    applyZoom(newZoom);
  };

  // Expose zoom functions globally for keyboard shortcuts
  useEffect(() => {
    (window as any).updateZoomLevel = setZoomLevel;
    (window as any).applyZoom = applyZoom;
    (window as any).currentZoomLevel = zoomLevel;
  }, [zoomLevel]);

  // Initialize zoom on component mount
  useEffect(() => {
    // Small delay to ensure content area is available
    setTimeout(() => {
      applyZoom(zoomLevel);
    }, 100);
  }, []);

      return (
      <AppBar position="static" sx={{ 
        backgroundColor: '#fff', 
        color: '#212529', 
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        transform: 'none !important',
        borderBottom: '1px solid #e0e0e0'
      }}>
        <Toolbar sx={{ 
          minHeight: '64px !important', 
          height: '64px',
          px: 3,
          justifyContent: 'space-between'
        }}>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700, color: '#6C63FF', minWidth: 'fit-content' }}>
          Jira Dashboard
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
          <Button 
            color="inherit" 
            component={Link} 
            to="/"
            sx={{ 
              color: '#6C63FF', 
              fontWeight: 700,
              minWidth: 'fit-content',
              px: 2,
              py: 1,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '0.9rem',
              backgroundColor: 'rgba(108, 99, 255, 0.08)',
              '&:hover': { 
                backgroundColor: 'rgba(108, 99, 255, 0.12)',
                color: '#6C63FF'
              }
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
              fontWeight: 600,
              minWidth: 'fit-content',
              px: 2,
              py: 1,
              borderRadius: 2,
              textTransform: 'none',
              fontSize: '0.9rem',
              '&:hover': { 
                backgroundColor: 'rgba(108, 99, 255, 0.08)',
                color: '#6C63FF'
              }
            }}
          >
            Dependency Graph
          </Button>
          
          {/* Zoom Controls */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1, 
            ml: 3, 
            minWidth: '220px',
            backgroundColor: '#f8f9fa',
            borderRadius: 2,
            px: 2,
            py: 0.5,
            border: '1px solid #e9ecef'
          }}>
            <Tooltip title="Zoom Out">
              <IconButton
                onClick={handleZoomOut}
                disabled={zoomLevel <= 50}
                size="small"
                sx={{ 
                  color: '#6c757d',
                  '&:hover': { 
                    backgroundColor: 'rgba(108, 99, 255, 0.1)',
                    color: '#6C63FF'
                  },
                  '&.Mui-disabled': {
                    color: '#dee2e6'
                  }
                }}
              >
                <ZoomOutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            
            <Slider
              value={zoomLevel}
              onChange={handleZoomChange}
              min={50}
              max={150}
              step={10}
              sx={{
                width: 100,
                '& .MuiSlider-thumb': {
                  width: 18,
                  height: 18,
                  backgroundColor: '#6C63FF',
                  border: '2px solid #fff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                  marginTop: '-7px', // Center the thumb on the track
                  '&:hover': {
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  }
                },
                '& .MuiSlider-track': {
                  height: 4,
                  backgroundColor: '#6C63FF',
                  borderRadius: 2,
                },
                '& .MuiSlider-rail': {
                  height: 4,
                  backgroundColor: '#e9ecef',
                  borderRadius: 2,
                }
              }}
            />
            
            <Tooltip title="Zoom In">
              <IconButton
                onClick={handleZoomIn}
                disabled={zoomLevel >= 150}
                size="small"
                sx={{ 
                  color: '#6c757d',
                  '&:hover': { 
                    backgroundColor: 'rgba(108, 99, 255, 0.1)',
                    color: '#6C63FF'
                  },
                  '&.Mui-disabled': {
                    color: '#dee2e6'
                  }
                }}
              >
                <ZoomInIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            
            <Typography variant="caption" sx={{ 
              color: '#495057', 
              minWidth: '35px', 
              textAlign: 'center',
              fontWeight: 600,
              fontSize: '0.75rem'
            }}>
              {Math.round(zoomLevel)}%
            </Typography>
            
            <Tooltip title="Reset Zoom">
              <IconButton
                onClick={() => applyZoom(100)}
                disabled={zoomLevel === 100}
                size="small"
                sx={{ 
                  color: '#6c757d',
                  '&:hover': { 
                    backgroundColor: 'rgba(108, 99, 255, 0.1)',
                    color: '#6C63FF'
                  },
                  '&.Mui-disabled': {
                    color: '#dee2e6'
                  }
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>
                  100%
                </Typography>
              </IconButton>
            </Tooltip>
          </Box>
          
          <Tooltip title="Jira Settings">
            <IconButton
              onClick={onOpenSettings}
              sx={{ 
                color: '#6c757d',
                backgroundColor: '#f8f9fa',
                border: '1px solid #e9ecef',
                borderRadius: 2,
                ml: 1,
                '&:hover': { 
                  backgroundColor: 'rgba(108, 99, 255, 0.1)',
                  color: '#6C63FF',
                  borderColor: '#6C63FF'
                }
              }}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleConfigSaved = (config: any) => {
    console.log('Jira configuration saved:', config);
    // You can add additional logic here, like refreshing data
  };

  // Add keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case '=':
          case '+':
            event.preventDefault();
            // Zoom in
            if ((window as any).updateZoomLevel && (window as any).applyZoom) {
              const currentZoom = Math.round((window as any).currentZoomLevel || 100);
              const newZoomIn = Math.min(currentZoom + 10, 150);
              (window as any).applyZoom(newZoomIn);
            }
            break;
          case '-':
            event.preventDefault();
            // Zoom out
            if ((window as any).updateZoomLevel && (window as any).applyZoom) {
              const currentZoom = Math.round((window as any).currentZoomLevel || 100);
              const newZoomOut = Math.max(currentZoom - 10, 50);
              (window as any).applyZoom(newZoomOut);
            }
            break;
          case '0':
            event.preventDefault();
            // Reset zoom
            if ((window as any).applyZoom) {
              (window as any).applyZoom(100);
            }
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Navigation onOpenSettings={() => setSettingsOpen(true)} />
        <Box id="content-area" sx={{ pt: '64px', minHeight: '100vh' }}> {/* Add padding for fixed navigation */}
          <Routes>
            <Route path="/" element={<DemoPage />} />
            <Route path="/dependency-graph" element={<DependencyGraphPage />} />
          </Routes>
        </Box>
        <JiraConfigDialog
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          onConfigSaved={handleConfigSaved}
        />
      </Router>
    </ThemeProvider>
  );
}

export default App;
