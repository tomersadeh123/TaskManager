'use client';

import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system');
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');

  // Get system theme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Load theme from localStorage on initial load
  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as Theme;
    if (storedTheme && ['light', 'dark', 'system'].includes(storedTheme)) {
      setTheme(storedTheme);
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    // Apply appropriate theme class
    if (theme === 'system') {
      // Let CSS media query handle system theme
      if (systemTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.add('light');
      }
    } else {
      root.classList.add(theme);
    }
  }, [theme, systemTheme]);

  const changeTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Also update user profile if user is logged in
    updateUserThemePreference(newTheme);
  };

  const updateUserThemePreference = async (newTheme: Theme) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ theme: newTheme })
      });
    } catch (error) {
      console.error('Failed to update theme preference:', error);
    }
  };

  // Get the actual resolved theme (useful for UI)
  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  return {
    theme,
    resolvedTheme,
    setTheme: changeTheme,
    systemTheme
  };
}