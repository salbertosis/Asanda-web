const placeholderPattern = /placeholder|example|localhost|127\.0\.0\.1|facebook\.com(?:\/)?$|twitter\.com(?:\/)?$|instagram\.com(?:\/)?$|youtube\.com(?:\/)?$|natacionestadal|av\. principal|\+58 212/i;
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isApproved = (value) => value === true;
const parseUrl = (value) => { if (typeof value !== 'string') return null; try { return new URL(value); } catch { return null; } };
const isHttpsUrl = (value) => { const url = parseUrl(value); return Boolean(url && url.protocol === 'https:' && !url.username && !url.password); };
export const isCanonicalOrigin = (value) => { const url = parseUrl(value); return Boolean(url && isHttpsUrl(value) && url.pathname === '/' && !url.search && !url.hash && !placeholderPattern.test(value)); };
export const normalizeCanonicalOrigin = (value) => (isCanonicalOrigin(value) ? parseUrl(value).origin : null);
const isApprovedText = (entry) => isRecord(entry) && isApproved(entry.approved) && typeof entry.value === 'string' && entry.value.trim().length > 0 && !placeholderPattern.test(entry.value);
export const isSameOriginAsset = (asset, origin) => { if (typeof asset !== 'string') return false; try { const url = new URL(asset, origin); const localPath = asset.startsWith('/') && !asset.startsWith('//'); return url.origin === origin && !url.username && !url.password && (localPath || url.protocol === 'https:'); } catch { return false; } };
export const toPublicUrl = (pathname, origin) => { const safeOrigin = normalizeCanonicalOrigin(origin); return safeOrigin && typeof pathname === 'string' ? `${safeOrigin}/${pathname.replace(/^\//, '')}` : null; };

export const publicSite = {
  canonicalOrigin: '', canonicalOriginApproved: false,
  identity: { value: '', approved: false }, copyright: { notice: '', approved: false },
  social: [], legal: { legalApproved: false, privacyApproved: false }, criticalAssets: [],
};

export function validatePublicSite(site = publicSite) {
  const candidate = isRecord(site) ? site : {};
  const issues = [];
  const canonicalOrigin = isApproved(candidate.canonicalOriginApproved) ? normalizeCanonicalOrigin(candidate.canonicalOrigin) : null;
  if (!canonicalOrigin) issues.push('canonicalOrigin');
  const identity = isApprovedText(candidate.identity) ? candidate.identity : null;
  if (!identity) issues.push('identity');
  const copyrightSource = isRecord(candidate.copyright) ? candidate.copyright : null;
  const copyright = isApprovedText(copyrightSource && { value: copyrightSource.notice, approved: copyrightSource.approved }) ? candidate.copyright : null;
  if (!copyright) issues.push('copyright');
  const socialValues = Array.isArray(candidate.social) ? candidate.social : null;
  const social = socialValues?.filter((entry) => isRecord(entry) && isApproved(entry.approved) && isHttpsUrl(entry.href) && !placeholderPattern.test(entry.href)) ?? [];
  if (!socialValues || social.length !== socialValues.length) issues.push('social');
  const assetValues = Array.isArray(candidate.criticalAssets) ? candidate.criticalAssets : null;
  const criticalAssets = canonicalOrigin && assetValues ? assetValues.filter((asset) => isSameOriginAsset(asset, canonicalOrigin)) : [];
  if (!assetValues || criticalAssets.length !== assetValues.length) issues.push('criticalAssets');
  const legalSource = isRecord(candidate.legal) ? candidate.legal : {};
  const legal = { legalApproved: isApproved(legalSource.legalApproved), privacyApproved: isApproved(legalSource.privacyApproved) };
  if (!legal.legalApproved || !legal.privacyApproved) issues.push('legal');
  return { issues, safeSite: { ...candidate, canonicalOrigin, canonicalOriginApproved: Boolean(canonicalOrigin), identity, copyright, social, criticalAssets, legal } };
}

export const approvedPublicSite = validatePublicSite().safeSite;
