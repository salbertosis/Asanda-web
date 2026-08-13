import React from 'react';
import AdSlotFrame from './AdSlotFrame';
import EmptySlotTile from './EmptySlotTile';
import { useAdPlacements } from '../../hooks/useAdPlacement';

const GRID_CELLS = 4;

// Franja de aliados para el footer: los huecos sin campaña activa
// conservan el espacio reservado con el fallback institucional.
const PartnerGridSlot = () => {
    const { ads, placement } = useAdPlacements('partner-grid', GRID_CELLS);
    if (!placement) return null;
    const cells = [...ads];
    while (cells.length < GRID_CELLS) cells.push(null);

    return (
        <div className="flex max-w-full gap-4 overflow-x-auto pb-2" aria-label="Patrocinadores demo">
            {cells.map((ad, index) =>
                ad ? (
                    <div key={ad.sponsor.id} className="w-[210px] shrink-0 sm:w-[230px] lg:min-w-0 lg:flex-1">
                        <AdSlotFrame placement={placement} ad={ad} imageOnly />
                    </div>
                ) : (
                    <div key={`empty-${index}`} className="w-[210px] shrink-0 sm:w-[230px] lg:min-w-0 lg:flex-1">
                        <EmptySlotTile placement={placement} />
                    </div>
                )
            )}
        </div>
    );
};

export default PartnerGridSlot;
