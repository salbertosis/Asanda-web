import assert from 'node:assert/strict';
import { assertSafeBody, escapeHtml, featuredWindow, renderSafeBody, scheduledStatus, validateImageFile, validateNewsInput } from '../src/services/admin/editorialLogic.js';

let passed = 0;
const check = (name, fn) => { fn(); passed += 1; console.log(`  ok - ${name}`); };

console.log('admin editorial core deterministic regression');
const validNews = { title: 'Campeonato nacional', slug: 'campeonato-nacional', summary: 'Resumen', body: '**Texto** y *detalles* con [enlace](https://asanda.test)', category: 'competencia', publishedAt: '2026-08-01T12:00:00Z' };
check('valid news input is accepted', () => assert.equal(validateNewsInput(validNews).ok, true));
check('title, slug, summary, category, and date boundaries are enforced', () => {
  assert.ok(validateNewsInput({ ...validNews, title: 'ab' }).errors.includes('title-invalid'));
  assert.ok(validateNewsInput({ ...validNews, title: 'x'.repeat(121) }).errors.includes('title-invalid'));
  assert.ok(validateNewsInput({ ...validNews, slug: 'Campeonato' }).errors.includes('slug-invalid'));
  assert.ok(validateNewsInput({ ...validNews, slug: 'doble--guion' }).errors.includes('slug-invalid'));
  assert.ok(validateNewsInput({ ...validNews, slug: '-inicial' }).errors.includes('slug-invalid'));
  assert.ok(validateNewsInput({ ...validNews, summary: 'x'.repeat(281) }).errors.includes('summary-too-long'));
  assert.ok(validateNewsInput({ ...validNews, category: 'x'.repeat(41) }).errors.includes('category-too-long'));
  assert.ok(validateNewsInput({ ...validNews, publishedAt: 'ayer' }).errors.includes('published-at-invalid'));
});
check('future publication date is accepted as scheduling', () => {
  const result = validateNewsInput({ ...validNews, publishedAt: '2030-01-01T00:00:00Z' });
  assert.equal(result.ok, true);
});
check('unsafe body with HTML markup is rejected', () => {
  assert.equal(assertSafeBody('texto <script>alert(1)</script>').ok, false);
  assert.equal(assertSafeBody('texto <b>negrita</b>').ok, false);
  assert.equal(assertSafeBody('cierra > en texto').ok, false);
  assert.ok(validateNewsInput({ ...validNews, body: '<img src=x onerror=alert(1)>' }).errors.includes('body-unsafe'));
});
check('javascript scheme in body is rejected', () => {
  assert.equal(assertSafeBody('mira [x](javascript:alert(1))').ok, false);
  assert.equal(assertSafeBody('mira javascript:alert(1)').ok, false);
});
check('plain text body passes and renders safely', () => {
  assert.equal(assertSafeBody('Texto simple sin marcado').ok, true);
  assert.equal(renderSafeBody('<b>x</b>'), '<p>&lt;b&gt;x&lt;/b&gt;</p>');
  assert.equal(escapeHtml('a & b < c'), 'a &amp; b &lt; c');
});
check('limited markdown renders bold, italic, and http links', () => {
  assert.equal(renderSafeBody('**negrita** y *cursiva*'), '<p><strong>negrita</strong> y <em>cursiva</em></p>');
  assert.equal(renderSafeBody('[texto](https://asanda.test/x)'), '<p><a href="https://asanda.test/x" rel="noopener noreferrer">texto</a></p>');
});
check('non-http links and lists stay inert or structured', () => {
  assert.equal(renderSafeBody('[x](javascript:alert(1))'), '<p>[x](javascript:alert(1))</p>');
  assert.equal(renderSafeBody('- uno\n- dos'), '<ul><li>uno</li><li>dos</li></ul>');
  assert.equal(renderSafeBody('párrafo uno\n\npárrafo dos'), '<p>párrafo uno</p><p>párrafo dos</p>');
});
check('image validation accepts supported images and rejects the rest', () => {
  assert.equal(validateImageFile({ name: 'foto.jpg', type: 'image/jpeg', size: 1024 }).ok, true);
  assert.equal(validateImageFile({ name: 'foto.webp', type: 'image/webp', size: 8 * 1024 * 1024 }).ok, true);
  assert.equal(validateImageFile({ name: 'anim.gif', type: 'image/gif', size: 1024 }).ok, false);
  assert.equal(validateImageFile({ name: 'foto.svg', type: 'image/svg+xml', size: 1024 }).ok, false);
  assert.equal(validateImageFile({ name: 'grande.jpg', type: 'image/jpeg', size: 8 * 1024 * 1024 + 1 }).ok, false);
  assert.equal(validateImageFile({ name: '../foto.jpg', type: 'image/jpeg', size: 1024 }).ok, false);
  assert.equal(validateImageFile(null).ok, false);
});
check('featured windows validate order, uniqueness, and dates', () => {
  const now = new Date('2026-08-18T12:00:00Z');
  const base = [{ athleteId: 'a', displayOrder: 1 }, { athleteId: 'b', displayOrder: 2 }];
  assert.equal(featuredWindow(base, now).ok, true);
  assert.ok(featuredWindow([{ athleteId: 'a', displayOrder: 1 }, { athleteId: 'b', displayOrder: 1 }], now).errors.includes('order-duplicate'));
  assert.ok(featuredWindow([{ athleteId: 'a', displayOrder: 0 }], now).errors.includes('order-invalid'));
  assert.ok(featuredWindow([{ athleteId: 'a', displayOrder: 7 }], now).errors.includes('order-invalid'));
  assert.ok(featuredWindow([{ displayOrder: 1 }], now).errors.includes('athlete-missing'));
  assert.ok(featuredWindow([{ athleteId: 'a', displayOrder: 1, startsAt: 'no-es-fecha' }], now).errors.includes('window-invalid'));
  assert.ok(featuredWindow([{ athleteId: 'a', displayOrder: 1, startsAt: '2026-08-01T00:00:00Z', endsAt: '2026-07-01T00:00:00Z' }], now).errors.includes('window-inverted'));
});
check('featured windows filter by current time without deleting rows', () => {
  const now = new Date('2026-08-18T12:00:00Z');
  const selections = [
    { athleteId: 'activa', displayOrder: 1 },
    { athleteId: 'expirada', displayOrder: 2, startsAt: '2026-08-01T00:00:00Z', endsAt: '2026-08-10T00:00:00Z' },
    { athleteId: 'futura', displayOrder: 3, startsAt: '2026-09-01T00:00:00Z' },
  ];
  const result = featuredWindow(selections, now);
  assert.deepEqual(result.active.map((item) => item.athleteId), ['activa']);
  assert.equal(result.ok, true);
});
check('scheduled status derives draft, scheduled, and published semantics', () => {
  const now = new Date('2026-08-18T12:00:00Z');
  assert.equal(scheduledStatus({ publicationStatus: 'draft' }, now), 'draft');
  assert.equal(scheduledStatus({ publicationStatus: 'published', publishedAt: '2026-08-01T00:00:00Z' }, now), 'published');
  assert.equal(scheduledStatus({ publicationStatus: 'published', publishedAt: '2030-01-01T00:00:00Z' }, now), 'scheduled');
  assert.equal(scheduledStatus({ publicationStatus: 'archived' }, now), 'archived');
});

console.log(`\n${passed} passed`);