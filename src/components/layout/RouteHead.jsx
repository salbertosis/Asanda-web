import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { approvedPublicSite } from '../../config/publicSite.js';
import { buildRouteMetadata } from '../../seo/routeMetadata.js';

const syncTag = (selector, attributes, text = null) => {
  const existing = document.head.querySelector(selector);
  const tag = existing ?? document.head.appendChild(document.createElement(attributes.tag || 'meta'));
  const previous = Object.fromEntries(Object.keys(attributes).filter((key) => key !== 'tag').map((key) => [key, tag.getAttribute(key)]));
  for (const [key, value] of Object.entries(attributes)) if (key !== 'tag') tag.setAttribute(key, value);
  if (text !== null) tag.textContent = text;
  return () => {
    if (!existing) return tag.remove();
    for (const [key, value] of Object.entries(previous)) value === null ? tag.removeAttribute(key) : tag.setAttribute(key, value);
  };
};

const RouteHead = () => {
  const location = useLocation();
  const generatedTitle = useRef(null);
  const manualTitle = useRef(null);

  useEffect(() => {
    const metadata = buildRouteMetadata(location.pathname, approvedPublicSite, location.search);
    if (generatedTitle.current && document.title !== generatedTitle.current) manualTitle.current = document.title;
    const nextTitle = metadata.title.startsWith('ASANDA') ? metadata.title : `${metadata.title} | ASANDA`;
    document.title = location.pathname === '/' && manualTitle.current ? manualTitle.current : nextTitle;
    generatedTitle.current = document.title;
    const cleanups = [];
    for (const [selector, attrs] of [
      ['meta[name="description"]', { name: 'description', content: metadata.description }],
      ['meta[property="og:title"]', { property: 'og:title', content: metadata.openGraph.title }],
      ['meta[property="og:description"]', { property: 'og:description', content: metadata.openGraph.description }],
      ['meta[property="og:url"]', { property: 'og:url', content: metadata.openGraph.url }],
      ['meta[property="og:image"]', { property: 'og:image', content: metadata.openGraph.image }],
      ['meta[name="twitter:title"]', { name: 'twitter:title', content: metadata.openGraph.title }],
      ['meta[name="twitter:description"]', { name: 'twitter:description', content: metadata.openGraph.description }],
      ['meta[name="twitter:image"]', { name: 'twitter:image', content: metadata.openGraph.image }],
    ]) if (attrs.content) cleanups.push(syncTag(selector, attrs));
    if (metadata.canonicalUrl) cleanups.push(syncTag('link[rel="canonical"]', { tag: 'link', rel: 'canonical', href: metadata.canonicalUrl }));
    if (metadata.jsonLd) cleanups.push(syncTag('script[data-route-jsonld]', { tag: 'script', type: 'application/ld+json', 'data-route-jsonld': 'true' }, JSON.stringify(metadata.jsonLd)));
    if (metadata.noindex) cleanups.push(syncTag('meta[name="robots"]', { name: 'robots', content: 'noindex,nofollow' }));
    return () => { for (const cleanup of cleanups.reverse()) cleanup(); };
  }, [location.pathname, location.search]);

  return null;
};

export default RouteHead;
