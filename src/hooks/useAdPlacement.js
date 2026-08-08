import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { resolveAd, resolveAds } from '../services/ads';
import { getPlacement } from '../data/adPlacements';

// Creativo estable durante todo el ciclo de vida de la ruta actual (D2):
// solo cambia cuando cambian placementId o routeKey (navegación/recarga).
export const useAdPlacement = (placementId) => {
    const { pathname } = useLocation();
    const resolution = useMemo(
        () => resolveAd(placementId, { routeKey: pathname }),
        [placementId, pathname]
    );
    return {
        ad: resolution.isEmpty ? null : resolution,
        isEmpty: resolution.isEmpty,
        reason: resolution.reason ?? null,
        placement: resolution.placement ?? null,
        isLoading: false,
    };
};

// Variante para grillas: hasta `count` patrocinadores distintos.
export const useAdPlacements = (placementId, count) => {
    const { pathname } = useLocation();
    const ads = useMemo(
        () => resolveAds(placementId, count, { routeKey: pathname }),
        [placementId, count, pathname]
    );
    return { ads, placement: getPlacement(placementId), isLoading: false };
};
