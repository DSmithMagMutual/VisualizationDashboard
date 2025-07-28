'use client'

import React from 'react';
import { Box, Button, AppBar, Toolbar, Typography } from '@mui/material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', href: '/' },
    { label: 'Demo', href: '/demo' },
    { label: 'Dependency Graph', href: '/dependency-graph' },
  ];

  return (
    <AppBar position="static" sx={{ backgroundColor: '#1e1e1e', borderBottom: '1px solid #333' }}>
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 0, mr: 4 }}>
          Jira Dashboard
        </Typography>
        <Box sx={{ flexGrow: 1, display: 'flex', gap: 2 }}>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} passHref>
              <Button
                color="inherit"
                sx={{
                  backgroundColor: pathname === item.href ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                }}
              >
                {item.label}
              </Button>
            </Link>
          ))}
        </Box>
      </Toolbar>
    </AppBar>
  );
} 