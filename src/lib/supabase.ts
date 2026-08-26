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
 * Add a new word pair to Supabase custom dictionary
 */
export async function insertDictionaryEntryToCloud(entry: {
  wrong_word: string;
  correct_word: string;
  category?: string;
}): Promise<SupabaseResponse<DictionaryEntry>> {
  const supabase = getSupabase();
  if (!supabase) {
    return { data: null, error: 'Supabase URL or Key is missing' };
  }

  try {
    const { data, error } = await supabase
      .from('custom_dictionary')
      .insert([
        {
          wrong_word: entry.wrong_word.trim(),
          correct_word: entry.correct_word.trim(),
          category: entry.category || 'general',
        },
      ])
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as DictionaryEntry, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to insert dictionary entry';
    return { data: null, error: msg };
  }
}

/**
 * Update an existing dictionary entry
 */
export async function updateDictionaryEntryInCloud(
  id: number,
  entry: {
    wrong_word: string;
    correct_word: string;
    category?: string;
  }
): Promise<SupabaseResponse<DictionaryEntry>> {
  const supabase = getSupabase();
  if (!supabase) {
    return { data: null, error: 'Supabase URL or Key is missing' };
  }

  try {
    const { data, error } = await supabase
      .from('custom_dictionary')
      .update({
        wrong_word: entry.wrong_word.trim(),
        correct_word: entry.correct_word.trim(),
        category: entry.category || 'general',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as DictionaryEntry, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update dictionary entry';
    return { data: null, error: msg };
  }
}

/**
 * Delete a dictionary entry by id
 */
export async function deleteDictionaryEntryFromCloud(id: number): Promise<SupabaseResponse<boolean>> {
  const supabase = getSupabase();
  if (!supabase) {
    return { data: false, error: 'Supabase URL or Key is missing' };
  }

  try {
    const { error } = await supabase.from('custom_dictionary').delete().eq('id', id);

    if (error) {
      return { data: false, error: error.message };
    }

    return { data: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to delete dictionary entry';
    return { data: false, error: msg };
  }
}

/**
 * Batch seed starter words to Supabase
 */
export async function seedStarterWordsToCloud(): Promise<SupabaseResponse<number>> {
  const supabase = getSupabase();
  if (!supabase) {
    return { data: 0, error: 'Supabase URL or Key is missing' };
  }

  try {
    const records = DEFAULT_THAI_DICTIONARY.map((item) => ({
      wrong_word: item.wrong_word.trim(),
      correct_word: item.correct_word.trim(),
      category: item.category,
    }));

    const { data, error } = await supabase
      .from('custom_dictionary')
      .upsert(records, { onConflict: 'wrong_word' })
      .select();

    if (error) {
      return { data: 0, error: error.message };
    }

    return { data: data?.length || 0, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to seed dictionary';
    return { data: 0, error: msg };
  }
}
