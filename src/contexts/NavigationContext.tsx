import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export type ReadingSystem = 'Grade' | 'RAZ' | 'Lexile';
export type MediaType = 'books' | 'read-to-me' | 'audiobooks' | 'video-books' | 'videos' | 'comics' | 'ai-voice-coach' | 'downloads';

interface NavigationState {
  selectedGrade: string;
  selectedMediaType: MediaType;
  selectedGenre: string;
  readingSystem: ReadingSystem;
  isFirstLogin: boolean;
}

interface NavigationContextType extends NavigationState {
  setGrade: (grade: string) => void;
  setMediaType: (type: MediaType) => void;
  setGenre: (genre: string) => void;
  setReadingSystem: (system: ReadingSystem) => void;
  setIsFirstLogin: (value: boolean) => void;
  resetFilters: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

const DEFAULT_STATE: NavigationState = {
  selectedGrade: '1',
  selectedMediaType: 'books',
  selectedGenre: 'All',
  readingSystem: 'Grade',
  isFirstLogin: false
};

interface NavigationProviderProps {
  children: ReactNode;
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  const [state, setState] = useState<NavigationState>(DEFAULT_STATE);

  // Load user preferences on mount
  useEffect(() => {
    const loadUserPreferences = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const readingSystem = user.user_metadata?.reading_level_system || 
                               user.user_metadata?.reading_level || 
                               'Grade';
          
          const isFirstLogin = !user.user_metadata?.reading_level_system && 
                              !user.user_metadata?.reading_level;
          
          setState(prev => ({
            ...prev,
            readingSystem: readingSystem as ReadingSystem,
            isFirstLogin
          }));
        }
      } catch (error) {
        console.error('Error loading user preferences:', error);
      }
    };

    loadUserPreferences();
  }, []);

  // Persist navigation state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('navigationState', JSON.stringify({
      selectedGrade: state.selectedGrade,
      selectedMediaType: state.selectedMediaType,
      selectedGenre: state.selectedGenre
    }));
  }, [state.selectedGrade, state.selectedMediaType, state.selectedGenre]);

  // Load navigation state from sessionStorage on mount
  useEffect(() => {
    const savedState = sessionStorage.getItem('navigationState');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        setState(prev => ({
          ...prev,
          ...parsed
        }));
      } catch (error) {
        console.error('Error parsing saved navigation state:', error);
      }
    }
  }, []);

  const setGrade = (grade: string) => {
    setState(prev => ({ ...prev, selectedGrade: grade }));
  };

  const setMediaType = (type: MediaType) => {
    setState(prev => ({ 
      ...prev, 
      selectedMediaType: type,
      // Reset genre when changing media type
      selectedGenre: 'All'
    }));
  };

  const setGenre = (genre: string) => {
    setState(prev => ({ ...prev, selectedGenre: genre }));
  };

  const setReadingSystem = async (system: ReadingSystem) => {
    setState(prev => ({ ...prev, readingSystem: system }));
    
    // Save to Supabase user metadata
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.auth.updateUser({
          data: {
            reading_level_system: system
          }
        });
      }
    } catch (error) {
      console.error('Error saving reading system preference:', error);
    }
  };

  const setIsFirstLogin = (value: boolean) => {
    setState(prev => ({ ...prev, isFirstLogin: value }));
  };

  const resetFilters = () => {
    setState(prev => ({
      ...prev,
      selectedGrade: DEFAULT_STATE.selectedGrade,
      selectedMediaType: DEFAULT_STATE.selectedMediaType,
      selectedGenre: DEFAULT_STATE.selectedGenre
    }));
  };

  const value: NavigationContextType = {
    ...state,
    setGrade,
    setMediaType,
    setGenre,
    setReadingSystem,
    setIsFirstLogin,
    resetFilters
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
