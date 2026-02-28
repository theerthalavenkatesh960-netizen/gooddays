import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

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

    const { data } = await supabase
      .from('user_profiles')
      .select('theme')
      .eq('id', user.id)
      .maybeSingle();

    if (data?.theme) {
      setThemeState(data.theme as Theme);
    }
  };

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);

    if (user) {
      await supabase
        .from('user_profiles')
        .update({ theme: newTheme })
        .eq('id', user.id);
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
