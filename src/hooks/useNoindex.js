import { useEffect } from 'react';

// Inserta <meta name="robots" content="noindex"> al montar y restaura el
// estado previo al desmontar (diseño D4). Solo para páginas demo.
export const useNoindex = () => {
    useEffect(() => {
        const existing = document.head.querySelector('meta[name="robots"]');
        const previousContent = existing?.getAttribute('content') ?? null;
        let tag = existing;
        let created = false;
        if (!tag) {
            tag = document.createElement('meta');
            tag.setAttribute('name', 'robots');
            document.head.appendChild(tag);
            created = true;
        }
        tag.setAttribute('content', 'noindex');
        return () => {
            if (created) {
                tag.remove();
            } else if (previousContent === null) {
                tag.removeAttribute('content');
            } else {
                tag.setAttribute('content', previousContent);
            }
        };
    }, []);
};
