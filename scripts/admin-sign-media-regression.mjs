import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { canonicalize, createSignature, validateFolder } from '../supabase/functions/sign-media-upload/signature.js';

const sha1Hex = (input) => createHash('sha1').update(input).digest('hex');

let passed = 0;
const check = (name, fn) => { fn(); passed += 1; console.log(`  ok - ${name}`); };

console.log('admin sign-media-upload deterministic regression');
check('canonicalize sorts parameters alphabetically', () => {
  assert.equal(canonicalize({ folder: 'asanda/noticias', timestamp: '1315064510' }), 'folder=asanda/noticias&timestamp=1315064510');
  assert.equal(canonicalize({ b: '2', a: '1' }), 'a=1&b=2');
});
check('signature matches known SHA-1 vector', () => {
  const expected = sha1Hex('folder=asanda/noticias&timestamp=1315064510secret123');
  assert.equal(createSignature({ folder: 'asanda/noticias', timestamp: '1315064510' }, 'secret123', sha1Hex), expected);
  assert.match(createSignature({ folder: 'asanda/a', timestamp: '1' }, 's', sha1Hex), /^[0-9a-f]{40}$/);
});
check('signature changes with secret, timestamp, and folder', () => {
  const base = { folder: 'asanda/a', timestamp: '10' };
  const secret = 'one';
  const first = createSignature(base, secret, sha1Hex);
  assert.notEqual(createSignature(base, 'two', sha1Hex), first);
  assert.notEqual(createSignature({ ...base, timestamp: '11' }, secret, sha1Hex), first);
  assert.notEqual(createSignature({ ...base, folder: 'asanda/b' }, secret, sha1Hex), first);
});
check('folder validation accepts bounded asanda folders', () => {
  const valid = ['asanda/n', 'asanda/noticias', 'asanda/a/b-1_2', 'asanda/' + 'x'.repeat(73)];
  for (const folder of valid) assert.equal(validateFolder(folder), true, folder);
});
check('folder validation rejects unsafe, foreign, and malformed folders', () => {
  const invalid = ['', 'asanda', 'asanda/', '/asanda/n', 'other/n', 'asanda/../x', 'asanda/x y', 'ASANDA/n', 'asanda/' + 'x'.repeat(74), null, 42, ['asanda/n'], { folder: 'asanda/n' }, 'asanda/-x', 'asanda/x.'];
  for (const folder of invalid) assert.equal(validateFolder(folder), false, String(folder));
});
check('signature payload never exposes the api secret', () => {
  const apiSecret = 'the-secret-must-stay-hidden';
  const payload = { cloudName: 'demo', apiKey: 'pub-key', timestamp: 1, folder: 'asanda/n', signature: createSignature({ folder: 'asanda/n', timestamp: '1' }, apiSecret, sha1Hex), uploadUrl: 'https://api.cloudinary.com/v1_1/demo/image/upload' };
  const serialized = JSON.stringify(payload);
  assert.ok(serialized.includes('pub-key'));
  assert.ok(!serialized.includes(apiSecret));
  assert.ok(!serialized.includes('secret'));
});

console.log(`\n${passed} passed`);