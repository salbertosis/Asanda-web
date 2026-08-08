import React from 'react';
import AdSlotFrame from './AdSlotFrame';
import EmptySlotTile from './EmptySlotTile';
import { useAdPlacement } from '../../hooks/useAdPlacement';

const HeroSponsorSlot = () => {
    const { ad, isEmpty, placement } = useAdPlacement('hero-sponsor');
    if (!placement) return null;
    if (isEmpty || !ad) return <EmptySlotTile placement={placement} />;
    return <AdSlotFrame placement={placement} ad={ad} />;
};

export default HeroSponsorSlot;
