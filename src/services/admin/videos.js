import { supabase } from '../supabase';

export const VIDEO_MAX_BYTES = 100000000;
const VIDEO_SELECT = 'id,slug,title,description,provider,provider_video_id,duration_seconds,thumbnail_asset_id,publication_status,published_at,created_at,updated_at';
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EDITABLE_KEYS = new Set(['title', 'slug', 'description', 'thumbnailAssetId']);
const PUBLIC_ID_PATTERN = /^asanda\/videos\/[A-Za-z0-9_-]{1,180}$/;

const exactId = (value) => {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) throw new Error('VIDEO_ID_INVALID');
  return value;
};
const normalizeVideo = (row) => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  description: row.description ?? null,
  provider: row.provider,
  providerVideoId: row.provider_video_id,
  durationSeconds: row.duration_seconds,
  thumbnailAssetId: row.thumbnail_asset_id ?? null,
  publicationStatus: row.publication_status,
  publishedAt: row.published_at ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
const videoInput = (input, exact = false) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('VIDEO_INPUT_INVALID');
  if (exact && Object.keys(input).some((key) => !EDITABLE_KEYS.has(key))) throw new Error('VIDEO_INPUT_INVALID');
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  const slug = typeof input.slug === 'string' ? input.slug.trim() : '';
  const description = typeof input.description === 'string' ? input.description.trim() : '';
  const thumbnailAssetId = input.thumbnailAssetId ?? null;
  if (title.length < 3 || title.length > 120 || !SLUG_PATTERN.test(slug) || description.length > 2000
    || (thumbnailAssetId !== null && (typeof thumbnailAssetId !== 'string' || !ID_PATTERN.test(thumbnailAssetId)))) throw new Error('VIDEO_INPUT_INVALID');
  return { title, slug, description, thumbnailAssetId };
};
const invoke = async (body) => {
  const { data, error } = await supabase.functions.invoke('video-media', { body });
  if (error) throw error;
  return data;
};

export function validateVideoFile(file) {
  if (!file || typeof file !== 'object') return { ok: false, error: 'file-missing' };
  if (typeof file.name !== 'string' || !file.name || /[\\/]/.test(file.name) || !/\.mp4$/i.test(file.name)) return { ok: false, error: 'name-invalid' };
  if (file.type !== 'video/mp4') return { ok: false, error: 'type-invalid' };
  if (!Number.isInteger(file.size) || file.size <= 0 || file.size > VIDEO_MAX_BYTES) return { ok: false, error: 'size-invalid' };
  return { ok: true };
}

export async function requestVideoUploadSignature(file) {
  if (!validateVideoFile(file).ok) throw new Error('VIDEO_FILE_INVALID');
  const data = await invoke({ action: 'sign-upload', fileName: file.name, mimeType: file.type, size: file.size });
  if (!data?.upload) throw new Error('VIDEO_SIGNATURE_INVALID');
  return data.upload;
}

export async function uploadVideoToCloudinary(file, upload, { signal, fetchImpl = fetch } = {}) {
  if (!validateVideoFile(file).ok) throw new Error('VIDEO_FILE_INVALID');
  const baseKeys = ['uploadUrl', 'apiKey', 'timestamp', 'type', 'uploadPreset', 'signature'];
  const legacyKeys = new Set([...baseKeys, 'cloudName', 'folderMode', 'folder']);
  const dynamicKeys = new Set([...baseKeys, 'cloudName', 'folderMode', 'assetFolder', 'useAssetFolderAsPublicIdPrefix']);
  let uploadUrl;
  try { uploadUrl = new URL(upload?.uploadUrl); } catch { uploadUrl = null; }
  const safeOrigin = uploadUrl?.protocol === 'https:'
    && uploadUrl.hostname === 'api.cloudinary.com'
    && /^\/v1_1\/[A-Za-z0-9_-]+\/video\/upload$/.test(uploadUrl.pathname)
    && !uploadUrl.search
    && !uploadUrl.hash;
  const baseValid = upload && baseKeys.every((key) => upload[key] !== undefined)
    && upload.type === 'authenticated'
    && safeOrigin
    && (!upload.cloudName || uploadUrl.pathname === `/v1_1/${upload.cloudName}/video/upload`);
  const dynamic = upload?.folderMode === 'dynamic';
  const modeValid = dynamic
    ? Object.keys(upload).every((key) => dynamicKeys.has(key))
      && upload.assetFolder === 'asanda/videos'
      && upload.useAssetFolderAsPublicIdPrefix === true
    : (upload?.folderMode === undefined || upload.folderMode === 'legacy')
      && Object.keys(upload ?? {}).every((key) => legacyKeys.has(key))
      && upload?.folder === 'asanda/videos';
  if (!baseValid || !modeValid) throw new Error('VIDEO_SIGNATURE_INVALID');

  const body = new FormData();
  body.append('file', file);
  body.append('api_key', String(upload.apiKey));
  body.append('timestamp', String(upload.timestamp));
  if (dynamic) {
    body.append('asset_folder', upload.assetFolder);
    body.append('use_asset_folder_as_public_id_prefix', 'true');
  } else {
    body.append('folder', upload.folder);
  }
  body.append('type', upload.type);
  body.append('upload_preset', upload.uploadPreset);
  body.append('signature', upload.signature);
  let response;
  try { response = await fetchImpl(upload.uploadUrl, { method: 'POST', body, signal }); } catch (error) {
    if (error?.name === 'AbortError') throw error;
    const uploadError = new Error('VIDEO_PROVIDER_UPLOAD_FAILED'); uploadError.code = 'provider-upload-failed'; throw uploadError;
  }
  if (!response.ok) { const error = new Error('VIDEO_PROVIDER_UPLOAD_FAILED'); error.code = 'provider-upload-failed'; throw error; }
  let data;
  try { data = await response.json(); } catch { data = null; }
  if (!PUBLIC_ID_PATTERN.test(data?.public_id ?? '')) { const error = new Error('VIDEO_PROVIDER_RESPONSE_INVALID'); error.code = 'provider-response-invalid'; throw error; }
  return { publicId: data.public_id };
}

