import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import * as sponsorCatalog from '../src/data/sponsors.js';
import { campaigns } from '../src/data/campaigns.js';
import {
    getSponsorBySlug,
    isActive,
    resolveAd,
    resolveAds,
    validateSponsors,
} from '../src/services/ads.js';

const checks = [];
const check = (name, callback) => {
    callback();
    checks.push(name);
};

const cloneSponsor = (sponsor, changes = {}) => ({
    ...sponsor,
    creative: { ...sponsor.creative },
    ...changes,
});

check('rejects Speedo Demo despite demo markers', () => {
    const speedo = cloneSponsor(sponsorCatalog.sponsors[0], {
        id: 'speedo-1',
        slug: 'speedo-demo',
        name: 'Speedo Demo',
    });
    assert.equal(validateSponsors([speedo]).length, 0);
});

check('rejects altered approved identities', () => {
    for (const changes of [
        { name: 'AQUAFLOW Spoof Demo' },
        { slug: 'aquaflow-spoof-demo' },
    ]) {
        assert.equal(validateSponsors([cloneSponsor(sponsorCatalog.sponsors[0], changes)]).length, 0);
    }
});

check('rejects an unknown id copying an approved identity', () => {
    const unknown = cloneSponsor(sponsorCatalog.sponsors[0], { id: 'unknown-1' });
    assert.equal(validateSponsors([unknown]).length, 0);
});

check('rejects mixed sponsor identity fields', () => {
    const mixed = cloneSponsor(sponsorCatalog.sponsors[0], {
        slug: sponsorCatalog.sponsors[1].slug,
        name: sponsorCatalog.sponsors[1].name,
        category: sponsorCatalog.sponsors[1].category,
    });
    assert.equal(validateSponsors([mixed]).length, 0);
});

check('accepts all four versioned approved fixtures', () => {
    assert.equal(sponsorCatalog.SPONSOR_CATALOG_VERSION, 'v1');
    assert.equal(sponsorCatalog.APPROVED_SPONSOR_IDENTITIES.length, 4);
    assert.deepEqual(
        validateSponsors(sponsorCatalog.sponsors).map(({ id, slug, name, category }) => ({ id, slug, name, category })),
        sponsorCatalog.APPROVED_SPONSOR_IDENTITIES
    );
});

check('keeps approved sponsor creatives deployment-controlled', () => {
    for (const sponsor of sponsorCatalog.sponsors) {
        assert.match(sponsor.creative.url, /^\/assets\/sponsors\/[a-z0-9-]+\.svg$/);
        assert.equal(existsSync(new URL(`../public${sponsor.creative.url}`, import.meta.url)), true);
    }
});

check('warns and never throws for malformed entries', () => {
    const originalWarn = console.warn;
    const warnings = [];
    let result;
    try {
        console.warn = (...args) => warnings.push(args);
        assert.doesNotThrow(() => {
            result = validateSponsors([null, {}]);
        });
    } finally {
        console.warn = originalWarn;
    }
    assert.deepEqual(result, []);
    assert.equal(warnings.length, 2);
    assert.equal(warnings[0][0], '[ads]');
});

check('preserves internal sponsor destinations', () => {
    const ad = resolveAd('hero-sponsor', { routeKey: '/home', loadSeed: 'contract' });
    assert.equal(ad.destination, `/publicidad/demo/${getSponsorBySlug(ad.sponsor.slug).slug}`);
    assert.equal(ad.destination.startsWith('http'), false);
});

check('preserves same-view stability', () => {
    const context = { routeKey: '/home', loadSeed: 'stable' };
    assert.deepEqual(resolveAd('leaderboard', context), resolveAd('leaderboard', context));
    assert.deepEqual(resolveAds('partner-grid', 4, context), resolveAds('partner-grid', 4, context));
});

check('preserves reload-seed variation', () => {
    const ids = new Set(
        Array.from({ length: 32 }, (_, index) =>
            resolveAd('hero-sponsor', { routeKey: '/home', loadSeed: `reload-${index}` }).sponsor.id
        )
    );
    assert.ok(ids.size > 1);
});

check('preserves empty and expired campaign behavior', () => {
    const empty = resolveAd('hero-sponsor', { today: '2100-01-01', loadSeed: 'expired' });
    assert.equal(empty.isEmpty, true);
    assert.equal(empty.reason, 'no-active-campaigns');
    assert.deepEqual(resolveAds('partner-grid', 4, { today: '2100-01-01' }), []);
    assert.equal(isActive(campaigns[0], '2100-01-01'), false);
});

check('preserves grid stability and variation', () => {
    const baseline = resolveAds('partner-grid', 4, { routeKey: '/home', loadSeed: 'grid-0' });
    const variants = new Set(
        Array.from({ length: 32 }, (_, index) =>
            JSON.stringify(resolveAds('partner-grid', 4, { routeKey: '/home', loadSeed: `grid-${index}` }))
        )
    );
    assert.equal(baseline.length, 4);
    assert.ok(variants.size > 1);
});

check('keeps ad rotation free of timers and storage', () => {
    const source = readFileSync(new URL('../src/services/ads.js', import.meta.url), 'utf8');
    assert.doesNotMatch(source, /\b(?:setInterval|setTimeout|localStorage)\b/);
});

console.log(`ads regression: ${checks.length}/${checks.length} passed`);
