import { getSupabase } from './supabase';
import { UserProject, CaptionStyle, CaptionItem, CaptionWord } from './store/types';

export interface SaveProjectParams {
  id?: string | null;
  userId: string;
  title: string;
  duration?: number;
  thumbnailUrl?: string | null;
  proxyUrl?: string | null;
  originalFilename?: string | null;
  captions?: CaptionItem[] | unknown[];
  rawWords?: CaptionWord[] | unknown[];
  style?: CaptionStyle | Record<string, unknown>;
  aspectRatio?: string;
  file?: File | null;
  storageTier?: 'free' | 'vip' | null;
  proxyExpiresAt?: string | null;
}

/**
 * Upload lightweight proxy to Cloudflare R2 via presigned URL
 */
export async function uploadProxyToR2(
  file: File | Blob,
  projectId: string,
  filename: string,
  storageTier: 'free' | 'vip' = 'free'
): Promise<string | null> {
  // Strategy 1: Direct Presigned URL (Ultra-fast direct-to-R2)
  try {
    const res = await fetch('/api/storage/proxy-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename,
        projectId,
        storageTier,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.isConfigured && json.uploadUrl && json.publicUrl) {
        try {
          const uploadRes = await fetch(json.uploadUrl, {
            method: 'PUT',
            body: file,
          });

          if (uploadRes.ok) {
            console.log('[R2 Proxy Upload] Uploaded successfully via Presigned URL:', json.publicUrl);
            return json.publicUrl;
          }
        } catch (corsErr) {
          console.warn('[R2 Proxy Upload] Presigned PUT blocked by CORS, trying server fallback:', corsErr);
        }
      }
    }
  } catch (err) {
    console.warn('[R2 Proxy Upload Presigned Route Error]:', err);
  }

  // Strategy 2: Server-side Direct Upload Fallback (100% CORS-immune)
  try {
    const formData = new FormData();
    formData.append('file', file, filename);
    formData.append('projectId', projectId);
    formData.append('storageTier', storageTier);

    const fallbackRes = await fetch('/api/storage/direct-upload', {
      method: 'POST',
      body: formData,
    });

    if (fallbackRes.ok) {
      const fallbackJson = await fallbackRes.json();
      if (fallbackJson.publicUrl) {
        console.log('[R2 Proxy Upload] Uploaded successfully via Server Fallback:', fallbackJson.publicUrl);
        return fallbackJson.publicUrl;
      }
    }
  } catch (fallbackErr) {
    console.warn('[R2 Proxy Upload Server Fallback Exception]:', fallbackErr);
  }

  return null;
}

/**
 * Universal Dual-Layer Project Saver (Server API + Direct Supabase SDK Fallback)
 */
export async function saveProjectToCloud(
  params: SaveProjectParams
): Promise<UserProject | null> {
  const {
    id,
    userId,
    title,
    duration = 0,
    thumbnailUrl = null,
    proxyUrl = null,
    originalFilename = null,
    captions = [],
    rawWords = [],
    style = {},
    aspectRatio = '9:16',
  } = params;

  const effectiveProxyUrl = proxyUrl;
  const effectiveOriginalFilename = originalFilename || params.file?.name || null;

  // 1. Try Server API first
  try {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: id || undefined,
        userId,
        title,
        duration,
        thumbnailUrl,
        proxyUrl: effectiveProxyUrl,
        originalFilename: effectiveOriginalFilename,
        captions,
        rawWords,
        style,
        aspectRatio,
        storageTier: params.storageTier,
        proxyExpiresAt: params.proxyExpiresAt,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.project) {
        // If file provided and proxyUrl not set yet, upload proxy in background
        if (params.file && !effectiveProxyUrl && data.project.id) {
          uploadProxyToR2(params.file, data.project.id, params.file.name, params.storageTier || 'free').then((url) => {
            if (url) {
              fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: data.project.id,
                  userId,
                  proxyUrl: url,
                  originalFilename: params.file?.name,
                  storageTier: params.storageTier,
                }),
              }).catch((e) => console.warn('[Background Proxy Update Error]:', e));
            }
          });
        }
        return data.project as UserProject;
      }
    }
  } catch (apiErr) {
    console.warn('[Save Project Server API Error, falling back to Client SDK]:', apiErr);
  }

  // 2. Direct Supabase Client SDK Fallback (Carries user Auth JWT session)
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const payload: Record<string, unknown> = {
      user_id: userId,
      title,
      duration,
      thumbnail_url: thumbnailUrl,
      captions,
      raw_words: rawWords,
      style,
      aspect_ratio: aspectRatio,
      updated_at: new Date().toISOString(),
    };

    if (effectiveProxyUrl) payload.proxy_url = effectiveProxyUrl;
    if (effectiveOriginalFilename) payload.original_filename = effectiveOriginalFilename;
    if (params.storageTier) payload.storage_tier = params.storageTier;
    if (params.proxyExpiresAt !== undefined) {
      payload.proxy_expires_at = params.proxyExpiresAt;
    } else if (params.storageTier === 'vip') {
      payload.proxy_expires_at = null;
    } else if (effectiveProxyUrl) {
      payload.proxy_expires_at = new Date(Date.now() + 7 * 86400 * 1000).toISOString();
    }

    if (id) {
      payload.id = id;
      const { data, error } = await supabase
        .from('user_projects')
        .upsert(payload)
        .select()
        .single();

      if (!error && data) return data as UserProject;
    } else {
      const { data, error } = await supabase
        .from('user_projects')
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!error && data) return data as UserProject;
    }
  } catch (sdkErr) {
    console.error('[Save Project Client SDK Exception]:', sdkErr);
  }

  return null;
}

/**
 * Universal Dual-Layer Project Loader
 */
export async function fetchProjectsFromCloud(userId: string): Promise<UserProject[]> {
  // 1. Try Server API
  try {
    const res = await fetch(`/api/projects?userId=${encodeURIComponent(userId)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.projects) && data.projects.length > 0) {
        return data.projects as UserProject[];
      }
    }
  } catch (apiErr) {
    console.warn('[Fetch Projects Server API Error]:', apiErr);
  }

  // 2. Fallback to Supabase Client SDK
  const supabase = getSupabase();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('user_projects')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(30);

    if (!error && data) {
      return data as UserProject[];
    }
  } catch (sdkErr) {
    console.warn('[Fetch Projects Client SDK Error]:', sdkErr);
  }

  return [];
}

/**
 * Universal Dual-Layer Project Deleter
 */
export async function deleteProjectFromCloud(id: string, userId: string): Promise<boolean> {
  // 1. Server API
  try {
    const res = await fetch(`/api/projects?id=${encodeURIComponent(id)}&userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    });
    if (res.ok) return true;
  } catch (apiErr) {
    console.warn('[Delete Project Server API Error]:', apiErr);
  }

  // 2. Client SDK Fallback
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('user_projects')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    return !error;
  } catch {
    return false;
  }
}
