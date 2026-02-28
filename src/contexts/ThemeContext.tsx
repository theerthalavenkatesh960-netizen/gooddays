import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContextApi';

type Theme = 'light' | 'dark' | 'blue' | 'green' | 'ocean';

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
      const theme = localStorage.getItem(`theme_${user.id}`);
      if (theme) {
        setThemeState(theme as Theme);
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    }
  };

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);

    if (user) {
      try {
        localStorage.setItem(`theme_${user.id}`, newTheme);
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
