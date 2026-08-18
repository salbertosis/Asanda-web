import { supabase } from '../supabase';

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