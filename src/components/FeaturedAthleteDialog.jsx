import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import FeaturedAthleteProfile from './FeaturedAthleteProfile';

const FeaturedAthleteDialog = ({ athlete, open, returnFocus, onDismiss }) => {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const dialogId = 'featured-athlete-profile-dialog';

  useEffect(() => {
    if (!open) return undefined;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
      returnFocus?.focus();
    };
  }, [open, returnFocus]);

  return (
    <dialog
      ref={dialogRef}
      id={dialogId}
      aria-labelledby={`${athlete.profileKey}-dialog-title`}
      onCancel={(event) => { event.preventDefault(); onDismiss(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onDismiss(); }}
      className="m-0 h-[100dvh] max-h-[100dvh] w-full max-w-none overflow-hidden bg-transparent p-0 text-slate-900 backdrop:bg-slate-950/75 backdrop:backdrop-blur-sm dark:text-white sm:m-auto sm:h-auto sm:max-h-[min(90dvh,56rem)] sm:w-[min(92vw,64rem)] motion-safe:animate-[fade-in_160ms_ease-out] motion-reduce:animate-none"
    >
      <div className="flex h-full max-h-[inherit] min-w-0 flex-col overflow-hidden bg-slate-50 shadow-2xl dark:bg-slate-950 sm:rounded-[1.75rem] sm:border sm:border-slate-700">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-asanda-deep px-4 py-3 text-white dark:border-slate-700 sm:px-6">
          <h2 id={`${athlete.profileKey}-dialog-title`} className="min-w-0 truncate text-lg font-black">Perfil público de {athlete.name}</h2>
          <button ref={closeButtonRef} type="button" onClick={onDismiss} aria-label="Cerrar perfil público" className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white motion-reduce:transition-none"><X aria-hidden="true" /></button>
        </header>
        <div className="min-h-0 overflow-y-auto overscroll-contain"><FeaturedAthleteProfile athlete={athlete} /></div>
      </div>
    </dialog>
  );
};

export default FeaturedAthleteDialog;
