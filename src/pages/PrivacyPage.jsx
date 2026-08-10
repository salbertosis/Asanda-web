import React from 'react';
import { getApprovedLegalContent } from '../content/legalContent';
import RouteHead from '../components/layout/RouteHead';

const PrivacyPage = () => {
  const content = getApprovedLegalContent('privacy');
  return <><RouteHead title={content?.title ?? 'Información de privacidad no disponible'} noindex={!content} /><main className="mx-auto max-w-3xl px-4 py-16"><h1 className="text-3xl font-bold">{content?.title ?? 'Información de privacidad no disponible'}</h1>{content ? content.sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2><p>{section.body}</p></section>) : <p className="mt-4">La información de privacidad institucional se publicará cuando cuente con aprobación.</p>}</main></>;
};

export default PrivacyPage;
