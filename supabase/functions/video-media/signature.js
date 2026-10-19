export const VIDEO_FOLDER = 'asanda/videos';
export const VIDEO_MAX_BYTES = 100000000;
export const VIDEO_MIME_TYPE = 'video/mp4';
export const VIDEO_FORMAT = 'mp4';

const PUBLIC_ID_PATTERN = /^asanda\/videos\/[A-Za-z0-9_-]{1,180}$/;
const CLOUD_NAME_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export function canonicalize(params) {
  return Object.keys(params).sort().map((key) => `${key}=${params[key]}`).join('&');
}

export function createUploadSignature(params, apiSecret, sha1Hex) {
  return sha1Hex(`${canonicalize(params)}${apiSecret}`);
}

export function validateVideoFileDescriptor(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, error: 'file-missing' };
  if (typeof value.fileName !== 'string' || !value.fileName || /[\\/]/.test(value.fileName) || !/\.mp4$/i.test(value.fileName)) return { ok: false, error: 'name-invalid' };
  if (value.mimeType !== VIDEO_MIME_TYPE) return { ok: false, error: 'type-invalid' };
  if (!Number.isInteger(value.size) || value.size <= 0 || value.size > VIDEO_MAX_BYTES) return { ok: false, error: 'size-invalid' };
  return { ok: true };
}

export function validateVideoPublicId(value) {
  return typeof value === 'string' && PUBLIC_ID_PATTERN.test(value);
}

export function validateUploadPreset(value) {
  const settings = value?.settings;
  const formats = settings?.allowed_formats;
  const mp4Only = formats === VIDEO_FORMAT
    || (Array.isArray(formats) && formats.length === 1 && formats[0] === VIDEO_FORMAT);
  const valid = value?.unsigned === false
    && settings?.type === 'authenticated'
    && settings?.folder === VIDEO_FOLDER
    && mp4Only;
  return valid ? { ok: true } : { ok: false, error: 'preset-invalid' };
}

export function validateProviderAsset(value, expectedPublicId = value?.public_id) {
  const valid = validateVideoPublicId(expectedPublicId)
    && value?.public_id === expectedPublicId
    && value?.resource_type === 'video'
    && value?.type === 'authenticated'
    && value?.format === VIDEO_FORMAT
    && Number.isInteger(value?.bytes)
    && value.bytes > 0
    && value.bytes <= VIDEO_MAX_BYTES
    && typeof value?.duration === 'number'
    && Number.isFinite(value.duration)
    && value.duration > 0
    && Number.isInteger(value?.width)
    && value.width > 0
    && Number.isInteger(value?.height)
    && value.height > 0;
  return valid ? { ok: true } : { ok: false, error: 'asset-invalid' };
}

// Cloudinary URL signatures are the first eight base64url characters of the
// SHA-1 binary digest for the delivery path plus the API secret.
export async function createDeliverySignature(publicId, format, apiSecret, sha1Base64Url) {
  if (!validateVideoPublicId(publicId) || format !== VIDEO_FORMAT) throw new Error('INVALID_VIDEO_ID');
  return (await sha1Base64Url(`${publicId}.${format}${apiSecret}`)).slice(0, 8);
}

export async function buildAuthenticatedVideoUrl(cloudName, publicId, apiSecret, sha1Base64Url) {
  if (!CLOUD_NAME_PATTERN.test(cloudName || '')) throw new Error('INVALID_CLOUD_NAME');
  const signature = await createDeliverySignature(publicId, VIDEO_FORMAT, apiSecret, sha1Base64Url);
  const path = publicId.split('/').map(encodeURIComponent).join('/');
  return `https://res.cloudinary.com/${encodeURIComponent(cloudName)}/video/authenticated/s--${signature}--/${path}.mp4`;
}
