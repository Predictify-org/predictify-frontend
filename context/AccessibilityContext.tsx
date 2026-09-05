'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AccessibilityContextType {
  reduceMotion: boolean;
  disableParallax: boolean;
  disableAutoplay: boolean;
  increaseContrast: boolean;
  setReduceMotion: (value: boolean) => void;
  setDisableParallax: (value: boolean) => void;
  setDisableAutoplay: (value: boolean) => void;
  setIncreaseContrast: (value: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [disableParallax, setDisableParallax] = useState(false);
  const [disableAutoplay, setDisableAutoplay] = useState(false);
  const [increaseContrast, setIncreaseContrast] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReduceMotion(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => {
        setReduceMotion(e.matches);
      };

      mediaQuery.addEventListener?.('change', handleChange);
      return () => mediaQuery.removeEventListener?.('change', handleChange);
    }
  }, []);

  return (
    <AccessibilityContext.Provider
      value={{
        reduceMotion,
        disableParallax,
        disableAutoplay,
        increaseContrast,
        setReduceMotion,
        setDisableParallax,
        setDisableAutoplay,
        setIncreaseContrast,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility(): AccessibilityContextType {
  const context = useContext(AccessibilityContext);
  if (!context) {
    return {
      reduceMotion: false,
      disableParallax: false,
      disableAutoplay: false,
      increaseContrast: false,
      setReduceMotion: () => {},
      setDisableParallax: () => {},
      setDisableAutoplay: () => {},
      setIncreaseContrast: () => {},
    };
  }
  return context;
}
