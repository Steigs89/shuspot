import React, { createContext, useContext, ReactNode } from 'react';
import { useParentalControls } from '../hooks/useParentalControls';
import { ParentalControlsData } from '../api/parentalControls';

interface ParentalControlsContextType {
  controls: ParentalControlsData | null;
  loading: boolean;
  error: string | null;
  isEnabled: boolean;
  setupParentalControls: (pin: string) => Promise<{ success: boolean; error?: string }>;
  verifyPinCode: (pin: string) => Promise<boolean>;
  changePinCode: (oldPin: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
  updateGenres: (genres: string[]) => Promise<{ success: boolean; error?: string }>;
  updateMediaTypes: (mediaTypes: string[]) => Promise<{ success: boolean; error?: string }>;
  updateGradeLevels: (gradeLevels: string[]) => Promise<{ success: boolean; error?: string }>;
  checkContentBlocked: (genre?: string, mediaType?: string) => Promise<boolean>;
  reload: () => Promise<void>;
}

const ParentalControlsContext = createContext<ParentalControlsContextType | undefined>(undefined);

export function ParentalControlsProvider({ children }: { children: ReactNode }) {
  const parentalControls = useParentalControls();

  return (
    <ParentalControlsContext.Provider value={parentalControls}>
      {children}
    </ParentalControlsContext.Provider>
  );
}

export function useParentalControlsContext() {
  const context = useContext(ParentalControlsContext);
  if (context === undefined) {
    throw new Error('useParentalControlsContext must be used within a ParentalControlsProvider');
  }
  return context;
}
