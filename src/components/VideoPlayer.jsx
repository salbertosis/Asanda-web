import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export default function VideoPlayer({ video, source, loading, error, returnFocus, onClose }) {
  const dialogRef = useRef(null);
  const videoRef = useRef(null);
  const closeRef = useRef(null);
  const [mediaError, setMediaError] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
      returnFocus?.focus();
    };
  }, [returnFocus]);

  useEffect(() => {
    setMediaError(false);
    const player = videoRef.current;
    if (player && source) player.src = source;
    return () => {
      if (player) { player.pause(); player.removeAttribute('src'); player.load(); }
    };
  }, [video?.id, source]);

  const keepFocusInside = (event) => {
    if (event.key !== 'Tab') return;
    const focusable = [closeRef.current, videoRef.current].filter(Boolean);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="video-player-title"
      onKeyDown={keepFocusInside}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      className="m-auto w-[calc(100%-2rem)] max-w-5xl overflow-visible rounded-[18px] bg-white p-0 text-asanda-ink shadow-2xl backdrop:bg-slate-950/90 dark:bg-dark-surface dark:text-white"
    >
      <div className="p-4 sm:p-6">
        <div className="flex items-start gap-4">
          <h2 id="video-player-title" className="min-w-0 flex-1 font-display text-2xl font-bold">{video.title}</h2>
          <button ref={closeRef} type="button" onClick={onClose} className="grid min-h-11 min-w-11 place-items-center rounded-full hover:bg-asanda-mist focus-visible:ring-4 focus-visible:ring-asanda-orange/40 dark:hover:bg-slate-700" aria-label="Cerrar reproductor"><X aria-hidden="true" /></button>
        </div>
        <div className="relative mt-4 grid aspect-video place-items-center overflow-hidden rounded-xl bg-black text-white">
          {loading && <p role="status" className="p-6 text-center font-semibold">Preparando reproducción segura…</p>}
          {error && <p role="alert" className="p-6 text-center font-semibold">No pudimos preparar este video. Cerrá el reproductor e intentá nuevamente.</p>}
          {source && <video ref={videoRef} src={source} controls playsInline preload="metadata" className="h-full w-full" onError={() => setMediaError(true)} />}
          {mediaError && <p role="alert" className="absolute max-w-xl rounded-lg bg-black/90 p-5 text-center font-semibold">No pudimos reproducir este video. Podés cerrar el reproductor e intentarlo nuevamente.</p>}
        </div>
      </div>
    </dialog>
  );
}
