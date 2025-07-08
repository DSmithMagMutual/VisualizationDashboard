"use client";
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { Inter } from 'next/font/google';
import React from 'react';

const inter = Inter({ subsets: ['latin'] });

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#181C24',
      paper: '#23293A',
    },
    primary: {
      main: '#6C63FF',
    },
    secondary: {
      main: '#00C9A7',
    },
    text: {
      primary: '#fff',
      secondary: '#B0B8C1',
    },
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: inter.style.fontFamily,
    h6: {
      fontWeight: 700,
      fontSize: 18,
    },
    body2: {
      color: '#B0B8C1',
    },
  },
});

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
} 