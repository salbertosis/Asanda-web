import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, Search, Video } from 'lucide-react';
import { listPublishedVideos, requestVideoPlayback } from '../services/videos.js';
import VideoCard from './VideoCard';
import VideoPlayer from './VideoPlayer';

export default function VideoLibrary({ limit, searchable = false, emptyMessage = 'Todavía no hay videos publicados.' }) {
  const [state, setState] = useState({ loading: true, error: false, videos: [] });
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [playback, setPlayback] = useState({ loading: false, source: null, error: false });
  const playbackRequest = useRef(0);
  const playbackTrigger = useRef(null);
  const listRequest = useRef(0);

  const load = useCallback(async (signal) => {
    const requestId = ++listRequest.current;
    setState((current) => ({ ...current, loading: true, error: false }));
    try {
      const videos = await listPublishedVideos({ signal });
      if (requestId !== listRequest.current || signal?.aborted) return;
      setState({ loading: false, error: false, videos: limit ? videos.slice(0, limit) : videos });
    } catch {
      if (requestId !== listRequest.current || signal?.aborted) return;
      setState({ loading: false, error: true, videos: [] });
    }
  }, [limit]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('es');
    if (!needle) return state.videos;
    return state.videos.filter((video) => `${video.title} ${video.description || ''}`.toLocaleLowerCase('es').includes(needle));
  }, [query, state.videos]);

  const play = async (video) => {
    playbackTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const requestId = ++playbackRequest.current;
    setSelected(video);
    setPlayback({ loading: true, source: null, error: false });
    try {
      const result = await requestVideoPlayback(video.id);
      if (requestId === playbackRequest.current && result.videoId === video.id) setPlayback({ loading: false, source: result.url, error: false });
    } catch {
      if (requestId === playbackRequest.current) setPlayback({ loading: false, source: null, error: true });
    }
  };
  const close = useCallback(() => { playbackRequest.current += 1; setSelected(null); setPlayback({ loading: false, source: null, error: false }); }, []);

  if (state.loading) return <div role="status" aria-busy="true" className="min-h-48 rounded-[18px] border border-asanda-line bg-white p-8 text-center font-semibold text-asanda-deep dark:border-slate-700 dark:bg-dark-surface dark:text-cyan-100">Cargando videos…</div>;
  if (state.error) return <div role="alert" className="rounded-[18px] border border-red-200 bg-red-50 p-6 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100"><p className="font-bold">No pudimos cargar los videos.</p><p className="mt-1 text-sm">No mostramos contenido de ejemplo cuando el catálogo no está disponible.</p><button type="button" onClick={() => load()} className="mt-4 inline-flex min-h-11 items-center gap-2 font-bold underline"><RefreshCw size={17} aria-hidden="true" />Reintentar</button></div>;

  return <>
    {searchable && state.videos.length > 0 && <label className="mb-7 flex min-h-12 items-center gap-3 rounded-xl border border-asanda-line bg-white px-4 text-asanda-deep focus-within:ring-4 focus-within:ring-asanda-orange/30 dark:border-slate-700 dark:bg-dark-surface dark:text-cyan-100"><Search size={19} aria-hidden="true" /><span className="sr-only">Buscar videos</span><input type="search" aria-label="Buscar videos" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por título o descripción" className="min-w-0 flex-1 bg-transparent py-3 text-asanda-ink outline-none dark:text-white" /></label>}
    {state.videos.length === 0 ? <div className="rounded-[18px] border border-dashed border-asanda-line bg-white p-10 text-center dark:border-slate-700 dark:bg-dark-surface"><Video className="mx-auto text-asanda-deep dark:text-cyan-200" aria-hidden="true" /><p className="mt-3 font-bold text-asanda-ink dark:text-white">{emptyMessage}</p></div>
      : visible.length === 0 ? <p className="rounded-[18px] border border-asanda-line bg-white p-8 text-center font-semibold dark:border-slate-700 dark:bg-dark-surface dark:text-white">No hay videos que coincidan con la búsqueda.</p>
        : <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{visible.map((video) => <VideoCard key={video.id} video={video} onPlay={play} />)}</div>}
    {selected && <VideoPlayer video={selected} {...playback} returnFocus={playbackTrigger.current} onClose={close} />}
  </>;
}
