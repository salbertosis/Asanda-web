export const TITLE_MIN = 3;
export const TITLE_MAX = 120;
export const SUMMARY_LIMIT = 280;
export const BODY_LIMIT = 20000;
export const CATEGORY_LIMIT = 40;
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
export const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export function validateNewsInput(input) {
  const errors = [];
  const title = typeof input?.title === 'string' ? input.title.trim() : '';
  if (title.length < TITLE_MIN || title.length > TITLE_MAX) errors.push('title-invalid');
  const slug = typeof input?.slug === 'string' ? input.slug.trim() : '';
  if (!SLUG_PATTERN.test(slug)) errors.push('slug-invalid');
  const summary = typeof input?.summary === 'string' ? input.summary.trim() : '';
  if (summary.length > SUMMARY_LIMIT) errors.push('summary-too-long');
  const category = typeof input?.category === 'string' ? input.category.trim() : '';
  if (category.length > CATEGORY_LIMIT) errors.push('category-too-long');
  const body = typeof input?.body === 'string' ? input.body : '';
  if (body.length > BODY_LIMIT) errors.push('body-too-long');
  if (body && !assertSafeBody(body).ok) errors.push('body-unsafe');
  if (input?.publishedAt !== undefined && input.publishedAt !== null) {
    if (typeof input.publishedAt !== 'string' || Number.isNaN(Date.parse(input.publishedAt))) errors.push('published-at-invalid');
  }
  return { ok: errors.length === 0, errors };
}

export function assertSafeBody(body) {
  if (/[<>]/.test(body)) return { ok: false, reason: 'html-forbidden' };
  if (/javascript\s*:/i.test(body)) return { ok: false, reason: 'scheme-forbidden' };
  return { ok: true };
}

export function escapeHtml(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function renderSafeBody(body) {
  if (!body) return '';
  const escaped = escapeHtml(body)
    .replace(/\[([^\[\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return escaped.split(/\n\s*\n/).map((paragraph) => {
    const lines = paragraph.split('\n');
    if (lines.every((line) => /^-\s+/.test(line))) {
      return `<ul>${lines.map((line) => `<li>${line.replace(/^-\s+/, '')}</li>`).join('')}</ul>`;
    }
    return `<p>${lines.join('<br>')}</p>`;
  }).join('');
}

export function validateImageFile(file) {
  if (!file || typeof file !== 'object') return { ok: false, error: 'file-missing' };
  const name = typeof file.name === 'string' ? file.name : '';
  if (!name || /[\\/]/.test(name) || !IMAGE_EXTENSIONS.has(name.slice(name.lastIndexOf('.')).toLowerCase())) return { ok: false, error: 'name-invalid' };
  if (!IMAGE_TYPES.has(file.type)) return { ok: false, error: 'type-unsupported' };
  if (typeof file.size !== 'number' || file.size <= 0 || file.size > IMAGE_MAX_BYTES) return { ok: false, error: 'size-invalid' };
  return { ok: true };
}

export function featuredWindow(selections, now = new Date()) {
  const errors = [];
  const seenOrder = new Set();
  for (const item of selections ?? []) {
    const order = item?.displayOrder;
    if (!Number.isInteger(order) || order < 1 || order > 6) errors.push('order-invalid');
    else if (seenOrder.has(order)) errors.push('order-duplicate');
    else seenOrder.add(order);
    if (!item?.athleteId || typeof item.athleteId !== 'string') errors.push('athlete-missing');
    for (const key of ['startsAt', 'endsAt']) {
      if (item?.[key] !== undefined && item[key] !== null && (typeof item[key] !== 'string' || Number.isNaN(Date.parse(item[key])))) errors.push('window-invalid');
    }
    if (item?.startsAt && item?.endsAt && Date.parse(item.startsAt) >= Date.parse(item.endsAt)) errors.push('window-inverted');
  }
  const active = (selections ?? []).filter((item) => {
    if (!item.startsAt || Date.parse(item.startsAt) <= now.getTime()) {
      return !item.endsAt || Date.parse(item.endsAt) > now.getTime();
    }
    return false;
  });
  return { ok: errors.length === 0, errors, active };
}

export function scheduledStatus(article, now = new Date()) {
  if (!article?.publicationStatus || article.publicationStatus === 'archived') return 'archived';
  if (article.publicationStatus !== 'published') return 'draft';
  return article.publishedAt && Date.parse(article.publishedAt) > now.getTime() ? 'scheduled' : 'published';
}