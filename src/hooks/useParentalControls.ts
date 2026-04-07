import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  getParentalControls,
  createParentalControls,
  updateBlockedGenres,
  updateBlockedMediaTypes,
  updateRestrictedGradeLevels,
  updatePinHash,
  isContentBlocked,
  ParentalControlsData
} from '../api/parentalControls';
import { hashPin, verifyPin } from '../api/pinService';

export function useParentalControls() {
  const [userId, setUserId] = useState<string | null>(null);
  const [controls, setControls] = useState<ParentalControlsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  // Load parental controls on mount
  useEffect(() => {
    if (userId) {
      loadControls();
    } else {
      setLoading(false);
    }
  }, [userId]);

  const loadControls = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getParentalControls(userId);
      setControls(data);
    } catch (err) {
      console.error('Error loading parental controls:', err);
      setError('Failed to load parental controls settings');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Create initial parental controls with PIN
  const setupParentalControls = useCallback(async (pin: string) => {
    if (!userId) {
      throw new Error('User not logged in');
    }

    try {
      const pinHash = await hashPin(pin);
      const data = await createParentalControls({
        user_id: userId,
        pin_hash: pinHash,
        blocked_genres: [],
        blocked_media_types: []
      });
      setControls(data);
      return { success: true };
    } catch (err) {
      console.error('Error setting up parental controls:', err);
      return { success: false, error: 'Setup failed, please try again' };
    }
  }, [userId]);

  // Verify PIN
  const verifyPinCode = useCallback(async (pin: string): Promise<boolean> => {
    if (!controls?.pin_hash) return false;

    try {
      return await verifyPin(pin, controls.pin_hash);
    } catch (err) {
      console.error('Error verifying PIN:', err);
      return false;
    }
  }, [controls?.pin_hash]);

  // Update PIN
  const changePinCode = useCallback(async (oldPin: string, newPin: string) => {
    if (!userId || !controls) {
      throw new Error('User not logged in or parental controls not set up');
    }

    try {
      // Verify old PIN
      const isValid = await verifyPinCode(oldPin);
      if (!isValid) {
        return { success: false, error: 'Current PIN is incorrect' };
      }

      // Hash and update new PIN
      const newPinHash = await hashPin(newPin);
      const updated = await updatePinHash(userId, newPinHash);
      setControls(updated);
      return { success: true };
    } catch (err) {
      console.error('Error changing PIN:', err);
      return { success: false, error: 'Failed to change PIN, please try again' };
    }
  }, [userId, controls, verifyPinCode]);

  // Update blocked genres
  const updateGenres = useCallback(async (genres: string[]) => {
    if (!userId) {
      throw new Error('User not logged in');
    }

    try {
      const updated = await updateBlockedGenres(userId, genres);
      setControls(updated);
      return { success: true };
    } catch (err) {
      console.error('Error updating blocked genres:', err);
      return { success: false, error: 'Update failed, please try again' };
    }
  }, [userId]);

  // Update blocked media types
  const updateMediaTypes = useCallback(async (mediaTypes: string[]) => {
    if (!userId) {
      throw new Error('User not logged in');
    }

    try {
      const updated = await updateBlockedMediaTypes(userId, mediaTypes);
      setControls(updated);
      return { success: true };
    } catch (err) {
      console.error('Error updating blocked media types:', err);
      return { success: false, error: 'Update failed, please try again' };
    }
  }, [userId]);

  // Update restricted grade levels
  const updateGradeLevels = useCallback(async (gradeLevels: string[]) => {
    if (!userId) {
      throw new Error('User not logged in');
    }

    try {
      const updated = await updateRestrictedGradeLevels(userId, gradeLevels);
      setControls(updated);
      return { success: true };
    } catch (err) {
      console.error('Error updating restricted grade levels:', err);
      return { success: false, error: 'Update failed, please try again' };
    }
  }, [userId]);

  // Check if specific content is blocked
  const checkContentBlocked = useCallback(async (
    genre?: string,
    mediaType?: string
  ): Promise<boolean> => {
    if (!userId) return false;

    try {
      return await isContentBlocked(userId, genre, mediaType);
    } catch (err) {
      console.error('Error checking content blocked:', err);
      return false;
    }
  }, [userId]);

  // Check if parental controls are enabled
  const isEnabled = !!controls;

  return {
    controls,
    loading,
    error,
    isEnabled,
    setupParentalControls,
    verifyPinCode,
    changePinCode,
    updateGenres,
    updateMediaTypes,
    updateGradeLevels,
    checkContentBlocked,
    reload: loadControls
  };
}
