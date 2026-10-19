import React, { useMemo, useRef, useState } from 'react';
import { CheckCircle2, FileCheck2, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buildHy3SnapshotDto } from '../services/admin/hy3Snapshot.js';
import { formatResultImportError, importHy3CompetitionSnapshot, parseResultFile } from '../services/admin/results.js';

const panel = 'rounded-[14px] border border-asanda-line bg-white p-5 dark:border-slate-700 dark:bg-dark-surface sm:p-6';
const field = 'mt-2 min-h-11 w-full rounded-md border border-asanda-line bg-white px-3 text-asanda-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-asanda-orange dark:border-slate-600 dark:bg-slate-800 dark:text-white';
const statusLabels = { official: 'Oficial', disqualified: 'DQ', did_not_start: 'DNS', did_not_finish: 'DNF', no_time: 'Sin tiempo', provisional: 'Provisional' };
const poolOptions = [{ value: 'SCM', label: '25 m' }, { value: 'LCM', label: '50 m' }, { value: 'SCY', label: '25 yardas (no compatible)' }];
const displayTime = (seconds) => seconds == null ? '—' : `${Number(seconds).toFixed(3).replace(/0+$/, '').replace(/\.$/, '')} s`;
const countLabel = (preview) => {
  const individuals = preview?.results?.length || 0; const relays = preview?.relays?.length || 0; const total = individuals + relays;
  return `${total} resultados (${individuals} individual${individuals === 1 ? '' : 'es'} y ${relays} relevo${relays === 1 ? '' : 's'})`;
};
const Notice = ({ notice }) => notice ? <p role={notice.error ? 'alert' : 'status'} className={`rounded-md border p-4 text-sm font-semibold ${notice.error ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100' : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100'}`}>{notice.text}</p> : null;

