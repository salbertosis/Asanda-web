import { createClient } from 'npm:@supabase/supabase-js@2.112.3';
import { createVideoMediaHandler } from './handler.js';

function requiredSecret(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error('Missing server configuration.');
  return value;
}

async function sha1Bytes(value: string) {
  return new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(value)));
}
async function sha1Hex(value: string) {
  return [...await sha1Bytes(value)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
async function sha1Base64Url(value: string) {
  const binary = String.fromCharCode(...await sha1Bytes(value));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

Deno.serve(async (request) => {
  try {
    const supabaseUrl = requiredSecret('SUPABASE_URL');
    const anonKey = requiredSecret('SUPABASE_ANON_KEY');
    const cloudName = requiredSecret('CLOUDINARY_CLOUD_NAME');
    const apiKey = requiredSecret('CLOUDINARY_API_KEY');
    const apiSecret = requiredSecret('CLOUDINARY_API_SECRET');
    const uploadPreset = requiredSecret('CLOUDINARY_VIDEO_UPLOAD_PRESET');
    const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
    const publicClient = createClient(supabaseUrl, anonKey, clientOptions);
    let actorClient: ReturnType<typeof createClient> | null = null;

    const providerJson = async (path: string) => {
      const authorization = `Basic ${btoa(`${apiKey}:${apiSecret}`)}`;
      const providerResponse = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/${path}`, {
        method: 'GET',
        headers: { Authorization: authorization, Accept: 'application/json' },
      });
      if (!providerResponse.ok) throw new Error('Provider read failed.');
      return providerResponse.json();
    };

    const handler = createVideoMediaHandler({
      cloudName,
      apiKey,
      apiSecret,
      uploadPreset,
      now: () => new Date(),
      sha1Hex,
      sha1Base64Url,
      async authenticate(authorization: string) {
        actorClient = createClient(supabaseUrl, anonKey, { ...clientOptions, global: { headers: { Authorization: authorization } } });
        const { data: authData, error: authError } = await actorClient.auth.getUser();
        if (authError || !authData?.user) return null;
        const { data: profile, error: profileError } = await actorClient.from('profiles').select('role,is_active').eq('id', authData.user.id).maybeSingle();
        if (profileError || !profile) return null;
        return { id: authData.user.id, role: profile.role, isActive: profile.is_active };
      },
      readUploadPreset(name: string) {
        return providerJson(`upload_presets/${encodeURIComponent(name)}`);
      },
      readProviderAsset(publicId: string) {
        return providerJson(`resources/video/authenticated/${encodeURIComponent(publicId)}`);
      },
      async insertDraft(payload: Record<string, unknown>) {
        if (!actorClient) throw new Error('Missing actor client.');
        const { data, error } = await actorClient.from('videos').insert(payload).select('id,slug,title,description,provider,provider_video_id,duration_seconds,thumbnail_asset_id,publication_status,published_at').single();
        if (error) throw error;
        return data;
      },
      async readVideo(id: string, options: { public: boolean }) {
        const client = options.public ? publicClient : actorClient;
        if (!client) return null;
        const { data, error } = await client.from('videos').select('id,slug,title,description,provider,provider_video_id,duration_seconds,thumbnail_asset_id,publication_status,published_at').eq('id', id).maybeSingle();
        if (error) throw error;
        return data;
      },
      async publishVideo(id: string, publishedAt: string, expectedPublicId: string) {
        if (!actorClient) throw new Error('Missing actor client.');
        const { data, error } = await actorClient.from('videos')
          .update({ publication_status: 'published', published_at: publishedAt })
          .eq('id', id).eq('provider', 'cloudinary').eq('provider_video_id', expectedPublicId)
          .select('id,slug,title,description,provider,provider_video_id,duration_seconds,thumbnail_asset_id,publication_status,published_at').maybeSingle();
        if (error || !data) throw error ?? new Error('Video changed.');
        return data;
      },
    });
    return await handler(request);
  } catch {
    return new Response(JSON.stringify({ error: 'Error interno al gestionar el video.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store', Vary: 'Authorization' },
    });
  }
});
