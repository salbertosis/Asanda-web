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
  // loose < and > are now allowed as text (not tags)
  assert.equal(assertSafeBody('la temperatura bajó < 20°').ok, true);
  assert.equal(assertSafeBody('me gusta <3').ok, true);
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
  // relative URLs and mailto now supported
  assert.equal(renderSafeBody('[texto](/noticias/otra-nota)'), '<p><a href="/noticias/otra-nota" rel="noopener noreferrer">texto</a></p>');
  assert.equal(renderSafeBody('[contacto](mailto:test@asanda.org.ve)'), '<p><a href="mailto:test@asanda.org.ve" rel="noopener noreferrer">contacto</a></p>');
});
check('non-http links and lists stay inert or structured', () => {
  assert.equal(renderSafeBody('[x](javascript:alert(1))'), '<p>[x](javascript:alert(1))</p>');
  assert.equal(renderSafeBody('- uno\n- dos'), '<ul><li>uno</li><li>dos</li></ul>');
  assert.equal(renderSafeBody('párrafo uno\n\npárrafo dos'), '<p>párrafo uno</p><p>párrafo dos</p>');
});
check('single line breaks remain prose while blank lines create paragraphs', () => {
  assert.equal(
    renderSafeBody('La primera oración termina aquí.\nLa segunda continúa sin alterar la puntuación.\n\nEste es otro párrafo.'),
    '<p>La primera oración termina aquí. La segunda continúa sin alterar la puntuación.</p><p>Este es otro párrafo.</p>',
  );
  assert.equal(renderSafeBody('línea sin punto\nsiguiente línea'), '<p>línea sin punto siguiente línea</p>');
});
check('headings and blockquotes render as safe standalone blocks', () => {
  assert.equal(
    renderSafeBody('## Título **seguro**\n\n### Apartado\n\n> Primera línea\n> segunda con *énfasis*.'),
    '<h2>Título <strong>seguro</strong></h2><h3>Apartado</h3><blockquote><p>Primera línea segunda con <em>énfasis</em>.</p></blockquote>',
  );
  assert.equal(renderSafeBody('## <img src=x>'), '<h2>&lt;img src=x&gt;</h2>');
  assert.equal(renderSafeBody('Texto\n## no es otro bloque'), '<p>Texto ## no es otro bloque</p>');
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
check('featured windows validate athletes and dates without carrying order', () => {
  const now = new Date('2026-08-18T12:00:00Z');
  const result = featuredWindow([{ athleteId: 'a', displayOrder: 999 }], now);
  assert.equal(result.ok, true);
  assert.equal(Object.hasOwn(result.active[0], 'displayOrder'), false);
  assert.ok(featuredWindow([{}], now).errors.includes('athlete-missing'));
  assert.ok(featuredWindow([{ athleteId: 'a', startsAt: 'no-es-fecha' }], now).errors.includes('window-invalid'));
  assert.ok(featuredWindow([{ athleteId: 'a', startsAt: '2026-08-01T00:00:00Z', endsAt: '2026-07-01T00:00:00Z' }], now).errors.includes('window-inverted'));
});
check('featured windows filter by current time without deleting rows', () => {
  const now = new Date('2026-08-18T12:00:00Z');
  const selections = [
    { athleteId: 'activa' },
    { athleteId: 'expirada', startsAt: '2026-08-01T00:00:00Z', endsAt: '2026-08-10T00:00:00Z' },
    { athleteId: 'futura', startsAt: '2026-09-01T00:00:00Z' },
  ];
  const result = featuredWindow(selections, now);
  assert.deepEqual(result.active.map((item) => item.athleteId), ['activa']);
  assert.equal(result.ok, true);
});
check('featured windows returns empty active when validation fails', () => {
  const now = new Date('2026-08-18T12:00:00Z');
  const selections = [{ athleteId: 'a', startsAt: 'fecha-inválida' }];
  const result = featuredWindow(selections, now);
  assert.equal(result.ok, false);
  assert.deepEqual(result.active, []);
});
check('scheduled status derives draft, scheduled, and published semantics', () => {
  const now = new Date('2026-08-18T12:00:00Z');
  assert.equal(scheduledStatus({ publicationStatus: 'draft' }, now), 'draft');
  assert.equal(scheduledStatus({ publicationStatus: 'published', publishedAt: '2026-08-01T00:00:00Z' }, now), 'published');
  assert.equal(scheduledStatus({ publicationStatus: 'published', publishedAt: '2030-01-01T00:00:00Z' }, now), 'scheduled');
  assert.equal(scheduledStatus({ publicationStatus: 'archived' }, now), 'archived');
});

console.log(`\n${passed} passed`);
