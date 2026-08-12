import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export function comparePerformance(current = {}, baseline = {}, tolerances = {}) {
  const regressions = [];
  for (const [name, value] of Object.entries(baseline.scores ?? {})) if (typeof current.scores?.[name] !== 'number') regressions.push(`${name} score missing`); else if (current.scores[name] < value) regressions.push(`${name} score ${current.scores[name]} < ${value}`);
  for (const [name, value] of Object.entries(baseline.metrics ?? {})) { const tolerance = tolerances.metrics?.[name] ?? 0; if (typeof current.metrics?.[name] !== 'number') regressions.push(`${name} missing`); else if (current.metrics[name] > value + tolerance) regressions.push(`${name} ${current.metrics[name]} > ${value} + ${tolerance}`); }
  return { ok: regressions.length === 0, regressions };
}

export function median(values = []) {
  if (!values.length || values.some((value) => typeof value !== 'number')) return null;
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const [currentPath, baselinePath] = process.argv.slice(2);
  if (!currentPath || !baselinePath) throw new Error('Usage: node scripts/performance-regression.mjs <current.json> <baseline.json>');
  const result = comparePerformance(JSON.parse(await readFile(currentPath)), JSON.parse(await readFile(baselinePath)));
  if (!result.ok) { console.error(`Performance baseline regression: ${result.regressions.join('; ')}`); process.exitCode = 1; } else console.log('Performance baseline regression check passed.');
}
