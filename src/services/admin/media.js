import { supabase } from '../supabase';

export const listAdminMedia = async () => {
  const { data, error } = await supabase.from('media_assets').select('id,provider,public_id,format,width,height,bytes,alt_text,is_public,created_at').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id, provider: row.provider, publicId: row.public_id, format: row.format,
    width: row.width, height: row.height, bytes: row.bytes, altText: row.alt_text, isPublic: row.is_public, createdAt: row.created_at,
  }));
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