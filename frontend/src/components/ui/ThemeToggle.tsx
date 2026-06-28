import React from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { spring } from '../../lib/motion';

const ThemeToggle: React.FC = () => {
  const { colorScheme, toggleColorScheme } = useTheme();
  const isDark = colorScheme === 'dark';

  return (
    <motion.button
      onClick={toggleColorScheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`
        relative w-14 h-7 rounded-full p-1 flex items-center
        transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
        ${isDark ? 'bg-primary/30 justify-end' : 'bg-primary/15 justify-start'}
      `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.span
        layout
        transition={spring.snappy}
        className={`
          flex h-5 w-5 items-center justify-center rounded-full shadow-e1
          ${isDark ? 'bg-background text-yellow-400' : 'bg-white text-emerald-500'}
        `}
      >
        {isDark ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
      </motion.span>
    </motion.button>
  );
};

export default ThemeToggle;
