'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

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

  // Load theme from localStorage and user profile
  useEffect(() => {
    setMounted(true);
    
    // First check localStorage
    const storedTheme = localStorage.getItem('theme') as Theme;
    if (storedTheme && ['light', 'dark', 'system'].includes(storedTheme)) {
      setThemeState(storedTheme);
      return;
    }

    // Then check if user is logged in and fetch their preference
    const loadUserTheme = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/user/profile', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const userData = await response.json();
          if (userData.theme) {
            setThemeState(userData.theme);
            localStorage.setItem('theme', userData.theme);
          }
        }
      } catch (error) {
        console.error('Failed to load user theme preference:', error);
      }
    };

    loadUserTheme();
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;
    
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('light', 'dark');
    
    // Apply appropriate theme class
    if (theme === 'system') {
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme, systemTheme, mounted]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    
    // Update user profile
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch('/api/user/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ theme: newTheme })
        });
      }
    } catch (error) {
      console.error('Failed to update theme preference:', error);
    }
  };

  // Get the actual resolved theme
  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  const value: ThemeContextType = {
    theme,
    resolvedTheme,
    setTheme
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Return safe defaults during SSR/hydration
    return {
      theme: 'system' as const,
      resolvedTheme: 'light' as const,
      setTheme: () => {}
    };
  }
  return context;
}