import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useDarkMode } from '../hooks/useDarkMode';

const DarkModeToggle = () => {
  const [isDarkMode, toggleDarkMode] = useDarkMode();

  return (
    <button
      onClick={toggleDarkMode}
      className="fixed top-20 right-4 z-50 p-3 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
      aria-label={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
      title={isDarkMode ? 'Modo claro' : 'Modo oscuro'}
    >
      {isDarkMode ? (
        <Sun className="text-yellow-500" size={20} />
      ) : (
        <Moon className="text-gray-700" size={20} />
      )}
    </button>
  );
};

export default DarkModeToggle;