const REGISTRATION_ERRORS = new Map([
  [401, new Set(['No autorizado.'])],
  [403, new Set(['No tenés permiso para gestionar videos.'])],
  [409, new Set(['El video o el slug ya está registrado.'])],
  [422, new Set(['Los datos del borrador no son válidos.', 'El archivo privado no cumple el contrato MP4 de ASANDA.'])],
  [500, new Set(['Error interno al gestionar el video.'])],
  [502, new Set(['El archivo quedó privado en Cloudinary, pero no se pudo registrar el borrador.'])],
]);

const REGISTRATION_REASONS = new Map([
  ['provider-access-denied', 'Cloudinary rechazó la consulta. Revisá los permisos de la clave del servidor.'],
  ['provider-not-found', 'Cloudinary no encontró el recurso autenticado consultado.'],
  ['provider-rate-limited', 'Cloudinary limitó temporalmente las consultas.'],
  ['provider-unavailable', 'No se pudo consultar el recurso en Cloudinary.'],
  ['id-invalid', 'El identificador devuelto por Cloudinary no coincide con el solicitado.'],
  ['resource-type-invalid', 'Cloudinary no identificó el recurso como video.'],
  ['delivery-type-invalid', 'El recurso no tiene tipo de entrega authenticated.'],
  ['format-invalid', 'El formato verificado por Cloudinary no es MP4.'],
  ['bytes-invalid', 'El tamaño verificado no es válido o supera los 100 MB.'],
  ['duration-invalid', 'Cloudinary no devolvió una duración válida y positiva.'],
  ['dimensions-invalid', 'Cloudinary no devolvió dimensiones válidas y positivas.'],
]);
const RESOURCE_REJECTION = 'El archivo privado no cumple el contrato MP4 de ASANDA.';

export async function registerVideoDraft({ publicId, title, slug, description = '' }) {
  const input = videoInput({ title, slug, description });
  if (!PUBLIC_ID_PATTERN.test(publicId ?? '')) throw new Error('VIDEO_INPUT_INVALID');
  try {
    const data = await invoke({ action: 'register', publicId, title: input.title, slug: input.slug, description: input.description });
    if (!data?.video || data.video.publicationStatus !== 'draft') throw new Error('VIDEO_REGISTRATION_INVALID');
    return data.video;
  } catch (cause) {
    const error = new Error('El archivo puede permanecer privado en Cloudinary porque no se pudo registrar el borrador.');
    error.code = 'video-registration-failed';
    error.privateAssetMayRemain = true;
    error.publicId = publicId;
    error.cause = cause;
    try {
      const context = cause?.context;
      const body = await context.clone().json();
      if (REGISTRATION_ERRORS.get(context.status)?.has(body?.error)) {
        error.registrationStatus = context.status;
        error.registrationDetail = body.error;
        if (context.status === 422 && body.error === RESOURCE_REJECTION && REGISTRATION_REASONS.has(body.reason)) {
          error.registrationReason = body.reason;
        }
      }
    } catch { /* Unreadable or unknown responses keep the safe generic message. */ }
    throw error;
  }
}

export async function uploadAndRegisterVideoDraft({ file, title, slug, description = '', signal, fetchImpl = fetch }) {
  const upload = await requestVideoUploadSignature(file);
  const asset = await uploadVideoToCloudinary(file, upload, { signal, fetchImpl });
  return registerVideoDraft({ ...asset, title, slug, description });
}