export default function AdminResultsPage() {
  const [file, setFile] = useState(null);
  const [parsed, setParsed] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [status, setStatus] = useState('idle');
  const [notice, setNotice] = useState(null);
  const [summary, setSummary] = useState(null);
  const selection = useRef(0);

  const correctedPreview = useMemo(() => parsed?.ok && parsed.preview && metadata ? {
    ...parsed.preview,
    meetName: metadata.name,
    competitionStartsOn: metadata.startsOn,
    competitionEndsOn: metadata.endsOn,
    venueName: metadata.venue,
    pool: metadata.pool,
  } : parsed?.preview, [parsed, metadata]);
  const built = useMemo(() => correctedPreview ? buildHy3SnapshotDto(correctedPreview) : null, [correctedPreview]);
  const blockingReason = status === 'parsing' ? 'Esperá mientras se procesa el archivo localmente.'
    : !parsed?.ok ? (parsed ? formatResultImportError(parsed) : 'Seleccioná un archivo HY3 para generar la vista previa.')
      : !parsed.checksum ? formatResultImportError(new Error('CHECKSUM_UNAVAILABLE'))
        : metadata?.startsOn && metadata?.endsOn && metadata.endsOn < metadata.startsOn ? 'La fecha final no puede ser anterior a la fecha de inicio.'
          : !built?.ok ? formatResultImportError(built) : null;

  const chooseFile = async (event) => {
    const nextFile = event.target.files?.[0] || null; const request = selection.current + 1; selection.current = request;
    setFile(nextFile); setParsed(null); setMetadata(null); setSummary(null); setNotice(null);
    if (!nextFile) { setStatus('idle'); return; }
    setStatus('parsing');
    try {
      const next = await parseResultFile(nextFile);
      if (selection.current !== request) return;
      setParsed(next);
      if (next.ok && next.preview) setMetadata({
        name: next.preview.meetName || '', startsOn: next.preview.competitionStartsOn || '', endsOn: next.preview.competitionEndsOn || '',
        venue: next.preview.venueName || '', pool: next.preview.pool || '',
      });
      setStatus('ready');
    } catch (error) {
      if (selection.current !== request) return;
      setParsed({ ok: false, code: error?.message || 'invalid-input' }); setStatus('ready');
    }
  };
  const updateMetadata = (key, value) => { setMetadata((current) => ({ ...current, [key]: value })); setSummary(null); setNotice(null); };
  const publish = async () => {
    if (blockingReason || !parsed?.ok || !correctedPreview) return;
    setStatus('publishing'); setNotice(null); setSummary(null);
    try {
      const saved = await importHy3CompetitionSnapshot(parsed, correctedPreview);
      setSummary(saved);
      setNotice({ text: `${saved.competitionName} fue publicada correctamente: ${saved.eventCount} pruebas y ${saved.resultCount} resultados.` });
    } catch (error) {
      setNotice({ error: true, text: formatResultImportError(error) });
    } finally { setStatus('ready'); }
  };

  const preview = correctedPreview;
  const athletes = new Map((preview?.athletes || []).map((athlete) => [athlete.sourceAlias, athlete.displayName]));
  const teams = new Map((preview?.teams || []).map((team) => [team.sourceAlias, team.displayName]));
  const rows = [
    ...(preview?.results || []).map((result) => ({ ...result, type: 'Individual', name: athletes.get(result.athleteAlias) || result.athleteAlias })),
    ...(preview?.relays || []).map((result) => ({ ...result, type: 'Relevo', name: teams.get(result.teamAlias) || result.teamAlias })),
  ];

  return <section aria-labelledby="admin-results-title" className="space-y-6">
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-asanda-deep">Operaciones deportivas</p>
      <h1 id="admin-results-title" className="mt-2 font-display text-3xl font-bold sm:text-4xl">Importar resultados</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">Elegí un HY3, revisá la competencia completa y confirmá su publicación. El archivo se procesa localmente: sólo se envía la vista deportiva permitida, sin crear perfiles ni subir los bytes originales.</p>
    </div>
    <Notice notice={notice} />
    <section className={panel} aria-labelledby="file-title">
      <h2 id="file-title" className="text-xl font-bold">1. Elegí el archivo HY3</h2>
      <label className="mt-4 block text-sm font-bold">Archivo HY3<input className={`${field} file:mr-3 file:border-0 file:bg-asanda-mist file:px-3 file:py-2 file:font-bold dark:file:bg-slate-700`} type="file" accept=".hy3,application/octet-stream" onChange={chooseFile} /></label>
      <p className="mt-3 text-xs leading-5 text-slate-600 dark:text-slate-300">No necesitás seleccionar una competencia existente ni reconciliar atletas, clubes u organizaciones.</p>
    </section>

    {preview && metadata && <>
      <section className={panel} aria-labelledby="preview-title">
        <div className="flex items-start gap-3"><FileCheck2 className="mt-1 shrink-0 text-asanda-orange" aria-hidden="true" /><div>
          <p className="text-sm font-bold text-asanda-deep">Vista previa de competencia</p>
          <h2 id="preview-title" className="text-2xl font-bold">{metadata.name || 'Competencia sin nombre'}</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{metadata.startsOn || 'Fecha pendiente'} – {metadata.endsOn || 'Fecha pendiente'} · {metadata.venue || 'Sede pendiente'} · {metadata.pool || 'Piscina pendiente'}</p>
        </div></div>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3"><div><dt className="font-bold">Pruebas</dt><dd>{preview.events.length}</dd></div><div><dt className="font-bold">Participantes</dt><dd>{preview.athletes.length}</dd></div><div><dt className="font-bold">Resultados</dt><dd>{countLabel(preview)}</dd></div></dl>
      </section>
      <section className={panel} aria-labelledby="metadata-title">
        <h2 id="metadata-title" className="text-xl font-bold">2. Confirmá los datos básicos</h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Corregí únicamente estos datos si el encabezado HY3 está incompleto. Cada cambio vuelve a ejecutar la validación deportiva.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold">Nombre de la competencia<input className={field} value={metadata.name} maxLength="200" onChange={(event) => updateMetadata('name', event.target.value)} /></label>
          <label className="text-sm font-bold">Sede<input className={field} value={metadata.venue} maxLength="200" onChange={(event) => updateMetadata('venue', event.target.value)} /></label>
          <label className="text-sm font-bold">Fecha de inicio<input className={field} type="date" value={metadata.startsOn} onChange={(event) => updateMetadata('startsOn', event.target.value)} /></label>
          <label className="text-sm font-bold">Fecha de finalización<input className={field} type="date" value={metadata.endsOn} onChange={(event) => updateMetadata('endsOn', event.target.value)} /></label>
          <label className="text-sm font-bold">Longitud de piscina<select className={field} value={metadata.pool} onChange={(event) => updateMetadata('pool', event.target.value)}><option value="">Seleccioná…</option>{poolOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        </div>
      </section>
      <section className={panel} aria-labelledby="sporting-title">
        <h2 id="sporting-title" className="text-xl font-bold">3. Revisá los resultados deportivos</h2>
        <div className="mt-4 max-w-full overflow-x-auto"><table aria-label="Resultados deportivos detectados" className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b border-asanda-line text-xs uppercase tracking-wide dark:border-slate-700">{['Tipo', 'Nombre', 'Prueba', 'Marca / estado', 'Puesto', 'Carril'].map((heading) => <th key={heading} className="p-2">{heading}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={`${row.type}-${row.sourceAlias}`} className="border-b border-asanda-line dark:border-slate-700"><td className="p-2">{row.type}</td><th scope="row" className="p-2 text-left">{row.name}</th><td className="p-2">{preview.events.find((event) => event.sourceAlias === row.eventAlias)?.displayName || row.eventAlias}</td><td className="p-2">{row.status === 'official' ? displayTime(row.timeSeconds) : statusLabels[row.status] || row.status}</td><td className="p-2">{row.place ?? '—'}</td><td className="p-2">{row.lane ?? '—'}</td></tr>)}</tbody></table></div>
      </section>
    </>}

    {file && <section className={panel} aria-labelledby="publish-title">
      <h2 id="publish-title" className="text-xl font-bold">4. Importá y publicá</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">La confirmación publica la competencia, sus pruebas y todos los resultados finales en una sola operación atómica.</p>
      {blockingReason ? <p className="mt-4 font-semibold text-red-700 dark:text-red-300">{blockingReason}</p> : <p className="mt-4 flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300"><CheckCircle2 size={17} aria-hidden="true" />La vista previa está lista para publicación.</p>}
      <button type="button" onClick={publish} disabled={Boolean(blockingReason) || status === 'publishing'} aria-describedby={blockingReason ? 'publish-title' : undefined} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-md bg-asanda-orange-strong px-5 font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-asanda-blue disabled:cursor-not-allowed disabled:opacity-60"><Upload size={17} aria-hidden="true" />{status === 'publishing' ? 'Publicando…' : 'Importar y publicar'}</button>
      {summary && <div className="mt-5"><Link to="/resultados" className="inline-flex min-h-11 items-center rounded-md border border-asanda-blue px-4 font-bold text-asanda-blue outline-none focus-visible:ring-2 focus-visible:ring-asanda-orange-strong dark:text-cyan-300">Ver resultados públicos</Link></div>}
    </section>}
    {status === 'parsing' && <p role="status" className="sr-only">Procesando archivo localmente</p>}
  </section>;
}
