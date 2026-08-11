// Opt-in, local-only Web Vitals reporting; metrics are never transmitted.
const metricSnapshot = ({ name, value, id, rating, navigationType }) => ({ name, value, id, rating, navigationType });
const defaultReporter = (metric) => globalThis.console?.debug?.('[ASANDA Web Vitals]', metricSnapshot(metric));
const softNavigationOptions = () => (globalThis.PerformanceObserver?.supportedEntryTypes?.includes('soft-navigation') ? { reportSoftNavs: true } : undefined);
const reportNativeMetric = (report, name, value) => report({ name, value, id: `${name}-native`, rating: 'unknown', navigationType: globalThis.performance?.getEntriesByType?.('navigation')?.[0]?.type });
const registerNativeWebVitals = (report = defaultReporter) => {
  const Observer = globalThis.PerformanceObserver;
  const supported = Observer?.supportedEntryTypes ?? [];
  if (!Observer) return false;
  const observe = (type, callback, options = {}) => { if (!supported.includes(type)) return false; new Observer((list) => callback(list.getEntries())).observe({ type, buffered: true, ...options }); return true; };
  let cls = 0;
  let registered = observe('layout-shift', (entries) => { cls += entries.reduce((sum, entry) => sum + (entry.hadRecentInput ? 0 : entry.value), 0); reportNativeMetric(report, 'CLS', cls); });
  registered = observe('largest-contentful-paint', (entries) => reportNativeMetric(report, 'LCP', entries.at(-1)?.startTime ?? 0)) || registered;
  registered = observe('event', (entries) => reportNativeMetric(report, 'INP', Math.max(0, ...entries.map((entry) => entry.duration))), { durationThreshold: 40 }) || registered;
  return registered;
};

export function registerWebVitals(webVitals, report = defaultReporter) {
  const callbacks = [webVitals?.onCLS, webVitals?.onINP, webVitals?.onLCP];
  if (!callbacks.every((callback) => typeof callback === 'function')) return false;
  for (const register of callbacks) register(report, softNavigationOptions());
  return true;
}

export async function loadWebVitals(report) {
  try {
    const packageName = 'web-vitals'; // Variable specifier: keeps the optional import runtime-only.
    return registerWebVitals(await import(/* @vite-ignore */ packageName), report);
  } catch {
    return registerNativeWebVitals(report);
  }
}
