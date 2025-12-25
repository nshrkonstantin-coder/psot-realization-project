import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  showGreeting: boolean;
  toggleGreeting: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'dark') || 'dark';
  });

  const [showGreeting, setShowGreeting] = useState<boolean>(() => {
    const saved = localStorage.getItem('showGreeting');
    return saved !== 'false';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('showGreeting', String(showGreeting));
  }, [showGreeting]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const toggleGreeting = () => {
    setShowGreeting(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, showGreeting, toggleGreeting }}>
      {children}
    </ThemeContext.Provider>
  );
};
