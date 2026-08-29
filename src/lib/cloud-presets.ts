import { getSupabase } from './supabase';
import { CaptionStyle } from './store';

export interface CloudPreset {
  id: string;
  user_id: string;
  name: string;
  style: CaptionStyle;
  created_at: string;
}

/**
 * Fetch all custom presets for a given user from Supabase
 */
export async function fetchCloudPresets(userId: string): Promise<CloudPreset[]> {
  const supabase = getSupabase();
  if (!supabase || !userId) return [];

  try {
    const { data, error } = await supabase
      .from('custom_presets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching cloud presets:', error.message);
      return [];
    }

    return (data as CloudPreset[]) || [];
  } catch (err) {
    console.warn('Network error fetching cloud presets:', err);
    return [];
  }
}

/**
 * Save a new custom preset to Supabase
 */
export async function saveCloudPreset(
  userId: string,
  name: string,
  style: CaptionStyle
): Promise<CloudPreset | null> {
  const supabase = getSupabase();
  if (!supabase || !userId) return null;

  try {
    const { data, error } = await supabase
      .from('custom_presets')
      .insert([
        {
          user_id: userId,
          name: name.trim(),
          style,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error saving cloud preset:', error.message);
      throw new Error(error.message);
    }

    return data as CloudPreset;
  } catch (err) {
    console.error('Network error saving cloud preset:', err);
    throw err;
  }
}

/**
 * Delete a custom preset from Supabase
 */
export async function deleteCloudPreset(presetId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase || !presetId) return false;

  try {
    const { error } = await supabase
      .from('custom_presets')
      .delete()
      .eq('id', presetId);

    if (error) {
      console.error('Error deleting cloud preset:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Network error deleting cloud preset:', err);
    return false;
  }
}
