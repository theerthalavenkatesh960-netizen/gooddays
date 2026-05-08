import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContextApi';
import * as api from '../lib/api';

type Theme = 'light' | 'dark' | 'blue' | 'green' | 'ocean' | 'futuristic';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadTheme();
    }
  }, [user]);

  const loadTheme = async () => {
    if (!user) return;

    try {
      const settings = await api.getUserSettings();
      if (settings?.theme) {
        setThemeState(settings.theme as Theme);
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    }
  };

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);

    if (user) {
      try {
        await api.updateUserSettings({ theme: newTheme });
      } catch (error) {
        console.error('Failed to save theme:', error);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div data-theme={theme}>
        {children}
      </div>
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
