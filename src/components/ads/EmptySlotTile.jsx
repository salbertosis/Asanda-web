import React from 'react';
import { SLOT_DIMENSION_STYLES } from './AdSlotFrame';

// Fallback de inventario vacío: mismas dimensiones reservadas que el slot
// activo (anti-CLS), sin enlace, sin badge y sin disclosure (spec).
const EmptySlotTile = ({ placement, className = '', compact = false }) => (
    <div
        role="complementary"
        aria-label="Espacio publicitario disponible"
        className={`flex items-center justify-center border-2 border-dashed border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-dark-surface ${compact ? 'h-[72px] min-h-[72px] max-h-[72px] w-full max-w-none border-x-0 sm:h-20 sm:min-h-20 sm:max-h-20' : SLOT_DIMENSION_STYLES[placement.id] ?? ''} ${className}`}
    >
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Espacio disponible
        </p>
    </div>
);

export default EmptySlotTile;
