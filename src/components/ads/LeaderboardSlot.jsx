import React from 'react';
import AdSlotFrame from './AdSlotFrame';
import EmptySlotTile from './EmptySlotTile';
import { useAdPlacement } from '../../hooks/useAdPlacement';

// Responsivo: tarjeta compacta < 768px, banner de ancho completo >= 768px
// (ver SLOT_LAYOUT_STYLES / SLOT_DIMENSION_STYLES en AdSlotFrame).
const LeaderboardSlot = () => {
    const { ad, isEmpty, placement } = useAdPlacement('leaderboard');
    if (!placement) return null;
    if (isEmpty || !ad) return <EmptySlotTile placement={placement} />;
    return <AdSlotFrame placement={placement} ad={ad} />;
};

export default LeaderboardSlot;
