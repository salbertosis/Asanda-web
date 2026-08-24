import React, { useCallback, useEffect, useState } from 'react';
import { ImagePlus, RefreshCw, Upload } from 'lucide-react';
import { getCloudinaryUrl } from '../config/cloudinary';
import { insertMediaAsset, listAdminMedia, requestUploadSignature } from '../services/admin/media';
import { validateImageFile } from '../services/admin/editorialLogic';

const UPLOAD_FOLDER = 'asanda/noticias';

const fileErrors = {
  'file-missing': 'Seleccioná una imagen para subir.',
  'name-invalid': 'El nombre del archivo no es válido.',
  'type-unsupported': 'Solo se admiten imágenes JPG, PNG o WebP.',
  'size-invalid': 'La imagen debe pesar menos de 8 MB.',
};

const formatBytes = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const AdminMediaPage = () => {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [file, setFile] = useState(null);
  const [altText, setAltText] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setItems(await listAdminMedia());
    } catch {
      setError('No fue posible cargar las imágenes. Intentá nuevamente.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const upload = async (event) => {
    event.preventDefault();
    setNotice(null);
    if (!file) {
      setNotice({ type: 'error', text: 'Seleccioná una imagen para subir.' });
      return;
    }
    const validation = validateImageFile(file);
    if (!validation.ok) {
      setNotice({ type: 'error', text: fileErrors[validation.error] ?? 'La imagen no es válida.' });
      return;
    }
    setBusy(true);
    try {
      const signature = await requestUploadSignature(UPLOAD_FOLDER);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', signature.folder);
      formData.append('timestamp', String(signature.timestamp));
      formData.append('api_key', signature.apiKey);
      formData.append('signature', signature.signature);
      const response = await fetch(signature.uploadUrl, { method: 'POST', body: formData });
      if (!response.ok) throw new Error('upload-failed');
      const uploaded = await response.json();
      await insertMediaAsset({
        publicId: uploaded.public_id,
        format: uploaded.format,
        width: uploaded.width,
        height: uploaded.height,
        bytes: uploaded.bytes,
        altText: altText.trim() || null,
      });
      setFile(null);
      setAltText('');
      event.target.elements.file.value = '';
      setNotice({ type: 'success', text: 'Imagen publicada en la biblioteca.' });
      await load();
    } catch {
      setNotice({ type: 'error', text: 'No fue posible subir la imagen. Intentá nuevamente.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="admin-media-title">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-asanda-deep">Módulo editorial</p>
        <h1 id="admin-media-title" className="mt-2 font-display text-3xl font-bold sm:text-4xl">Imágenes</h1>
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

      {notice && (
        <p role={notice.type === 'error' ? 'alert' : 'status'} className={`mt-6 rounded-md border p-4 text-sm font-semibold ${notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          {notice.text}
        </p>
      )}

      <form onSubmit={upload} className="mt-6 rounded-[14px] border border-asanda-line bg-white p-5 sm:p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-bold text-asanda-ink">
            Imagen (JPG, PNG o WebP, hasta 8 MB)
            <input className="mt-2 block w-full rounded-md border border-asanda-line p-3 text-sm font-normal" type="file" name="file" accept="image/jpeg,image/png,image/webp" required onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </label>
          <label className="block text-sm font-bold text-asanda-ink">
            Texto alternativo (accesibilidad)
            <input className="mt-2 min-h-12 w-full rounded-md border border-asanda-line px-3 font-normal" type="text" maxLength={200} value={altText} onChange={(event) => setAltText(event.target.value)} placeholder="Descripción breve de la imagen" />
          </label>
        </div>
        <button type="submit" disabled={busy} className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 bg-asanda-orange-strong px-5 font-bold text-white transition-colors hover:bg-[#a94320] disabled:cursor-wait disabled:opacity-70">
          <Upload size={18} aria-hidden="true" />
          {busy ? 'Subiendo…' : 'Subir imagen'}
        </button>
      </form>

      {!items && !error && (
        <p role="status" className="mt-6 rounded-md border border-asanda-line bg-white p-6 text-sm font-semibold text-asanda-deep">Cargando imágenes…</p>
      )}

      {items && items.length === 0 && !error && (
        <div className="mt-6 rounded-[14px] border border-dashed border-asanda-line bg-white p-10 text-center">
          <ImagePlus className="mx-auto text-asanda-deep" size={36} aria-hidden="true" />
          <p className="mt-3 font-bold text-asanda-ink">La biblioteca de imágenes está vacía.</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Subí la primera imagen para usarla en las noticias.</p>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <li key={item.id} className="overflow-hidden rounded-[14px] border border-asanda-line bg-white">
              <img src={getCloudinaryUrl(item.publicId, { width: 320, height: 320 })} alt={item.altText ?? item.publicId} className="h-36 w-full object-cover sm:h-44" loading="lazy" />
              <div className="p-3">
                <p className="truncate text-sm font-bold text-asanda-ink" title={item.publicId}>{item.publicId}</p>
                <p className="mt-1 text-xs text-slate-500">{item.format?.toUpperCase()} · {formatBytes(item.bytes)}{item.width ? ` · ${item.width}×${item.height}` : ''}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default AdminMediaPage;
