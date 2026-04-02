import React, { createContext, useContext, useState, useEffect } from 'react';

export type ColorScheme = 'light' | 'dark';

interface ThemeContextType {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  toggleColorScheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [colorScheme, setColorScheme] = useState<ColorScheme>(() => {
    const saved = localStorage.getItem('color-scheme');
    return (saved as ColorScheme) || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('color-scheme', colorScheme);

    // Apply theme classes to document
    const root = document.documentElement;
    root.className = `${colorScheme}`;

    // Update CSS custom properties
    root.style.setProperty('--color-scheme', colorScheme);
  }, [colorScheme]);

  const toggleColorScheme = () => {
    setColorScheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{
      colorScheme,
      setColorScheme,
      toggleColorScheme
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
