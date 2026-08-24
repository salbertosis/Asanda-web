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
