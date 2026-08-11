import React from 'react';
import { getApprovedLegalContent } from '../content/legalContent';

// Página legal centralizada (D5): el contenido sustantivo solo se renderiza
// desde texto aprobado; sin aprobación se muestra el estado no disponible.
// El landmark main y el H1 de la vista los provee AppShell/esta página.
const UNAVAILABLE = {
  legal: {
    title: 'Información legal no disponible',
    body: 'La información legal institucional se publicará cuando cuente con aprobación.',
  },
  privacy: {
    title: 'Información de privacidad no disponible',
    body: 'La información de privacidad institucional se publicará cuando cuente con aprobación.',
  },
};

const LegalContentPage = ({ kind }) => {
  const content = getApprovedLegalContent(kind);
  const fallback = UNAVAILABLE[kind] ?? UNAVAILABLE.legal;
  const title = content?.title ?? fallback.title;

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-3xl font-bold">{title}</h1>
        {content ? (
          content.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
            </section>
          ))
        ) : (
          <p className="mt-4">{fallback.body}</p>
        )}
      </div>
    </>
  );
};

export default LegalContentPage;
