'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: (val: boolean) => void;
  location: string;
  updateLocation: (val: string) => void;
  mapsApiKey: string;
  updateMapsApiKey: (val: string) => void;
  hasBillingError: boolean;
  setHasBillingError: (val: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [location, setLocation] = useState('Escritório Central');
  const [hasBillingError, setHasBillingError] = useState(false);
  const [mapsApiKey, setMapsApiKey] = useState(
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyCTfBfDPDjif_Es8txvqsLsjXvH9G8TjrY'
  );

  const toggleDarkMode = (val: boolean) => {
    setIsDarkMode(val);
    if (typeof window !== 'undefined') {
      if (val) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    }
  };

  const updateLocation = (val: string) => {
    setLocation(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('user-location', val);
    }
  };

  const updateMapsApiKey = (val: string) => {
    setMapsApiKey(val);
    setHasBillingError(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('GOOGLE_MAPS_PLATFORM_KEY', val);
      window.dispatchEvent(new CustomEvent('gmp-key-updated', { detail: { key: val } }));
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const savedLocation = localStorage.getItem('user-location');
    const savedMapsKey = localStorage.getItem('GOOGLE_MAPS_PLATFORM_KEY');
    
    let isDark = false;
    if (savedTheme === 'dark') {
      isDark = true;
    } else if (savedTheme === 'light') {
      isDark = false;
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      isDark = true;
    }

    if (isDark) {
      setTimeout(() => setIsDarkMode(true), 0);
      document.documentElement.classList.add('dark');
    } else {
      setTimeout(() => setIsDarkMode(false), 0);
      document.documentElement.classList.remove('dark');
    }

    if (savedLocation) {
      setTimeout(() => setLocation(savedLocation), 0);
    }
    const effectiveKey = savedMapsKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyCTfBfDPDjif_Es8txvqsLsjXvH9G8TjrY';
    if (effectiveKey) {
      setTimeout(() => setMapsApiKey(effectiveKey), 0);
    }

    // Monitor Google Maps auth/billing failures
    const handleMapsError = () => {
      setHasBillingError(true);
    };

    window.addEventListener('gmp-billing-error', handleMapsError);

    const origAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      if (origAuthFailure) {
        try { origAuthFailure(); } catch {}
      }
      setHasBillingError(true);
      window.dispatchEvent(new CustomEvent('gmp-billing-error', { detail: { type: 'gm_authFailure' } }));
    };

    const origConsoleError = console.error;
    console.error = (...args: any[]) => {
      origConsoleError.apply(console, args);
      const str = args.map(a => String(a?.message || a || '')).join(' ');
      if (str.includes('BillingNotEnabledMapError') || str.includes('BillingNotEnabled') || str.includes('billing-not-enabled')) {
        setHasBillingError(true);
        window.dispatchEvent(new CustomEvent('gmp-billing-error', { detail: { type: 'BillingNotEnabledMapError' } }));
      }
    };

    // Listen for system preference changes
    const matchMedia = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        toggleDarkMode(e.matches);
      }
    };
    matchMedia.addEventListener('change', handler);
    return () => {
      matchMedia.removeEventListener('change', handler);
      window.removeEventListener('gmp-billing-error', handleMapsError);
      console.error = origConsoleError;
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, location, updateLocation, mapsApiKey, updateMapsApiKey, hasBillingError, setHasBillingError }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
