import { useRef, useState, useCallback, useEffect } from 'react';

export interface AudioState {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string | null;
}

export interface BookPage {
  pageNumber: number;
  imageUrl: string;
  audioUrl?: string;
  text?: string;
  duration?: number;
}

export interface AudioManagerHook {
  loadAndPlay: (pageNumber: number) => Promise<void>;
  loadAndPlaySequential: (pageNumbers: number[]) => Promise<void>;
  play: () => void;
  pause: () => void;
  stop: () => void;
  replay: () => void;
  setVolume: (volume: number) => void;
  preloadNext: (pageNumber: number) => void;
  state: AudioState;
}

export function useAudioManager(pages: BookPage[]): AudioManagerHook {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadRef = useRef<HTMLAudioElement | null>(null);
  const currentPageRef = useRef<number>(0);
  const isLoadingRef = useRef<boolean>(false);

  const [state, setState] = useState<AudioState>({
    isPlaying: false,
    isMuted: false,
    volume: 1.0,
    currentTime: 0,
    duration: 0,
    isLoading: false,
    error: null,
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (preloadRef.current) {
        preloadRef.current.src = '';
      }
    };
  }, []);

  // Update current time periodically
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => {
      setState(prev => ({
        ...prev,
        currentTime: audio.currentTime,
      }));
    };

    audio.addEventListener('timeupdate', updateTime);
    return () => audio.removeEventListener('timeupdate', updateTime);
  }, [audioRef.current]);

  const loadAndPlay = useCallback(async (pageNumber: number) => {
    const page = pages[pageNumber - 1];
    if (!page?.audioUrl) {
      setState(prev => ({
        ...prev,
        error: 'No audio available for this page',
        isLoading: false,
        isPlaying: false,
      }));
      return;
    }

    // Prevent loading the same page multiple times
    if (currentPageRef.current === pageNumber && audioRef.current && !isLoadingRef.current) {
      return;
    }

    // Prevent concurrent loads
    if (isLoadingRef.current) {
      console.log('⏳ Audio already loading, skipping...');
      return;
    }

    isLoadingRef.current = true;
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    currentPageRef.current = pageNumber;

    try {
      // Stop current audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }

      // Create new audio element
      const audio = new Audio(page.audioUrl);
      audioRef.current = audio;

      // Apply current volume and mute settings using refs to avoid dependency
      audio.volume = state.volume;
      audio.muted = state.isMuted;

      // Set up event listeners
      const handleLoadedMetadata = () => {
        setState(prev => ({
          ...prev,
          duration: audio.duration,
          isLoading: false,
        }));
      };

      const handleEnded = () => {
        setState(prev => ({
          ...prev,
          isPlaying: false,
          currentTime: 0,
        }));
      };

      const handleError = () => {
        // Only update state if this is still the current page
        if (currentPageRef.current === pageNumber) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            isPlaying: false,
            error: 'Audio failed to load',
          }));
        }
      };

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);

      // Wait for audio to be ready
      await new Promise<void>((resolve, reject) => {
        const canPlayHandler = () => {
          audio.removeEventListener('canplaythrough', canPlayHandler);
          resolve();
        };
        const errorHandler = () => {
          audio.removeEventListener('error', errorHandler);
          reject(new Error('Audio failed to load'));
        };

        audio.addEventListener('canplaythrough', canPlayHandler, { once: true });
        audio.addEventListener('error', errorHandler, { once: true });

        // Timeout after 30 seconds
        setTimeout(() => {
          audio.removeEventListener('canplaythrough', canPlayHandler);
          audio.removeEventListener('error', errorHandler);
          reject(new Error('Audio loading timed out'));
        }, 30000);
      });

      // Play audio
      await audio.play();
      setState(prev => ({
        ...prev,
        isPlaying: true,
        isLoading: false,
        error: null,
      }));
      isLoadingRef.current = false;

      // Preload next page
      if (pageNumber < pages.length) {
        preloadNext(pageNumber + 1);
      }
    } catch (error) {
      console.error('Error loading/playing audio:', error);
      isLoadingRef.current = false;
      // Only update state if this is still the current page
      if (currentPageRef.current === pageNumber) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isPlaying: false,
          error: error instanceof Error ? error.message : 'Audio playback failed',
        }));
      }
    }
  }, [pages]);

  const play = useCallback(() => {
    if (!audioRef.current) return;

    audioRef.current.play()
      .then(() => {
        setState(prev => ({ ...prev, isPlaying: true, error: null }));
      })
      .catch((error) => {
        console.error('Error playing audio:', error);
        setState(prev => ({
          ...prev,
          isPlaying: false,
          error: 'Audio playback failed',
        }));
      });
  }, []);

  const pause = useCallback(() => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const stop = useCallback(() => {
    if (!audioRef.current) return;

    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setState(prev => ({
      ...prev,
      isPlaying: false,
      currentTime: 0,
    }));
  }, []);

  const replay = useCallback(() => {
    if (!audioRef.current) return;

    audioRef.current.currentTime = 0;
    audioRef.current.play()
      .then(() => {
        setState(prev => ({ ...prev, isPlaying: true, currentTime: 0, error: null }));
      })
      .catch((error) => {
        console.error('Error replaying audio:', error);
        setState(prev => ({
          ...prev,
          isPlaying: false,
          error: 'Audio replay failed',
        }));
      });
  }, []);

  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }

    setState(prev => ({ ...prev, volume: clampedVolume }));
  }, []);

  const preloadNext = useCallback((pageNumber: number) => {
    const page = pages[pageNumber - 1];
    if (!page?.audioUrl) return;

    // Clean up previous preload
    if (preloadRef.current) {
      preloadRef.current.src = '';
    }

    // Create new preload audio element
    const preloadAudio = new Audio(page.audioUrl);
    preloadAudio.preload = 'auto';
    preloadRef.current = preloadAudio;
  }, [pages]);


  const loadAndPlaySequential = useCallback(async (pageNumbers: number[]) => {
    if (pageNumbers.length === 0) return;

    const pagesWithAudio = pageNumbers.filter(pageNum => {
      const page = pages[pageNum - 1];
      return page?.audioUrl;
    });

    if (pagesWithAudio.length === 0) {
      setState(prev => ({
        ...prev,
        error: 'No audio available for these pages',
        isLoading: false,
        isPlaying: false,
      }));
      return;
    }

    console.log(`🎵 Playing ${pagesWithAudio.length} audio files sequentially:`, pagesWithAudio);

    // Force load the first page by temporarily clearing currentPageRef
    const previousPage = currentPageRef.current;
    currentPageRef.current = -1;
    await loadAndPlay(pagesWithAudio[0]);
    
    // If only one page, we're done
    if (pagesWithAudio.length === 1) {
      return;
    }

    // Set up sequential playback for remaining pages
    if (audioRef.current) {
      let currentIndex = 0;
      
      const playNext = async () => {
        currentIndex++;
        if (currentIndex < pagesWithAudio.length) {
          console.log(`🎵 Playing next audio: page ${pagesWithAudio[currentIndex]}`);
          // Force load the next audio by temporarily clearing currentPageRef
          currentPageRef.current = -1;
          await loadAndPlay(pagesWithAudio[currentIndex]);
          
          // Set up listener for the next audio if there are more pages
          if (audioRef.current && currentIndex < pagesWithAudio.length - 1) {
            audioRef.current.addEventListener('ended', playNext, { once: true });
          }
        }
      };

      audioRef.current.addEventListener('ended', playNext, { once: true });
    }
  }, [pages, loadAndPlay]);
  return {
    loadAndPlay,
    loadAndPlaySequential,
    play,
    pause,
    stop,
    replay,
    setVolume,
    preloadNext,
    state,
  };
}
