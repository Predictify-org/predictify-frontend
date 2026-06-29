'use client';

import React, { useEffect, useState } from 'react';
import { setTheme } from '../utils/theme-noflash';

type ThemeMode = 'light' | 'dark' | 'system';

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>('system');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem('streampay-theme');
      if (stored === 'light' || stored === 'dark') {
        setMode(stored);
      } else {
        setMode('system');
      }
    } catch (e) {
      setMode('system');
    }
  }, []);

  useEffect(() => {
    if (mode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = (e: MediaQueryListEvent) => {
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(e.matches ? 'dark' : 'light');
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [mode]);

  const handleChange = (newMode: ThemeMode) => {
    setMode(newMode);
    
    if (newMode === 'system') {
      try {
        window.localStorage.removeItem('streampay-theme');
      } catch (e) {}
      
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.classList.add(prefersDark ? 'dark' : 'light');
    } else {
      setTheme(newMode);
    }
  };

  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Theme selection">
      <label className="theme-toggle__label">
        <input 
          type="radio" 
          name="theme" 
          value="light" 
          checked={mode === 'light'} 
          onChange={() => handleChange('light')}
          className="theme-toggle__input"
        />
        <span>Light</span>
      </label>
      <label className="theme-toggle__label">
        <input 
          type="radio" 
          name="theme" 
          value="dark" 
          checked={mode === 'dark'} 
          onChange={() => handleChange('dark')}
          className="theme-toggle__input"
        />
        <span>Dark</span>
      </label>
      <label className="theme-toggle__label">
        <input 
          type="radio" 
          name="theme" 
          value="system" 
          checked={mode === 'system'} 
          onChange={() => handleChange('system')}
          className="theme-toggle__input"
        />
        <span>System</span>
      </label>
    </div>
  );
}
