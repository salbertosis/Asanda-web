import React from 'react';
import { SLOT_DIMENSION_STYLES } from './AdSlotFrame';

// Fallback de inventario vacío: mismas dimensiones reservadas que el slot
// activo (anti-CLS), sin enlace, sin badge y sin disclosure (spec).
const EmptySlotTile = ({ placement, className = '' }) => (
    <div
        role="complementary"
        aria-label="Espacio publicitario disponible"
        className={`flex items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-dark-surface ${SLOT_DIMENSION_STYLES[placement.id] ?? ''} ${className}`}
    >
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Espacio disponible
        </p>
    </div>
);

export default EmptySlotTile;
