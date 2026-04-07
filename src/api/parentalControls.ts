import { supabase } from '../lib/supabase';

export interface ParentalControlsData {
  id?: string;
  user_id: string;
  pin_hash: string;
  blocked_genres: string[];
  blocked_media_types: string[];
  restricted_grade_levels?: string[];
  created_at?: string;
  updated_at?: string;
}

/**
 * Get parental controls settings for a user
 */
export async function getParentalControls(userId: string): Promise<ParentalControlsData | null> {
  try {
    const { data, error } = await supabase
      .from('parental_controls')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No record found
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching parental controls:', error);
    throw error;
  }
}

/**
 * Create parental controls settings for a user
 */
export async function createParentalControls(
  data: Omit<ParentalControlsData, 'id' | 'created_at' | 'updated_at'>
): Promise<ParentalControlsData> {
  try {
    const { data: result, error } = await supabase
      .from('parental_controls')
      .insert({
        user_id: data.user_id,
        pin_hash: data.pin_hash,
        blocked_genres: data.blocked_genres,
        blocked_media_types: data.blocked_media_types
      })
      .select()
      .single();

    if (error) throw error;

    return result;
  } catch (error) {
    console.error('Error creating parental controls:', error);
    throw error;
  }
}

/**
 * Update parental controls settings
 */
export async function updateParentalControls(
  userId: string,
  updates: Partial<Omit<ParentalControlsData, 'id' | 'user_id' | 'created_at'>>
): Promise<ParentalControlsData> {
  try {
    const { data, error } = await supabase
      .from('parental_controls')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error updating parental controls:', error);
    throw error;
  }
}

/**
 * Update blocked genres
 */
export async function updateBlockedGenres(
  userId: string,
  blockedGenres: string[]
): Promise<ParentalControlsData> {
  return updateParentalControls(userId, { blocked_genres: blockedGenres });
}

/**
 * Update blocked media types
 */
export async function updateBlockedMediaTypes(
  userId: string,
  blockedMediaTypes: string[]
): Promise<ParentalControlsData> {
  return updateParentalControls(userId, { blocked_media_types: blockedMediaTypes });
}

/**
 * Update restricted grade levels
 */
export async function updateRestrictedGradeLevels(
  userId: string,
  restrictedGradeLevels: string[]
): Promise<ParentalControlsData> {
  return updateParentalControls(userId, { restricted_grade_levels: restrictedGradeLevels });
}

/**
 * Update PIN hash
 */
export async function updatePinHash(
  userId: string,
  pinHash: string
): Promise<ParentalControlsData> {
  return updateParentalControls(userId, { pin_hash: pinHash });
}

/**
 * Delete parental controls settings
 */
export async function deleteParentalControls(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('parental_controls')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting parental controls:', error);
    throw error;
  }
}

/**
 * Check if content is blocked for a user
 */
export async function isContentBlocked(
  userId: string,
  genre?: string,
  mediaType?: string
): Promise<boolean> {
  try {
    const controls = await getParentalControls(userId);
    
    if (!controls) return false;

    if (genre && controls.blocked_genres.includes(genre)) {
      return true;
    }

    if (mediaType && controls.blocked_media_types.includes(mediaType)) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking if content is blocked:', error);
    return false;
  }
}
