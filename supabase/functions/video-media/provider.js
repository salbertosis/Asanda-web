import { validateVideoPublicId } from './signature.js';

export function createCloudinaryProviderReader({ cloudName, apiKey, apiSecret, fetchImpl = fetch }) {
  const read = async (path) => {
    const response = await fetchImpl(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${path}`, {
      method: 'GET',
      headers: { Authorization: `Basic ${btoa(`${apiKey}:${apiSecret}`)}`, Accept: 'application/json' },
    });
    if (!response.ok) throw Object.assign(new Error('Provider read failed.'), { providerStatus: response.status });
    return response.json();
  };
  return {
    readUploadPreset(name) {
      return read(`upload_presets/${encodeURIComponent(name)}`);
    },
    async readProviderAsset(publicId, { mediaMetadata = false } = {}) {
      if (!validateVideoPublicId(publicId)) throw new Error('INVALID_VIDEO_ID');
      const query = mediaMetadata === true ? '?media_metadata=true' : '';
      return read(`resources/video/authenticated/${encodeURIComponent(publicId)}${query}`);
    },
  };
}
