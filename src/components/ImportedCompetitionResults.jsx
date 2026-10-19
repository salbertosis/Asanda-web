import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { getPublicImportedCompetitionResults, groupPublicCompetitionResults } from '../services/results.js';
import { CompetitionEvents } from './CompetitionResultsList.jsx';

export default function ImportedCompetitionResults({ competition, competitionIndex }) {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController(); let active = true;
    setStatus('loading'); setRows([]);
    getPublicImportedCompetitionResults(competition.importId, controller.signal)
      .then((nextRows) => { if (active) { setRows(nextRows); setStatus('ready'); } })
      .catch((error) => { if (active && error?.name !== 'AbortError') setStatus('error'); });
    return () => { active = false; controller.abort(); };
  }, [competition.importId, reload]);

  const grouped = useMemo(() => groupPublicCompetitionResults(rows), [rows]);
  const details = grouped.find(({ id }) => id === competition.id);
  if (status === 'loading') return <p role="status" className="p-6 text-center text-slate-600 dark:text-slate-300">Cargando detalle de la competencia…</p>;
  if (status === 'error') return <div role="alert" className="p-6 text-center text-slate-800 dark:text-slate-100"><p className="font-bold">No pudimos cargar el detalle de esta competencia.</p><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">La consulta pública no está disponible en este momento.</p><button type="button" onClick={() => setReload((value) => value + 1)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-asanda-blue px-4 font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-asanda-orange-strong"><RefreshCw className="h-4 w-4" aria-hidden="true" />Reintentar</button></div>;
  if (!details?.events.length) return <p role="status" className="p-6 text-center text-slate-600 dark:text-slate-300">No hay resultados finales para esta competencia.</p>;
  return <CompetitionEvents competition={details} competitionIndex={competitionIndex} />;
}
