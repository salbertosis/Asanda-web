import React from 'react';
import AdSlotFrame from './AdSlotFrame';
import EmptySlotTile from './EmptySlotTile';
import { useAdPlacements } from '../../hooks/useAdPlacement';

const GRID_CELLS = 4;

// Grilla de aliados para el footer: 4 celdas; los huecos sin campaña
// activa muestran el fallback "Espacio disponible".
const PartnerGridSlot = () => {
    const { ads, placement } = useAdPlacements('partner-grid', GRID_CELLS);
    if (!placement) return null;
    const cells = [...ads];
    while (cells.length < GRID_CELLS) cells.push(null);

    return (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {cells.map((ad, index) =>
                ad ? (
                    <AdSlotFrame key={ad.sponsor.id} placement={placement} ad={ad} />
                ) : (
                    <EmptySlotTile key={`empty-${index}`} placement={placement} />
                )
            )}
        </div>
    );
};

export default PartnerGridSlot;
