import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DictionaryEntry, DEFAULT_THAI_DICTIONARY } from './default-dictionary';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!supabaseInstance && supabaseUrl && supabaseAnonKey) {
    try {
      supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
    }
  }
  return supabaseInstance;
}

export interface SupabaseResponse<T> {
  data: T | null;
  error: string | null;
  isTableMissing?: boolean;
}

/**
 * Fetch all custom dictionary entries from Supabase
 */
export async function fetchCustomDictionaryFromCloud(): Promise<SupabaseResponse<DictionaryEntry[]>> {
  const supabase = getSupabase();
  if (!supabase) {
    return { data: [], error: 'Supabase URL or Key is missing' };
  }

  try {
    const { data, error } = await supabase
      .from('custom_dictionary')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return { data: [], error: error.message, isTableMissing: true };
      }
      return { data: [], error: error.message };
    }

    return { data: (data as DictionaryEntry[]) || [], error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error fetching dictionary';
    return { data: [], error: msg };
  }
}

/**
 * Add a new word pair to Supabase custom dictionary via secure server API
 */
export async function insertDictionaryEntryToCloud(
  entry: {
    wrong_word: string;
    correct_word: string;
    category?: string;
  },
  adminToken?: string | null
): Promise<SupabaseResponse<DictionaryEntry>> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminToken) {
      headers['x-admin-token'] = adminToken;
    }

    const res = await fetch('/api/admin/dictionary', {
      method: 'POST',
      headers,
      body: JSON.stringify(entry),
    });

    const json = await res.json();
    if (!res.ok || json.error) {
      return { data: null, error: json.error || 'Failed to insert entry' };
    }

    return { data: json.data as DictionaryEntry, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return { data: null, error: msg };
  }
}

/**
 * Update an existing dictionary entry via secure server API
 */
export async function updateDictionaryEntryInCloud(
  id: number,
  entry: {
    wrong_word: string;
    correct_word: string;
    category?: string;
  },
  adminToken?: string | null
): Promise<SupabaseResponse<DictionaryEntry>> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminToken) {
      headers['x-admin-token'] = adminToken;
    }

    const res = await fetch('/api/admin/dictionary', {
      method: 'PUT',
      headers,
      body: JSON.stringify({ id, ...entry }),
    });

    const json = await res.json();
    if (!res.ok || json.error) {
      return { data: null, error: json.error || 'Failed to update entry' };
    }

    return { data: json.data as DictionaryEntry, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return { data: null, error: msg };
  }
}

/**
 * Delete a dictionary entry by id via secure server API
 */
export async function deleteDictionaryEntryFromCloud(
  id: number,
  adminToken?: string | null
): Promise<SupabaseResponse<boolean>> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminToken) {
      headers['x-admin-token'] = adminToken;
    }

    const res = await fetch('/api/admin/dictionary', {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ id }),
    });

    const json = await res.json();
    if (!res.ok || json.error) {
      return { data: false, error: json.error || 'Failed to delete entry' };
    }

    return { data: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return { data: false, error: msg };
  }
}

/**
 * Batch seed starter words to Supabase via secure server API
 */
export async function seedStarterWordsToCloud(
  adminToken?: string | null
): Promise<SupabaseResponse<number>> {
  try {
    const records = DEFAULT_THAI_DICTIONARY.map((item) => ({
      wrong_word: item.wrong_word.trim(),
      correct_word: item.correct_word.trim(),
      category: item.category,
    }));

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminToken) {
      headers['x-admin-token'] = adminToken;
    }

    const res = await fetch('/api/admin/dictionary', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'seed', entries: records }),
    });

    const json = await res.json();
    if (!res.ok || json.error) {
      return { data: 0, error: json.error || 'Failed to seed dictionary' };
    }

    return { data: json.count || 0, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return { data: 0, error: msg };
  }
}
