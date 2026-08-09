// Seam de resolución de publicidad demo (diseño D2, D5, D8).
// Sin temporizadores, sin almacenamiento local, sin llamadas a redes
// publicitarias: todos los datos provienen de fixtures locales.
// Extensiones .js explícitas: permiten la verificación directa con Node ESM
// (tasks.md 1.x) sin afectar la resolución de Vite.
import {
    APPROVED_SPONSOR_IDENTITIES,
    sponsors,
    SPONSOR_CATEGORIES,
} from '../data/sponsors.js';
import { campaigns } from '../data/campaigns.js';
import { getPlacement } from '../data/adPlacements.js';

const SLUG_PATTERN = /^[a-z0-9-]+$/;
const DEMO_BADGE_VALUES = new Set(['demo', 'ejemplo']);
const DEMO_NAME_PATTERN = /\b(?:demo|ejemplo)\b/i;
const DEMO_SLUG_PATTERN = /-(?:demo|ejemplo)$/i;

const warnSkipped = (index, missing) => {
    console.warn('[ads]', 'Skipping malformed entry', { index, missing });
};

const hasApprovedIdentity = (entry) =>
    APPROVED_SPONSOR_IDENTITIES.some(
        (identity) =>
            identity.id === entry?.id &&
            identity.slug === entry?.slug &&
            identity.name === entry?.name &&
            identity.category === entry?.category
    );

// Filtra entradas malformadas al cargar el módulo; nunca lanza errores (D5).
export const validateSponsors = (entries) => {
    if (!Array.isArray(entries)) return [];
    return entries.filter((entry, index) => {
        const missing = [];
        if (!entry?.id) missing.push('id');
        if (!entry?.name) missing.push('name');
        if (!entry?.slug || !SLUG_PATTERN.test(entry.slug)) missing.push('slug');
        if (!entry?.creative?.url) missing.push('creative.url');
        if (!SPONSOR_CATEGORIES.includes(entry?.category)) missing.push('category');
        if (!DEMO_BADGE_VALUES.has(entry?.badge)) missing.push('badge');
        if (!DEMO_NAME_PATTERN.test(entry?.name ?? '')) missing.push('name.demo');
        if (!DEMO_SLUG_PATTERN.test(entry?.slug ?? '')) missing.push('slug.demo');
        if (!hasApprovedIdentity(entry)) missing.push('approved-identity');
        if (missing.length > 0) {
            warnSkipped(index, missing);
            return false;
        }
        return true;
    });
};

export const validateCampaigns = (entries, validSponsorList) => {
    if (!Array.isArray(entries)) return [];
    const sponsorIds = new Set(validSponsorList.map((sponsor) => sponsor.id));
    return entries.filter((entry, index) => {
        const missing = [];
        if (!entry?.id) missing.push('id');
        if (!entry?.sponsorId || !sponsorIds.has(entry.sponsorId)) missing.push('sponsorId');
        if (!entry?.placementId || !getPlacement(entry.placementId)) missing.push('placementId');
        const start = new Date(entry?.startDate);
        const end = new Date(entry?.endDate);
        if (Number.isNaN(start.getTime())) missing.push('startDate');
        if (Number.isNaN(end.getTime())) missing.push('endDate');
        if (missing.length === 0 && end < start) missing.push('endDate<startDate');
        if (missing.length > 0) {
            warnSkipped(index, missing);
            return false;
        }
        return true;
    });
};

export const isActive = (campaign, today = new Date()) => {
    const start = new Date(campaign?.startDate);
    const end = new Date(campaign?.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
    const reference = today instanceof Date ? today : new Date(today);
    if (Number.isNaN(reference.getTime())) return false;
    return start <= reference && reference <= end;
};

const validSponsors = validateSponsors(sponsors);
const validCampaigns = validateCampaigns(campaigns, validSponsors);

// Identidad efímera de esta carga: cambia al recargar el módulo, pero permanece
// estable durante todo el ciclo de vida de la página (D2).
const createLoadSeed = () => {
    if (globalThis.crypto?.getRandomValues) {
        const values = new Uint32Array(2);
        globalThis.crypto.getRandomValues(values);
        return `${values[0]}:${values[1]}`;
    }
    return Math.random().toString(36).slice(2);
};

const loadSeed = createLoadSeed();

// Contador de carga: solo incrementa en la primera resolución de cada placement.
let loadCounter = 0;
const countedPlacements = new Set();

const hash = (value) => {
    let result = 5381;
    for (let index = 0; index < value.length; index += 1) {
        result = ((result << 5) + result + value.charCodeAt(index)) >>> 0;
    }
    return result;
};

const referenceDateFrom = (today) =>
    today !== undefined ? new Date(today) : new Date();

const activeCampaignsFor = (placementId, referenceDate) =>
    validCampaigns.filter(
        (campaign) => campaign.placementId === placementId && isActive(campaign, referenceDate)
    );

const sponsorForCampaign = (campaign) =>
    validSponsors.find((sponsor) => sponsor.id === campaign.sponsorId) ?? null;

const buildResolution = (placement, campaign, sponsor) => ({
    isEmpty: false,
    placement,
    campaign,
    sponsor,
    destination: `/publicidad/demo/${sponsor.slug}`,
});

export const resolveAd = (
    placementId,
    { routeKey = 'default', today, loadSeed: requestedLoadSeed = loadSeed } = {}
) => {
    const placement = getPlacement(placementId);
    if (!placement) {
        console.warn('[ads]', 'Unknown placement', { placementId });
        return { isEmpty: true, reason: 'unknown-placement', placement: null };
    }
    if (!countedPlacements.has(placementId)) {
        loadCounter += 1;
        countedPlacements.add(placementId);
    }
    const active = activeCampaignsFor(placementId, referenceDateFrom(today));
    if (active.length === 0) {
        return { isEmpty: true, reason: 'no-active-campaigns', placement };
    }
    const pick = hash(`${placementId}:${routeKey}:${requestedLoadSeed}:${loadCounter}`) % active.length;
    const campaign = active[pick];
    const sponsor = sponsorForCampaign(campaign);
    if (!sponsor) {
        console.warn('[ads]', 'Unresolvable sponsor for campaign', { campaignId: campaign.id });
        return { isEmpty: true, reason: 'unresolvable-sponsor', placement };
    }
    return buildResolution(placement, campaign, sponsor);
};

// Variante para grillas: hasta `count` patrocinadores distintos, rotando de
// forma determinista desde el índice base. No toca loadCounter.
export const resolveAds = (
    placementId,
    count,
    { routeKey = 'default', today, loadSeed: requestedLoadSeed = loadSeed } = {}
) => {
    const placement = getPlacement(placementId);
    if (!placement) {
        console.warn('[ads]', 'Unknown placement', { placementId });
        return [];
    }
    const active = activeCampaignsFor(placementId, referenceDateFrom(today));
    if (active.length === 0 || count <= 0) return [];
    const base = hash(`${placementId}:${routeKey}:${requestedLoadSeed}:grid`) % active.length;
    const seen = new Set();
    const resolved = [];
    for (let offset = 0; offset < active.length && resolved.length < count; offset += 1) {
        const campaign = active[(base + offset) % active.length];
        const sponsor = sponsorForCampaign(campaign);
        if (!sponsor || seen.has(sponsor.id)) continue;
        seen.add(sponsor.id);
        resolved.push(buildResolution(placement, campaign, sponsor));
    }
    return resolved;
};

export const getSponsorBySlug = (slug) =>
    validSponsors.find((sponsor) => sponsor.slug === slug) ?? null;