export async function compareVideoDuration(publicId) {
  if (!PUBLIC_ID_PATTERN.test(publicId ?? '')) throw new Error('VIDEO_INPUT_INVALID');
  const data = await invoke({ action: 'compare-duration', publicId });
  const keys = (value, expected) => value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === expected.length && Object.keys(value).every(key => expected.includes(key));
  const labels = new Map([['missing', 'ausente'], ['invalid', 'inválida'], ['valid', 'válida']]);
  const part = (value) => keys(value, ['duration', 'validAsset']) && labels.has(value.duration)
    && typeof value.validAsset === 'boolean' && (!value.validAsset || value.duration === 'valid');
  const comparison = data?.comparison;
  if (!keys(data, ['comparison']) || !keys(comparison, ['baseline', 'withMetadata', 'sameResource'])
    || !part(comparison.baseline) || !part(comparison.withMetadata) || typeof comparison.sameResource !== 'boolean') {
    throw new Error('VIDEO_COMPARISON_INVALID');
  }
  const describe = (value) => `duración ${labels.get(value.duration)}; validación ${value.validAsset ? 'completa' : 'rechazada'}`;
  return `Consulta habitual: ${describe(comparison.baseline)}. Con metadatos: ${describe(comparison.withMetadata)}. Mismo recurso y versión: ${comparison.sameResource ? 'sí' : 'no'}. No se modificó ni registró el archivo.`;
}

export async function listAdminVideos() {
  const { data, error } = await supabase.from('videos').select(VIDEO_SELECT).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalizeVideo);
}

export async function getAdminVideo(id) {
  const { data, error } = await supabase.from('videos').select(VIDEO_SELECT).eq('id', exactId(id)).maybeSingle();
  if (error) throw error;
  return data ? normalizeVideo(data) : null;
}

const managedVideo = async (id) => {
  const current = await getAdminVideo(id);
  if (!current || current.provider !== 'cloudinary' || !PUBLIC_ID_PATTERN.test(current.providerVideoId ?? '')) throw new Error('VIDEO_NOT_MANAGED');
  return current;
};
const mutateManagedVideo = async (current, payload) => {
  const { data, error } = await supabase.from('videos').update(payload)
    .eq('id', current.id).eq('provider', 'cloudinary').eq('provider_video_id', current.providerVideoId)
    .select(VIDEO_SELECT).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('VIDEO_CHANGED');
  return normalizeVideo(data);
};

export async function updateAdminVideo(id, input) {
  const values = videoInput(input, true);
  const current = await managedVideo(id);
  return mutateManagedVideo(current, { title: values.title, slug: values.slug, description: values.description || null, thumbnail_asset_id: values.thumbnailAssetId });
}

export async function publishAdminVideo(id, publishedAt = new Date().toISOString()) {
  const videoId = exactId(id);
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) throw new Error('VIDEO_DATE_INVALID');
  const data = await invoke({ action: 'publish', videoId, publishedAt: date.toISOString() });
  if (!data?.video || data.video.id !== videoId || data.video.publicationStatus !== 'published') throw new Error('VIDEO_PUBLICATION_INVALID');
  return data.video;
}

export async function archiveAdminVideo(id) {
  const current = await managedVideo(id);
  return mutateManagedVideo(current, { publication_status: 'archived', published_at: null });
}

export async function requestVideoPreview(videoId) {
  const data = await invoke({ action: 'preview', videoId: exactId(videoId) });
  if (!data?.url || !data?.videoId) throw new Error('VIDEO_PREVIEW_INVALID');
  return data;
}

export function formatVideoError(error) {
  const code = String(error?.code ?? '').toLowerCase();
  const message = String(error?.message ?? error ?? '').toLowerCase();
  if (error?.name === 'AbortError') return 'La carga del video fue cancelada.';
  if (code === 'video-registration-failed') {
    const warning = 'El MP4 puede permanecer privado en Cloudinary: no se pudo registrar el borrador.';
    if (!REGISTRATION_ERRORS.get(error.registrationStatus)?.has(error.registrationDetail)) return warning;
    const reason = error.registrationStatus === 422 && error.registrationDetail === RESOURCE_REJECTION
      ? REGISTRATION_REASONS.get(error.registrationReason) : null;
    return `${warning} ${error.registrationStatus}: ${error.registrationDetail}${reason ? ` ${reason}` : ''}`;
  }
  if (code.includes('provider-upload') || message.includes('provider_upload')) return 'No se pudo subir el MP4. Revisá la conexión e intentá nuevamente.';
  if (code === '23505' || /duplicate|unique/.test(message)) return 'Ese video o slug ya está registrado.';
  if (message.includes('file_invalid') || message.includes('input_invalid')) return `Seleccioná un MP4 válido de hasta ${VIDEO_MAX_BYTES} bytes (100 MB) y revisá título y slug.`;
  return 'No se pudo completar la operación de video.';
}
