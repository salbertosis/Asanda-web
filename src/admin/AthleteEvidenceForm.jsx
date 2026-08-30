import React, { useState } from 'react';
import { FileUp } from 'lucide-react';
import { EVIDENCE_MIME_TYPES } from '../services/admin/athleteEvidence';

const field = 'mt-2 min-h-11 w-full rounded-md border border-asanda-line bg-white px-3 text-asanda-ink dark:border-slate-600 dark:bg-slate-800 dark:text-white';

const AthleteEvidenceForm = ({ busy, onSubmit }) => {
  const [kind, setKind] = useState('private_object');
  const [label, setLabel] = useState('');
  const [file, setFile] = useState(null);
  const [officialUrl, setOfficialUrl] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const saved = await onSubmit({ kind, label, file, officialUrl });
    if (!saved) return;
    setLabel(''); setFile(null); setOfficialUrl(''); form.reset(); setKind('private_object');
  };

  return (
    <form onSubmit={submit} className="mt-5 rounded-md border border-asanda-line bg-asanda-foam p-4 dark:border-slate-700 dark:bg-slate-900" aria-label="Agregar prueba del atleta">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-bold">Origen de la prueba<select className={field} value={kind} onChange={(event) => setKind(event.target.value)}><option value="private_object">Archivo privado</option><option value="official_url">Enlace oficial</option></select></label>
        <label className="text-sm font-bold">Etiqueta<input className={field} required value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Ej. Acta oficial del torneo" /></label>
        {kind === 'private_object' ? (
          <div className="sm:col-span-2">
            <label className="text-sm font-bold" htmlFor="athlete-evidence-file">Archivo de evidencia</label>
            <input id="athlete-evidence-file" aria-describedby="athlete-evidence-file-help" className={`${field} py-2`} type="file" required accept={Array.from(EVIDENCE_MIME_TYPES).join(',')} onChange={(event) => setFile(event.target.files?.[0] || null)} />
            <p id="athlete-evidence-file-help" className="mt-2 text-xs font-normal leading-5 text-slate-600 dark:text-slate-300">PDF o imagen JPEG, PNG o WebP, hasta 10 MiB. El archivo permanece privado y su nombre original no se conserva en la ruta.</p>
          </div>
        ) : (
          <div className="sm:col-span-2">
            <label className="text-sm font-bold" htmlFor="athlete-evidence-official-url">Enlace oficial HTTPS</label>
            <input id="athlete-evidence-official-url" aria-describedby="athlete-evidence-official-url-help" className={field} type="url" required pattern="https://.*" value={officialUrl} onChange={(event) => setOfficialUrl(event.target.value)} placeholder="https://organizacion.example/resultado" />
            <p id="athlete-evidence-official-url-help" className="mt-2 text-xs font-normal text-slate-600 dark:text-slate-300">Usá únicamente una fuente oficial publicada mediante HTTPS.</p>
          </div>
        )}
      </div>
      <button type="submit" disabled={busy} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-asanda-deep px-4 font-bold text-white disabled:opacity-60"><FileUp size={17} aria-hidden="true" />{busy ? 'Guardando…' : 'Agregar prueba'}</button>
    </form>
  );
};

export default AthleteEvidenceForm;
