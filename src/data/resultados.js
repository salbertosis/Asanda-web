import { resultados2025 } from './resultados2025';
import { resultados2026 } from './resultados2026';

// Función helper para obtener resultados por año
export const getResultadosPorAño = (año) => {
  switch (año) {
    case 2025:
      return resultados2025;
    case 2026:
      return resultados2026;
    default:
      return [];
  }
};

// Exportar todos los resultados
export const todosLosResultados = [
  ...resultados2025,
  ...resultados2026,
];


