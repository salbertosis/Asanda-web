import {
  VIDEO_FOLDER, VIDEO_MAX_BYTES, buildAuthenticatedVideoUrl, createUploadSignature,
  validateProviderAsset, validateUploadPreset, validateVideoFileDescriptor, validateVideoPublicId,
} from './signature.js';

const ALLOWED_ROLES = new Set(['administrator', 'editor']);
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store', Vary: 'Authorization' };
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const response = (status, body, extraHeaders = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { ...CORS_HEADERS, ...PRIVATE_HEADERS, 'Content-Type': 'application/json', ...extraHeaders },
});
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, allowed) => isObject(value) && Object.keys(value).every((key) => allowed.has(key));
const duplicate = (error) => error?.code === '23505' || /duplicate|unique/i.test(String(error?.message ?? ''));
const validId = (value) => typeof value === 'string' && ID_PATTERN.test(value);
const protectedAction = (action) => ['sign-upload', 'register', 'preview', 'publish', 'compare-duration'].includes(action);

function normalizeVideo(row) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description ?? null,
    provider: row.provider,
    providerVideoId: row.provider_video_id,
    durationSeconds: row.duration_seconds,
    thumbnailAssetId: row.thumbnail_asset_id ?? null,
    publicationStatus: row.publication_status,
    publishedAt: row.published_at ?? null,
  };
}

function validateDraftInput(body) {
  if (!exactKeys(body, new Set(['action', 'publicId', 'title', 'slug', 'description']))) return null;
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  if (!validateVideoPublicId(body.publicId) || title.length < 3 || title.length > 120 || !SLUG_PATTERN.test(slug) || description.length > 2000) return null;
  return { publicId: body.publicId, title, slug, description: description || null };
}

async function requireEditor(deps, authorization) {
  if (!authorization?.match(/^Bearer\s+\S+$/)) return { error: response(401, { error: 'No autorizado.' }) };
  let actor;
  try { actor = await deps.authenticate(authorization); } catch { actor = null; }
  if (!actor) return { error: response(401, { error: 'No autorizado.' }) };
  if (!actor.isActive || !ALLOWED_ROLES.has(actor.role)) return { error: response(403, { error: 'No tenés permiso para gestionar videos.' }) };
  return { actor };
}

function canDeliver(row, now, publicOnly) {
  if (!row || row.provider !== 'cloudinary' || !validateVideoPublicId(row.provider_video_id)) return false;
  if (!publicOnly) return true;
  const published = typeof row.published_at === 'string' ? Date.parse(row.published_at) : NaN;
  return row.publication_status === 'published' && Number.isFinite(published) && published <= now.getTime();
}

