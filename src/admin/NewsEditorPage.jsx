import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Send } from 'lucide-react';
import { createNews, getNewsById, publishNews, updateNews } from '../services/admin/news';
import { renderSafeBody, validateNewsInput } from '../services/admin/editorialLogic';
import { getAdminMediaUrl, listPublicImageMedia } from '../services/admin/media';

const errorMessages = {
  'title-invalid': 'El título debe tener entre 3 y 120 caracteres.',
  'slug-invalid': 'El slug solo admite minúsculas, números y guiones.',
  'summary-too-long': 'El resumen no puede superar los 280 caracteres.',
  'category-too-long': 'La categoría no puede superar los 40 caracteres.',
  'body-too-long': 'El cuerpo no puede superar los 20000 caracteres.',
  'body-unsafe': 'El cuerpo no puede contener HTML ni enlaces inseguros.',
};

const generateSlug = (title) =>
  title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const inputClass = 'mt-2 min-h-12 w-full rounded-md border border-asanda-line px-3 font-normal';

const NewsEditorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', slug: '', category: '', summary: '', body: '', heroAssetId: '' });
  const [images, setImages] = useState([]);
  const [imagesUnavailable, setImagesUnavailable] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [loading, setLoading] = useState(id ? true : false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);

  useEffect(() => {
    let active = true;
    listPublicImageMedia().then((items) => {
      if (active) setImages(items);
    }).catch(() => {
      if (active) setImagesUnavailable(true);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    let active = true;
    getNewsById(id).then((item) => {
      if (!active) return;
      if (!item) {
        navigate('/admin/noticias', { replace: true });
        return;
      }
      setForm({ title: item.title, slug: item.slug, category: item.category ?? '', summary: item.summary ?? '', body: item.body ?? '', heroAssetId: item.heroAssetId ?? '' });
      setCurrentStatus(item.status);
      setLoading(false);
    }).catch(() => {
      if (active) {
        setError('No fue posible cargar la noticia. Volvé a la lista e intentá nuevamente.');
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [id, navigate]);

  const setField = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const persist = async (publish) => {
    const validation = validateNewsInput(form);
    if (!validation.ok) {
      setError(errorMessages[validation.errors[0]] ?? 'Revisá los campos marcados.');
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      let articleId = id;
      if (!articleId) {
        const created = await createNews(form);
        articleId = created.id;
        navigate(`/admin/noticias/${articleId}`, { replace: true });
      } else {
        await updateNews(articleId, form);
      }
      if (publish) await publishNews(articleId);
      if (publish) setCurrentStatus('published');
      else if (!editing) setCurrentStatus('draft');
      setSaved(publish ? 'Noticia publicada.' : 'Cambios guardados.');
    } catch {
      setError('No fue posible guardar la noticia. Intentá nuevamente.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <p role="status" className="rounded-md border border-asanda-line bg-white p-6 text-sm font-semibold text-asanda-deep">Cargando noticia…</p>;
  }

  const editing = Boolean(id);
  const selectedImage = images.find((image) => image.id === form.heroAssetId);
  const selectedImageUrl = getAdminMediaUrl(selectedImage, { width: 800, height: 450, crop: 'fill' });

  return (
    <section aria-labelledby="news-editor-title">
      <Link to="/admin/noticias" className="inline-flex min-h-10 items-center gap-1.5 font-bold text-asanda-deep hover:text-asanda-orange">
        <ArrowLeft size={17} aria-hidden="true" />
        Volver a noticias
      </Link>
      <div className="mt-3">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-asanda-deep">Módulo editorial</p>
        <h1 id="news-editor-title" className="mt-2 font-display text-3xl font-bold sm:text-4xl">
          {editing ? 'Editar noticia' : 'Nueva noticia'}
        </h1>
      </div>

      {error && <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</p>}
      {saved && <p role="status" className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{saved}</p>}

      <form className="mt-6 grid gap-6 lg:grid-cols-2" onSubmit={(event) => { event.preventDefault(); persist(false); }}>
        <div className="space-y-5 rounded-[14px] border border-asanda-line bg-white p-5 sm:p-6">
          <label className="block text-sm font-bold text-asanda-ink">
            Título
            <input className={inputClass} type="text" maxLength={120} required value={form.title} onChange={setField('title')} />
          </label>
          <label className="block text-sm font-bold text-asanda-ink">
            Slug
            <input className={inputClass} type="text" required value={form.slug} onChange={setField('slug')} aria-describedby="slug-hint" />
          </label>
          <button type="button" onClick={() => setForm((prev) => ({ ...prev, slug: generateSlug(prev.title) }))} className="inline-flex min-h-10 items-center px-2 font-bold text-asanda-deep hover:text-asanda-orange">
            Generar slug desde el título
          </button>
          <p id="slug-hint" className="text-xs text-slate-500">Minúsculas, números y guiones: ejemplo-para-la-web</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-bold text-asanda-ink">
              Categoría
              <input className={inputClass} type="text" maxLength={40} value={form.category} onChange={setField('category')} placeholder="Competencias" />
            </label>
            <label className="block text-sm font-bold text-asanda-ink">
              Resumen
              <input className={inputClass} type="text" maxLength={280} value={form.summary} onChange={setField('summary')} placeholder="Resumen breve para el portal" />
            </label>
          </div>
          <div>
            <label className="block text-sm font-bold text-asanda-ink">
              Imagen principal
              <select className={inputClass} value={form.heroAssetId} onChange={setField('heroAssetId')}>
                <option value="">Sin imagen</option>
                {form.heroAssetId && !selectedImage && <option value={form.heroAssetId}>Imagen actual</option>}
                {images.map((image) => (
                  <option key={image.id} value={image.id}>{image.altText || image.publicId || 'Imagen sin descripción'}</option>
                ))}
              </select>
            </label>
            {imagesUnavailable && (
              <p role="status" className="mt-2 text-sm text-amber-800">
                No se pudo cargar la biblioteca. Podés guardar los demás cambios sin modificar la imagen actual.
              </p>
            )}
            <Link to="/admin/media" className="mt-2 inline-flex min-h-10 items-center font-bold text-asanda-deep underline hover:text-asanda-orange">
              Subir una imagen a la biblioteca
            </Link>
          </div>
          <label className="block text-sm font-bold text-asanda-ink">
            Cuerpo (markdown seguro)
            <textarea className={`${inputClass} min-h-64 resize-y leading-6`} maxLength={20000} value={form.body} onChange={setField('body')} aria-describedby="body-hint" placeholder="## Subtítulo\n\nTexto del artículo\n\n> Cita destacada" />
          </label>
          <p id="body-hint" className="text-xs leading-5 text-slate-500">Usá ## para subtítulos, ### para apartados y &gt; para citas. También admite **negritas**, *cursivas*, enlaces, listas con - y bloques separados por una línea vacía. No admite HTML.</p>
        </div>

        <div className="rounded-[14px] border border-asanda-line bg-white p-5 sm:p-6">
          <h2 className="font-display text-xl font-bold text-asanda-ink">Vista previa</h2>
          <div className="mt-4 min-h-64 rounded-md border border-asanda-line bg-asanda-foam p-4 leading-7 text-slate-700 [&_a]:underline [&_a]:text-asanda-deep [&_blockquote]:border-l-4 [&_blockquote]:border-asanda-orange [&_blockquote]:pl-4 [&_h2]:mt-5 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mt-4 [&_h3]:text-xl [&_h3]:font-bold [&_strong]:font-bold [&_ul]:list-disc [&_ul]:pl-6 [&_p]:mb-3 [&_p]:last:mb-0">
            {selectedImageUrl && <img src={selectedImageUrl} alt={selectedImage.altText || form.title || 'Imagen principal de la noticia'} className="mb-4 aspect-video w-full rounded-md object-cover" />}
            <h3 className="font-display text-2xl font-bold text-asanda-ink">{form.title || 'Sin título'}</h3>
            {form.category && <p className="mt-1 text-xs font-bold uppercase tracking-wide text-asanda-deep">{form.category}</p>}
            {form.summary && <p className="mt-3 font-semibold text-slate-800">{form.summary}</p>}
            <div className="mt-4" dangerouslySetInnerHTML={{ __html: renderSafeBody(form.body) }} />
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="submit" disabled={busy} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 bg-asanda-deep px-4 font-bold text-white transition-colors hover:bg-asanda-navy disabled:cursor-wait disabled:opacity-70">
              <Save size={18} aria-hidden="true" />
              {busy ? 'Guardando…' : 'Guardar'}
            </button>
            {currentStatus !== 'published' && (
              <button type="button" disabled={busy} onClick={() => persist(true)} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 bg-asanda-orange-strong px-4 font-bold text-white transition-colors hover:bg-[#a94320] disabled:cursor-wait disabled:opacity-70">
                <Send size={18} aria-hidden="true" />
                {busy ? 'Publicando…' : 'Publicar'}
              </button>
            )}
          </div>
        </div>
      </form>
    </section>
  );
};

export default NewsEditorPage;
