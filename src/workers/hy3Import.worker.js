import { parseCsvFallback, parseHy3 } from '../services/admin/hy3Parser.js';

export async function processHy3Import(message) {
  if (!message || message.type !== 'parse') return { ok: false, code: 'invalid-message' };
  if (message.format === 'csv') return parseCsvFallback(message.text);
  return parseHy3(message.bytes);
}

if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
  self.onmessage = async ({ data }) => {
    try {
      self.postMessage(await processHy3Import(data));
    } catch {
      self.postMessage({ ok: false, code: 'worker-failure' });
    }
  };
}