export function createVideoMediaHandler(deps) {
  return async function videoMediaHandler(request) {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
    if (request.method !== 'POST') return response(405, { error: 'Método no permitido.' });

    let body;
    try { body = await request.json(); } catch { return response(422, { error: 'La solicitud no contiene JSON válido.' }); }
    if (!isObject(body) || typeof body.action !== 'string') return response(422, { error: 'Solicitud de video inválida.' });

    let actor = null;
    if (protectedAction(body.action)) {
      const authorization = request.headers.get('Authorization');
      const auth = await requireEditor(deps, authorization);
      if (auth.error) return auth.error;
      actor = auth.actor;
    }

    if (body.action === 'compare-duration') {
      if (!exactKeys(body, new Set(['action', 'publicId'])) || !validateVideoPublicId(body.publicId)) {
        return response(422, { error: 'El Public ID del video no es válido.' });
      }
      try {
        const baseline = await deps.readProviderAsset(body.publicId, { mediaMetadata: false });
        const withMetadata = await deps.readProviderAsset(body.publicId, { mediaMetadata: true });
        const summarize = (asset) => ({
          duration: asset?.duration === undefined ? 'missing'
            : typeof asset.duration === 'number' && Number.isFinite(asset.duration) && asset.duration > 0 ? 'valid' : 'invalid',
          validAsset: validateProviderAsset(asset, body.publicId).ok,
        });
        const identity = (asset) => asset?.public_id === body.publicId && asset?.resource_type === 'video'
          && asset?.type === 'authenticated' && typeof asset?.asset_id === 'string' && asset.asset_id.length > 0
          && Number.isInteger(asset?.version) && asset.version > 0;
        return response(200, { comparison: {
          baseline: summarize(baseline),
          withMetadata: summarize(withMetadata),
          sameResource: identity(baseline) && identity(withMetadata)
            && baseline.asset_id === withMetadata.asset_id && baseline.version === withMetadata.version,
        } });
      } catch {
        return response(502, { error: 'No se pudo comparar la duración del video.' });
      }
    }

    if (body.action === 'sign-upload') {
      if (!exactKeys(body, new Set(['action', 'fileName', 'mimeType', 'size'])) || !validateVideoFileDescriptor(body).ok) {
        return response(422, { error: `Seleccioná un MP4 válido de hasta ${VIDEO_MAX_BYTES} bytes (100 MB).` });
      }
      let preset;
      try { preset = await deps.readUploadPreset(deps.uploadPreset); } catch { preset = null; }
      const presetValidation = validateUploadPreset(preset);
      if (!presetValidation.ok) return response(503, { error: 'La carga privada de videos no está configurada de forma segura.' });
      const timestamp = Math.floor(deps.now().getTime() / 1000);
      const signed = { ...presetValidation.uploadParameters, timestamp, type: 'authenticated', upload_preset: deps.uploadPreset };
      const signature = await createUploadSignature(signed, deps.apiSecret, deps.sha1Hex);
      const base = {
        uploadUrl: `https://api.cloudinary.com/v1_1/${encodeURIComponent(deps.cloudName)}/video/upload`,
        cloudName: deps.cloudName,
        apiKey: deps.apiKey,
        type: 'authenticated',
        uploadPreset: deps.uploadPreset,
        timestamp,
        signature,
      };
      const upload = presetValidation.folderMode === 'dynamic'
        ? { ...base, folderMode: 'dynamic', assetFolder: VIDEO_FOLDER, useAssetFolderAsPublicIdPrefix: true }
        : { ...base, folder: VIDEO_FOLDER };
      return response(200, { upload });
    }

    if (body.action === 'register') {
      const input = validateDraftInput(body);
      if (!input) return response(422, { error: 'Los datos del borrador no son válidos.' });
      let providerAsset;
      let readReason = 'provider-unavailable';
      try { providerAsset = await deps.readProviderAsset(input.publicId); } catch (error) {
        const status = error?.providerStatus;
        if (status === 401 || status === 403) readReason = 'provider-access-denied';
        else if (status === 404) readReason = 'provider-not-found';
        else if (status === 429) readReason = 'provider-rate-limited';
      }
      const validation = validateProviderAsset(providerAsset, input.publicId);
      if (!validation.ok) {
        return response(422, {
          error: 'El archivo privado no cumple el contrato MP4 de ASANDA.',
          reason: providerAsset == null ? readReason : validation.reason,
        });
      }
      const payload = {
        title: input.title,
        slug: input.slug,
        description: input.description,
        provider: 'cloudinary',
        provider_video_id: input.publicId,
        duration_seconds: Math.ceil(providerAsset.duration),
        thumbnail_asset_id: null,
        publication_status: 'draft',
        published_at: null,
      };
      try {
        const row = await deps.insertDraft(payload, actor.id);
        return response(201, { video: normalizeVideo(row) });
      } catch (error) {
        if (duplicate(error)) return response(409, { error: 'El video o el slug ya está registrado.' });
        return response(502, { error: 'El archivo quedó privado en Cloudinary, pero no se pudo registrar el borrador.' });
      }
    }

    if (body.action === 'publish') {
      if (!exactKeys(body, new Set(['action', 'videoId', 'publishedAt'])) || !validId(body.videoId) || typeof body.publishedAt !== 'string') {
        return response(422, { error: 'Publicación de video inválida.' });
      }
      const publishedAt = new Date(body.publishedAt);
      if (Number.isNaN(publishedAt.getTime())) return response(422, { error: 'Fecha de publicación inválida.' });
      let row;
      try { row = await deps.readVideo(body.videoId, { public: false, actorId: actor.id }); } catch { row = null; }
      if (!canDeliver(row, deps.now(), false)) return response(404, { error: 'Video no disponible.' });
      let providerAsset;
      try { providerAsset = await deps.readProviderAsset(row.provider_video_id); } catch { providerAsset = null; }
      if (!validateProviderAsset(providerAsset, row.provider_video_id).ok) {
        return response(422, { error: `El archivo privado debe ser un MP4 válido de hasta ${VIDEO_MAX_BYTES} bytes (100 MB).` });
      }
      try {
        const published = await deps.publishVideo(row.id, publishedAt.toISOString(), row.provider_video_id);
        return response(200, { video: normalizeVideo(published) });
      } catch {
        return response(409, { error: 'El video cambió antes de publicarse. Recargá e intentá nuevamente.' });
      }
    }

    if (body.action === 'preview' || body.action === 'playback') {
      if (!exactKeys(body, new Set(['action', 'videoId'])) || !validId(body.videoId)) return response(422, { error: 'Video inválido.' });
      const publicOnly = body.action === 'playback';
      let row;
      try { row = await deps.readVideo(body.videoId, { public: publicOnly, actorId: actor?.id ?? null }); } catch { row = null; }
      if (!canDeliver(row, deps.now(), publicOnly)) return response(404, { error: 'Video no disponible.' });
      let url;
      try { url = await buildAuthenticatedVideoUrl(deps.cloudName, row.provider_video_id, deps.apiSecret, deps.sha1Base64Url); } catch { return response(404, { error: 'Video no disponible.' }); }
      return response(200, { videoId: row.id, title: row.title, url });
    }

    return response(422, { error: 'Acción de video inválida.' });
  };
}
