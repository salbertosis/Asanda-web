import React from 'react';

// Enlace de salto (D3): primer destino de tabulación de cada vista. Permanece
// fuera de pantalla hasta recibir foco y, al activarlo, mueve el foco al
// landmark principal. Sin animación bajo prefers-reduced-motion (CSS global).
const SkipLink = () => (
  <a
    href="#main-content"
    className="fixed left-4 top-4 z-[60] -translate-y-[200%] rounded-sm bg-asanda-ink px-4 py-3 text-sm font-bold text-white shadow-lg transition-transform focus:translate-y-0"
    onClick={(event) => {
      event.preventDefault();
      const main = document.getElementById('main-content');
      if (main) {
        main.focus();
        main.scrollIntoView();
      }
    }}
  >
    Saltar al contenido principal
  </a>
);

export default SkipLink;
