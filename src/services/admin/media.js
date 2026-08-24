import { supabase } from '../supabase';
import { getCloudinaryUrl } from '../../config/cloudinary';

const MEDIA_SELECT = 'id,provider,public_id,external_url,resource_type,format,width,height,bytes,alt_text,is_public,created_at';

const normalizeMedia = (row) => ({
  id: row.id, provider: row.provider, publicId: row.public_id, externalUrl: row.external_url,
  resourceType: row.resource_type, format: row.format, width: row.width, height: row.height,
  bytes: row.bytes, altText: row.alt_text, isPublic: row.is_public, createdAt: row.created_at,
});

export const getAdminMediaUrl = (asset, options = {}) => {
  if (asset?.provider === 'cloudinary' && asset.publicId) return getCloudinaryUrl(asset.publicId, options);
  return asset?.externalUrl || null;
};

export const listAdminMedia = async () => {
  const { data, error } = await supabase.from('media_assets').select(MEDIA_SELECT).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalizeMedia);
};

export const listPublicImageMedia = async () => {
  const { data, error } = await supabase.from('media_assets').select(MEDIA_SELECT)
    .eq('resource_type', 'image').eq('is_public', true).order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalizeMedia);
};

export const requestUploadSignature = async (folder) => {
  const { data, error } = await supabase.functions.invoke('sign-media-upload', { body: { folder } });
  if (error) throw error;
  return data;
};

export const insertMediaAsset = async (asset) => {
  if (!asset?.publicId) throw new Error('Datos de imagen inválidos.');
  const { data, error } = await supabase.from('media_assets').insert({
    provider: 'cloudinary',
    public_id: asset.publicId,
    resource_type: 'image',
    format: asset.format,
    width: asset.width,
    height: asset.height,
    bytes: asset.bytes,
    alt_text: asset.altText,
    is_public: asset.isPublic ?? true,
  }).select('id,provider,public_id,format,width,height,bytes,alt_text,is_public').single();
  if (error) throw error;
  return data;
};

const cloudinaryPublicIdPattern = /^[A-Za-z0-9][A-Za-z0-9_/-]*$/;

export const normalizeCloudinaryPublicId = (value) => {
  const publicId = String(value ?? '').trim();
  if (
    !publicId
    || publicId.length > 255
    || !cloudinaryPublicIdPattern.test(publicId)
    || publicId.endsWith('/')
    || publicId.includes('//')
  ) {
    const error = new Error('El Public ID de Cloudinary no es válido.');
    error.code = 'invalid-public-id';
    throw error;
  }
  return publicId;
};

export const registerExistingCloudinaryImage = async ({ publicId, altText }) => {
  const normalizedPublicId = normalizeCloudinaryPublicId(publicId);
  const normalizedAltText = String(altText ?? '').trim();
  if (!normalizedAltText || normalizedAltText.length > 200) {
    const error = new Error('El texto alternativo es obligatorio y debe tener hasta 200 caracteres.');
    error.code = 'invalid-alt-text';
    throw error;
  }

  try {
    return await insertMediaAsset({
      publicId: normalizedPublicId,
      format: null,
      width: null,
      height: null,
      bytes: null,
      altText: normalizedAltText,
      isPublic: true,
    });
  } catch (error) {
    if (error?.code === '23505' || /duplicate|unique/i.test(error?.message ?? '')) {
      const duplicateError = new Error('Esta imagen ya está registrada en la biblioteca.');
      duplicateError.code = 'duplicate-public-id';
      throw duplicateError;
    }
    throw error;
  }
};
