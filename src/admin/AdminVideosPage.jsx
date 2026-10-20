import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Archive, RefreshCw, Save, Upload, Video } from 'lucide-react';
import VideoPlayer from '../components/VideoPlayer';
import { getAdminMediaUrl, listPublicImageMedia } from '../services/admin/media';
import {
  archiveAdminVideo, compareVideoDuration, formatVideoError, listAdminVideos, publishAdminVideo, requestVideoPreview,
  registerVideoDraft, updateAdminVideo, uploadAndRegisterVideoDraft, validateVideoFile, VIDEO_MAX_BYTES,
} from '../services/admin/videos';

const fileError = `Seleccioná un MP4 válido de hasta ${VIDEO_MAX_BYTES} bytes (100 MB).`;
const statusLabel = { draft: 'Borrador privado', published: 'Publicado', archived: 'Archivado' };
const slugify = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const editorValues = (video) => ({ title: video.title, slug: video.slug, description: video.description || '', thumbnailAssetId: video.thumbnailAssetId || '' });

export default function AdminVideosPage() {
  const [videos, setVideos] = useState(null);
  const [media, setMedia] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const [notice, setNotice] = useState(null);
  const [file, setFile] = useState(null);
  const [fileMessage, setFileMessage] = useState(null);
  const [existingPublicId, setExistingPublicId] = useState('');
  const [create, setCreate] = useState({ title: '', slug: '', description: '', rights: false });
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const [edit, setEdit] = useState(null);
  const [publishConfirmed, setPublishConfirmed] = useState(false);
  const [preview, setPreview] = useState(null);
  const uploadController = useRef(null);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const [videoRows, imageRows] = await Promise.all([listAdminVideos(), listPublicImageMedia()]);
      setVideos(videoRows);
      setMedia(imageRows.filter((item) => item.resourceType === 'image' && item.isPublic));
      if (selected) {
        const current = videoRows.find((item) => item.id === selected.id);
        if (current) { setSelected(current); setEdit(editorValues(current)); }
      }
    } catch { setLoadError(true); setVideos([]); }
  }, [selected?.id]);

  useEffect(() => { load(); }, []);
  useEffect(() => () => uploadController.current?.abort(), []);

  const chooseFile = (event) => {
    const next = event.target.files?.[0] || null;
    setFile(next);
    setFileMessage(next && !validateVideoFile(next).ok ? fileError : null);
  };
  const updateCreate = (key, value) => setCreate((current) => ({ ...current, [key]: value }));
  const completeDraft = async (draft) => {
    setNotice({ type: 'success', text: 'Borrador privado guardado. Revisalo antes de publicarlo.' });
    setCreate({ title: '', slug: '', description: '', rights: false }); setFile(null); setFileMessage(null); setExistingPublicId('');
    await load();
    const loaded = (await listAdminVideos()).find((item) => item.id === draft.id);
    if (loaded) { setSelected(loaded); setEdit(editorValues(loaded)); }
  };
  const compareDuration = async () => {
    setNotice(null); setBusy(true);
    try { setNotice({ type: 'success', text: await compareVideoDuration(existingPublicId.trim()) }); }
    catch { setNotice({ type: 'error', text: 'No se pudo comparar la duración. Revisá la sesión y el Public ID. No se modificó ni registró el archivo.' }); }
    finally { setBusy(false); }
  };
  const registerExisting = async () => {
    setNotice(null);
    if (!create.rights) { setNotice({ type: 'error', text: 'Confirmá que los derechos y la difusión fueron aprobados antes de registrar el video.' }); return; }
    setBusy(true);
    try {
      const draft = await registerVideoDraft({ publicId: existingPublicId.trim(), title: create.title, slug: create.slug, description: create.description });
      await completeDraft(draft);
    } catch (error) { setNotice({ type: 'error', text: formatVideoError(error) }); }
    finally { setBusy(false); }
  };
  const submitUpload = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setNotice(null);
    if (!validateVideoFile(file).ok) { setFileMessage(fileError); return; }
    if (!create.rights) { setNotice({ type: 'error', text: 'Confirmá que los derechos y la difusión fueron aprobados antes de subir el video.' }); return; }
    const controller = new AbortController(); uploadController.current = controller; setBusy(true);
    try {
      const draft = await uploadAndRegisterVideoDraft({ file, title: create.title, slug: create.slug, description: create.description, signal: controller.signal });
      await completeDraft(draft); form.reset();
    } catch (error) {
      if (error?.publicId) setExistingPublicId(error.publicId);
      setNotice({ type: 'error', text: formatVideoError(error) });
    }
    finally { setBusy(false); uploadController.current = null; }
  };
  const cancelUpload = () => uploadController.current?.abort();
  const openEditor = (video) => { setSelected(video); setEdit(editorValues(video)); setPublishConfirmed(false); setNotice(null); };
  const save = async () => {
    setBusy(true); setNotice(null);
    try { const saved = await updateAdminVideo(selected.id, { ...edit, thumbnailAssetId: edit.thumbnailAssetId || null }); setSelected(saved); setEdit(editorValues(saved)); setNotice({ type: 'success', text: 'Metadatos del video guardados.' }); await load(); }
    catch (error) { setNotice({ type: 'error', text: formatVideoError(error) }); }
    finally { setBusy(false); }
  };
  const showPreview = async () => {
    setBusy(true); setNotice(null);
    try { const result = await requestVideoPreview(selected.id); setPreview({ video: selected, source: result.url }); }
    catch { setNotice({ type: 'error', text: 'No se pudo preparar la vista previa privada.' }); }
    finally { setBusy(false); }
  };
  const publish = async () => {
    setNotice(null);
    if (!publishConfirmed) { setNotice({ type: 'error', text: 'Confirmá los derechos y la autorización de difusión antes de publicar.' }); return; }
    setBusy(true);
    try { const value = await publishAdminVideo(selected.id); setSelected((current) => ({ ...current, ...value })); setNotice({ type: 'success', text: 'Video publicado en el catálogo.' }); setPublishConfirmed(false); await load(); }
    catch (error) { setNotice({ type: 'error', text: `${formatVideoError(error)} El video permanece como borrador privado.` }); }
    finally { setBusy(false); }
  };
  const archive = async () => {
    setBusy(true); setNotice(null);
    try { const value = await archiveAdminVideo(selected.id); setSelected(value); setEdit(editorValues(value)); setNotice({ type: 'success', text: 'Video retirado del catálogo y archivado.' }); await load(); }
    catch (error) { setNotice({ type: 'error', text: formatVideoError(error) }); }
    finally { setBusy(false); }
  };

  return <section aria-labelledby="admin-videos-title">
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-asanda-deep dark:text-cyan-200">Biblioteca audiovisual</p>
    <h1 id="admin-videos-title" className="mt-2 font-display text-3xl font-bold sm:text-4xl">Videos</h1>
    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">Los MP4 se cargan como recursos autenticados y permanecen privados hasta una publicación explícita. Límite: {VIDEO_MAX_BYTES} bytes (100 MB).</p>

    {loadError && <p role="alert" className="mt-6 rounded-xl border border-red-300 bg-red-50 p-4 text-red-900"><b>No se pudo cargar la biblioteca de videos.</b><button type="button" onClick={load} className="ml-3 inline-flex items-center gap-1 font-bold underline"><RefreshCw size={15} />Reintentar</button></p>}
    {notice && <p role={notice.type === 'error' ? 'alert' : 'status'} className={`mt-6 rounded-xl border p-4 font-semibold ${notice.type === 'error' ? 'border-red-300 bg-red-50 text-red-900' : 'border-emerald-300 bg-emerald-50 text-emerald-900'}`}>{notice.text}</p>}

    <form onSubmit={submitUpload} className="mt-6 rounded-[18px] border border-asanda-line bg-white p-5 dark:border-slate-700 dark:bg-dark-surface sm:p-6">
      <h2 className="font-display text-2xl font-bold">Nuevo borrador privado</h2>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <label className="text-sm font-bold">MP4 (hasta 100 MB)<input type="file" accept="video/mp4,.mp4" onChange={chooseFile} className="mt-2 block w-full rounded-lg border border-asanda-line p-3 font-normal dark:bg-slate-900" /></label>
        <label className="text-sm font-bold">Título<input value={create.title} minLength={3} maxLength={120} required onChange={(event) => { updateCreate('title', event.target.value); if (!create.slug) updateCreate('slug', slugify(event.target.value)); }} className="mt-2 block min-h-12 w-full rounded-lg border border-asanda-line px-3 font-normal dark:bg-slate-900" /></label>
        <label className="text-sm font-bold">Slug<input value={create.slug} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" onChange={(event) => updateCreate('slug', event.target.value)} className="mt-2 block min-h-12 w-full rounded-lg border border-asanda-line px-3 font-normal dark:bg-slate-900" /></label>
        <label className="text-sm font-bold sm:col-span-2">Descripción (opcional)<textarea value={create.description} maxLength={2000} onChange={(event) => updateCreate('description', event.target.value)} className="mt-2 block min-h-24 w-full rounded-lg border border-asanda-line p-3 font-normal dark:bg-slate-900" /></label>
      </div>
      {fileMessage && <p role="alert" className="mt-3 text-sm font-bold text-red-700">{fileMessage}</p>}
      <label className="mt-5 flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={create.rights} onChange={(event) => updateCreate('rights', event.target.checked)} className="mt-1 h-5 w-5" /><span>Confirmo que los derechos y la difusión fueron aprobados por una persona responsable. El material con personas identificables, especialmente menores, requiere aprobación humana; este control no crea ni sustituye una constancia legal.</span></label>
      <div className="mt-5 flex flex-wrap gap-3"><button type="submit" disabled={busy || Boolean(existingPublicId.trim())} className="inline-flex min-h-12 items-center gap-2 bg-asanda-orange-strong px-5 font-bold text-white disabled:opacity-60"><Upload size={18} />Subir como borrador privado</button>{busy && <button type="button" onClick={cancelUpload} className="min-h-12 border border-asanda-line px-5 font-bold">Cancelar carga</button>}</div>
      <div className="mt-6 border-t border-asanda-line pt-5">
        <h3 className="font-display text-xl font-bold">Recuperar un archivo ya subido</h3>
        <p id="existing-video-help" className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Usá el Public ID completo de Cloudinary (asanda/videos/...), no una URL ni el nombre del archivo. Registrar conserva las validaciones del servidor: no vuelve a subir el MP4 ni lo publica. Completá el título, slug y confirmación de derechos de arriba.</p>
        <label className="mt-3 block text-sm font-bold">Public ID del video ya subido<input value={existingPublicId} onChange={(event) => setExistingPublicId(event.target.value)} aria-describedby="existing-video-help" className="mt-2 block min-h-12 w-full rounded-lg border border-asanda-line px-3 font-normal dark:bg-slate-900" /></label>
        <button type="button" disabled={busy || !existingPublicId.trim()} onClick={registerExisting} className="mt-3 min-h-12 border border-asanda-line px-5 font-bold disabled:opacity-60">Registrar archivo existente</button>
        <button type="button" disabled={busy || !existingPublicId.trim()} onClick={compareDuration} className="ml-3 mt-3 min-h-12 border border-asanda-line px-5 font-bold disabled:opacity-60">Comparar duración (solo lectura)</button>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">Comparar hace como máximo dos consultas privadas del mismo recurso con y sin metadatos. No requiere un archivo nuevo ni registra, transforma o publica el video. El resultado no aplica correcciones automáticamente.</p>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">El ID de una carga fallida se conserva mientras esta página siga abierta. Mientras haya un Public ID, la carga de otro MP4 queda deshabilitada para evitar duplicados; borrá el campo solo si querés iniciar otra carga.</p>
      </div>
    </form>

    {!videos && !loadError && <p role="status" className="mt-6">Cargando videos…</p>}
    {videos?.length === 0 && !loadError && <p className="mt-6 rounded-[18px] border border-dashed border-asanda-line bg-white p-8 text-center font-bold dark:border-slate-700 dark:bg-dark-surface">Todavía no hay videos administrados.</p>}
    {videos?.length > 0 && <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"><div><h2 className="font-display text-2xl font-bold">Biblioteca</h2><ul className="mt-4 space-y-3">{videos.map((video) => <li key={video.id}><button type="button" onClick={() => openEditor(video)} className="w-full rounded-xl border border-asanda-line bg-white p-4 text-left focus-visible:ring-4 focus-visible:ring-asanda-orange/40 dark:border-slate-700 dark:bg-dark-surface"><span className="block font-bold">{video.title}</span><span className="mt-1 block text-xs font-semibold uppercase tracking-wide text-asanda-deep dark:text-cyan-200">{statusLabel[video.publicationStatus]}</span></button></li>)}</ul></div>
      {selected && edit && <div className="rounded-[18px] border border-asanda-line bg-white p-5 dark:border-slate-700 dark:bg-dark-surface sm:p-6"><h2 className="font-display text-2xl font-bold">Editar {selected.title}</h2><div className="mt-5 grid gap-4"><label className="text-sm font-bold">Título del video<input value={edit.title} onChange={(event) => setEdit({ ...edit, title: event.target.value })} className="mt-2 block min-h-12 w-full rounded-lg border border-asanda-line px-3 font-normal dark:bg-slate-900" /></label><label className="text-sm font-bold">Slug del video<input value={edit.slug} onChange={(event) => setEdit({ ...edit, slug: event.target.value })} className="mt-2 block min-h-12 w-full rounded-lg border border-asanda-line px-3 font-normal dark:bg-slate-900" /></label><label className="text-sm font-bold">Descripción del video<textarea value={edit.description} onChange={(event) => setEdit({ ...edit, description: event.target.value })} className="mt-2 block min-h-24 w-full rounded-lg border border-asanda-line p-3 font-normal dark:bg-slate-900" /></label><label className="text-sm font-bold">Poster público<select aria-label="Poster público" value={edit.thumbnailAssetId} onChange={(event) => setEdit({ ...edit, thumbnailAssetId: event.target.value })} className="mt-2 block min-h-12 w-full rounded-lg border border-asanda-line px-3 font-normal dark:bg-slate-900"><option value="">Sin poster (usar fondo ASANDA)</option>{media.map((item) => <option key={item.id} value={item.id}>{item.altText || item.publicId}</option>)}</select></label>{edit.thumbnailAssetId && (() => { const asset = media.find((item) => item.id === edit.thumbnailAssetId); const url = getAdminMediaUrl(asset, { width: 640, height: 360 }); return url ? <img src={url} alt={asset.altText || ''} className="aspect-video w-full rounded-xl object-cover" /> : null; })()}</div>
      <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={save} disabled={busy} className="inline-flex min-h-11 items-center gap-2 bg-asanda-deep px-4 font-bold text-white"><Save size={17} />Guardar metadatos</button><button type="button" onClick={showPreview} disabled={busy} className="inline-flex min-h-11 items-center gap-2 border border-asanda-line px-4 font-bold"><Video size={17} />Previsualizar {selected.title}</button></div>
      {selected.publicationStatus !== 'published' && <div className="mt-6 border-t border-asanda-line pt-5"><label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={publishConfirmed} onChange={(event) => setPublishConfirmed(event.target.checked)} className="mt-1 h-5 w-5" />Confirmo nuevamente que los derechos y la autorización de difusión fueron aprobados por una persona responsable.</label><button type="button" onClick={publish} disabled={busy} className="mt-4 min-h-11 bg-asanda-orange-strong px-4 font-bold text-white">Publicar video</button></div>}
      <div className="mt-6 border-t border-asanda-line pt-5"><p className="text-sm leading-6 text-slate-600 dark:text-slate-300">Archivar retira el video del catálogo público, pero no revoca enlaces firmados ya emitidos ni elimina físicamente el recurso privado.</p><button type="button" onClick={archive} disabled={busy || selected.publicationStatus === 'archived'} className="mt-3 inline-flex min-h-11 items-center gap-2 border border-asanda-line px-4 font-bold disabled:opacity-50"><Archive size={17} />Archivar video</button></div></div>}
    </div>}
    {preview && <VideoPlayer video={preview.video} source={preview.source} loading={false} error={false} onClose={() => setPreview(null)} />}
  </section>;
}
