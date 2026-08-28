import React from 'react';
import AdSlotFrame from './AdSlotFrame';
import EmptySlotTile from './EmptySlotTile';
import { useAdPlacement } from '../../hooks/useAdPlacement';

// Badge inline para calendario/resultados: inventario rotatorio global,
// sin exclusividad por evento.
const CompetitionSponsorBadge = ({ compact = false }) => {
    const { ad, isEmpty, placement } = useAdPlacement('competition-sponsor');
    if (!placement) return null;
    if (isEmpty || !ad) return <EmptySlotTile placement={placement} compact={compact} />;
    return <AdSlotFrame placement={placement} ad={ad} compact={compact} />;
};

export default CompetitionSponsorBadge;
