"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define a forma do nosso contexto
interface ThemeContextType {
  isDarkMode: boolean;
  toggleTheme: () => void;
}

// Cria o contexto com um valor padrão
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Cria o componente Provider
export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Efeito para carregar o tema na primeira vez que a app abre
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialDarkMode = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setIsDarkMode(initialDarkMode);
    if (initialDarkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // Função para trocar o tema
  const toggleTheme = () => {
    setIsDarkMode(prevMode => {
      const newIsDarkMode = !prevMode;
      localStorage.setItem('theme', newIsDarkMode ? 'dark' : 'light');
      if (newIsDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return newIsDarkMode;
    });
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook customizado para usar o contexto facilmente
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};