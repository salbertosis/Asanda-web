import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, Pencil, Plus, RefreshCw, Send } from 'lucide-react';
import { archiveNews, listAdminNews, publishNews } from '../services/admin/news';

const statusMeta = {
  draft: { label: 'Borrador', className: 'bg-slate-100 text-slate-700' },
  published: { label: 'Publicada', className: 'bg-emerald-100 text-emerald-800' },
  scheduled: { label: 'Programada', className: 'bg-sky-100 text-sky-800' },
  archived: { label: 'Archivada', className: 'bg-slate-200 text-slate-600' },
};

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
};

const AdminNewsPage = () => {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await listAdminNews());
    } catch {
      setError('No fue posible cargar las noticias. Intentá nuevamente.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (id, action) => {
    setBusyId(id);
    setError(null);
    try {
      if (action === 'publish') await publishNews(id);
      else await archiveNews(id);
      await load();
    } catch {
      setError('No fue posible actualizar la noticia. Intentá nuevamente.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section aria-labelledby="admin-news-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-asanda-deep">Módulo editorial</p>
          <h1 id="admin-news-title" className="mt-2 font-display text-3xl font-bold sm:text-4xl">Noticias</h1>
        </div>
        <Link to="/admin/noticias/nueva" className="inline-flex min-h-11 items-center justify-center gap-2 bg-asanda-orange-strong px-4 font-bold text-white transition-colors hover:bg-[#a94320]">
          <Plus size={18} aria-hidden="true" />
          Nueva noticia
        </Link>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {error}
          <button type="button" onClick={load} className="ml-3 inline-flex items-center gap-1 underline underline-offset-2">
            <RefreshCw size={14} aria-hidden="true" />
            Reintentar
          </button>
        </p>
      )}

      {!items && !error && (
        <p role="status" className="mt-6 rounded-md border border-asanda-line bg-white p-6 text-sm font-semibold text-asanda-deep">Cargando noticias…</p>
      )}

      {items && items.length === 0 && !error && (
        <div className="mt-6 rounded-[14px] border border-dashed border-asanda-line bg-white p-10 text-center">
          <p className="font-bold text-asanda-ink">Todavía no hay noticias.</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Creá la primera noticia para el portal.</p>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="mt-6 space-y-3">
          {items.map((item) => {
            const meta = statusMeta[item.status] ?? statusMeta.draft;
            return (
              <li key={item.id} className="rounded-[14px] border border-asanda-line bg-white p-4 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${meta.className}`}>{meta.label}</span>
                      <span className="text-xs text-slate-500">{formatDate(item.publishedAt)}</span>
                    </div>
                    <h2 className="mt-2 truncate text-lg font-bold text-asanda-ink">{item.title}</h2>
                    <p className="mt-1 text-sm text-slate-500">{item.slug}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Link to={`/admin/noticias/${item.id}`} className="inline-flex min-h-10 items-center gap-1.5 px-3 font-bold text-asanda-deep hover:bg-asanda-mist" aria-label={`Editar ${item.title}`}>
                      <Pencil size={16} aria-hidden="true" />
                      Editar
                    </Link>
                    {item.status !== 'archived' ? (
                      <button type="button" disabled={busyId === item.id} onClick={() => changeStatus(item.id, 'archive')} className="inline-flex min-h-10 items-center gap-1.5 px-3 font-bold text-slate-600 hover:bg-slate-100 disabled:cursor-wait disabled:opacity-60" aria-label={`Archivar ${item.title}`}>
                        <Archive size={16} aria-hidden="true" />
                        Archivar
                      </button>
                    ) : (
                      <button type="button" disabled={busyId === item.id} onClick={() => changeStatus(item.id, 'publish')} className="inline-flex min-h-10 items-center gap-1.5 px-3 font-bold text-asanda-deep hover:bg-asanda-mist disabled:cursor-wait disabled:opacity-60" aria-label={`Publicar ${item.title}`}>
                        <Send size={16} aria-hidden="true" />
                        Publicar
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default AdminNewsPage;