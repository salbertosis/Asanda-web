import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';

const DarkModeToggle = () => {
  const [isDarkMode, toggleDarkMode] = useDarkMode();

  return (
    <button
      onClick={toggleDarkMode}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-sm transition-colors hover:bg-asanda-foam dark:bg-gray-800/90 dark:text-yellow-500 dark:hover:bg-gray-700"
      aria-label={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
      title={isDarkMode ? 'Modo claro' : 'Modo oscuro'}
    >
      {isDarkMode ? (
        <Sun size={20} aria-hidden="true" />
      ) : (
        <Moon size={20} aria-hidden="true" />
      )}
    </button>
  );
};

export default DarkModeToggle;
