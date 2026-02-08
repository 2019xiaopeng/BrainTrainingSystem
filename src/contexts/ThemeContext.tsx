import { createContext, useContext, useEffect, type ReactNode } from 'react';

// ============================================================
// Theme System - Fixed Light (Zen) Theme
// Theme switching removed per design decision — single Zen aesthetic
// ============================================================

export type ThemeMode = 'light';

interface ThemeContextValue {
  theme: ThemeMode;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Always use light theme
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-dark', 'theme-warm');
    root.classList.add('theme-light');
    root.setAttribute('data-theme', 'light');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: 'light' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
