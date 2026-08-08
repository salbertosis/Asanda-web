import { calendario2025 } from './calendario2025';
import { calendario2026 } from './calendario2026';

// Función helper para obtener calendario por año
export const getCalendarioPorAño = (año) => {
  switch (año) {
    case 2025:
      return calendario2025;
    case 2026:
      return calendario2026;
    default:
      return [];
  }
};

// Exportar todo el calendario
export const todoElCalendario = [
  ...calendario2025,
  ...calendario2026,
];


