'use client'

import React from 'react';
import { Box, Button, AppBar, Toolbar, Typography } from '@mui/material';
import { usePathname, useRouter } from 'next/navigation';
import LoadingSpinner from './LoadingSpinner';
import { usePageLoading } from '../hooks/usePageLoading';

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, startLoading } = usePageLoading();

  const navItems = [
    { label: 'Dashboard', href: '/demo' },
    { label: 'Dependency Graph', href: '/dependency-graph' },
  ];

  const handleNavigation = (href: string) => {
    if (href !== pathname) {
      startLoading();
      router.push(href);
    }
  };

  return (
    <>
      <AppBar position="static" sx={{ backgroundColor: '#1e1e1e', borderBottom: '1px solid #333' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 0, mr: 4 }}>
            Jira Dashboard
          </Typography>
          <Box sx={{ flexGrow: 1, display: 'flex', gap: 2 }}>
            {navItems.map((item) => (
              <Button
                key={item.href}
                color="inherit"
                onClick={() => handleNavigation(item.href)}
                sx={{
                  backgroundColor: pathname === item.href ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
        </Toolbar>
      </AppBar>
      {isLoading && <LoadingSpinner message="Loading page..." />}
    </>
  );
} 