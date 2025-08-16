import React, { useState, useEffect } from 'react';
import { useMemo } from 'react';
import { UserStatsProvider, useUserStats } from './contexts/UserStatsContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import TrialStatusBanner from './components/TrialStatusBanner';
import { supabase } from './lib/supabase';
import Header from './components/Header';
import BookCard from './components/BookCard';
import BookCardWithHover from './components/BookCardWithHover';
import BookOverview from './components/BookOverview';
import VoiceCoachingDashboard from './components/VoiceCoachingDashboard';
import VoiceCoachingPractice from './components/VoiceCoachingPractice';
import ReadToMeDashboard from './components/ReadToMeDashboard';
import ReadToMeBookOverview from './components/ReadToMeBookOverview';
import ReadToMeBookCover from './components/ReadToMeBookCover';
import ReadAlongInterface from './components/ReadAlongInterface';
import VoiceCoachPracticeInterface from './components/VoiceCoachPracticeInterface';
import AudiobookPlayer from './components/AudiobookPlayer';
import PdfReadAlongInterface from './components/PdfReadAlongInterface';
import { BookOpen, Video, Mic, Volume2, Book, User, Settings, LogOut, Upload, Clock, Star, PlayCircle, Play } from 'lucide-react';
import { userProfile, featuredBooks, recommendedBooks } from './data/mockData';
import { READING_LEVELS, GENRES, MEDIA_TYPES, BookFilters as BookFiltersType, DEFAULT_FILTERS, matchesFilters, getUniqueValues } from './data/filterData';
import AuthFlow from './components/auth/AuthFlow';
import UserPortal from './components/UserPortal';
import FileUploadDashboard from './components/FileUploadDashboard';
import PdfBookOverview from './components/PdfBookOverview';
import PdfViewer from './components/PdfViewer';
import CategoryDropdown from './components/CategoryDropdown';
import VideoBookPlayer from './components/VideoBookPlayer';
import BookFiltersComponent from './components/BookFilters';
import bookOpenIcon from './assets/92df9bc81af05dba2bb22a47171f9837-removebg-preview.png';
import bookAllIcon from './assets/video-education-3d-icon-download-in-png-blend-fbx-gltf-file-formats--online-learning-digital-pack-school-icons-7285452-removebg-preview.png';
import bookVoiceIcon from './assets/audiobook-3d-icon-download-in-png-blend-fbx-gltf-file-formats--desk-science-highlighter-library-pack-school-education-icons-11333837-removebg-preview.png';
import bookMicIcon from './assets/voice-record-3d-icon-download-in-png-blend-fbx-gltf-file-formats--message-chat-essential-pack-user-interface-icons-5576210-removebg-preview.png';
import bookBooksIcon from './assets/8529901-removebg-preview.png';
import bookReadIcon from './assets/language-book-3d-icon-education-literature_431668-1675-removebg-preview.png';
import stargazingBg from './assets/vecteezy_a-father-and-son-stargazing-together-under-a-serene-night_50730280.jpg';
import cozyBedroomBg from './assets/vecteezy_a-cozy-bedroom-at-night-with-a-full-moon-bookshelf-lamp_47783104.jpg';
import booksBg from './assets/kldo_4atl_220426.jpg';
import mainContentBg from './assets/5922295.jpg';
import appLogo from './assets/SS Logo Final Black With Color Spots HR.png';
import volcanoBookBg from './assets/vecteezy_book-with-scene-of-volcano-eruption_7092921.jpg';
import hippoWaterBg from './assets/vecteezy_funny-cartoon-hippo-lying-in-water-vector_16265457.jpg';



interface PdfBookData {
  id: string;
  title: string;
  author: string;
  cover: string;
  pdfUrl: string;
  gradeLevel: string;
  mediaType: string;
  genre: string;
  totalPages: number;
  file: File;
  pagesRead?: number; // Track reading progress
}

interface VideoBookData {
  id: string;
  title: string;
  author: string;
  cover: string; // Video thumbnail
  videoUrl: string; // Object URL of video file
  gradeLevel: string;
  mediaType: string;
  genre: string;
  duration: number; // Duration in seconds
  file: File;
}

// IndexedDB utilities for better file storage
const DB_NAME = 'ReadToMeApp';
const DB_VERSION = 3; // Increased version to handle existing databases
const PDF_STORE = 'pdfBooks';
const VIDEO_STORE = 'videoBooks';

// Helper function to get user-specific store names
const getUserSpecificStoreName = (baseStoreName: string, userId: string | null) => {
  return userId ? `${baseStoreName}_${userId}` : baseStoreName;
};

const openDB = async (userSpecificStores: string[] = []): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    // Simple approach: just open the database without version conflicts
    const request = indexedDB.open(DB_NAME);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      
      // Check if we need to create user-specific stores
      const missingStores = userSpecificStores.filter(storeName => !db.objectStoreNames.contains(storeName));
      
      if (missingStores.length > 0) {
        // Close current connection and reopen with version upgrade
        const currentVersion = db.version;
        db.close();
        const upgradeRequest = indexedDB.open(DB_NAME, currentVersion + 1);
        
        upgradeRequest.onerror = () => reject(upgradeRequest.error);
        upgradeRequest.onsuccess = () => resolve(upgradeRequest.result);
        
        upgradeRequest.onupgradeneeded = (event) => {
          const upgradeDb = (event.target as IDBOpenDBRequest).result;
          
          // Create missing user-specific stores
          missingStores.forEach(storeName => {
            if (!upgradeDb.objectStoreNames.contains(storeName)) {
              upgradeDb.createObjectStore(storeName, { keyPath: 'id' });
              console.log('✅ Created user-specific store:', storeName);
            }
          });
        };
      } else {
        resolve(db);
      }
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create base stores if they don't exist
      if (!db.objectStoreNames.contains(PDF_STORE)) {
        db.createObjectStore(PDF_STORE, { keyPath: 'id' });
        console.log('✅ Created base PDF store');
      }

      if (!db.objectStoreNames.contains(VIDEO_STORE)) {
        db.createObjectStore(VIDEO_STORE, { keyPath: 'id' });
        console.log('✅ Created base video store');
      }

      // Create user-specific stores if provided
      userSpecificStores.forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
          console.log('✅ Created user-specific store during upgrade:', storeName);
        }
      });
    };
  });
};

const saveToIndexedDB = async (storeName: string, data: any): Promise<void> => {
  const db = await openDB([storeName]); // Pass the store name to ensure it exists
  const transaction = db.transaction([storeName], 'readwrite');
  const store = transaction.objectStore(storeName);

  return new Promise((resolve, reject) => {
    const request = store.put(data);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

const getAllFromIndexedDB = async (storeName: string): Promise<any[]> => {
  try {
    const db = await openDB([storeName]); // Pass the store name to ensure it exists
    
    // Check if the store exists
    if (!db.objectStoreNames.contains(storeName)) {
      console.log('Store does not exist:', storeName, 'returning empty array');
      return [];
    }
    
    const transaction = db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  } catch (error) {
    console.error('Error accessing IndexedDB store:', storeName, error);
    return [];
  }
};

const clearIndexedDBStore = async (storeName: string): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction([storeName], 'readwrite');
  const store = transaction.objectStore(storeName);

  return new Promise((resolve, reject) => {
    const request = store.clear();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

interface StoredPdfBook {
  id: string;
  title: string;
  author: string;
  cover: string;
  gradeLevel: string;
  mediaType: string;
  genre: string;
  totalPages: number;
  pagesRead?: number;
  fileName: string;
  fileType: string;
  fileData: ArrayBuffer; // Store as ArrayBuffer instead of base64
}

interface StoredVideoBook {
  id: string;
  title: string;
  author: string;
  cover: string;
  gradeLevel: string;
  mediaType: string;
  genre: string;
  duration: number;
  fileName: string;
  fileType: string;
  fileData: ArrayBuffer; // Store as ArrayBuffer instead of base64
}

function AppContent() {
  const { addReadingSession, userStats } = useUserStats();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; readingLevelSystem?: string; avatar?: string } | null>(null);



  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [currentView, setCurrentView] = useState<'dashboard' | 'book' | 'voice-coaching' | 'voice-practice' | 'user-portal' | 'read-to-me-book' | 'pdf-overview' | 'pdf-viewer' | 'video-book' | 'read-along' | 'audiobook' | 'pdf-read-along'>('dashboard');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedPdfBook, setSelectedPdfBook] = useState<PdfBookData | null>(null);
  const [selectedLevel, setSelectedLevel] = useState('D - E');
  const [selectedContentType, setSelectedContentType] = useState('Voice Coach');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showFileUpload, setShowFileUpload] = useState(false);

  // Filter state management
  const [bookFilters, setBookFilters] = useState<BookFiltersType>(DEFAULT_FILTERS);
  const [uploadedPdfBooks, setUploadedPdfBooks] = useState<PdfBookData[]>([]);
  const [uploadedVideoBooks, setUploadedVideoBooks] = useState<VideoBookData[]>([]);
  const [currentMode, setCurrentMode] = useState<'library' | 'school'>('library');
  const [favorites, setFavorites] = useState<{
    books: any[];
    videoBooks: any[];
    voiceCoach: any[];
    audiobooks: any[];
    readToMe: any[];
  }>({
    books: [],
    videoBooks: [],
    voiceCoach: [],
    audiobooks: [],
    readToMe: []
  });

  // Track if we've loaded from localStorage to prevent overwriting on initial render
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);

  // Function to refresh user data from Supabase
  const refreshUserData = async () => {
    try {
      console.log('🔄 Manually refreshing user data...');
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('❌ Error getting user:', error);
        return;
      }
      
      if (user) {
        console.log('✅ Refreshed user data:', user);
        console.log('👤 Refreshed user metadata:', user.user_metadata);
        console.log('📧 Email confirmed:', user.email_confirmed_at);
        
        setCurrentUser({
          id: user.id,
          name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
          email: user.email || '',
          readingLevelSystem: user.user_metadata?.reading_level_system || user.user_metadata?.reading_level || 'US-RAZ',
          avatar: user.user_metadata?.avatar || '🐶'
        });
        
        console.log('🎯 Updated current user after refresh:', {
          name: user.user_metadata?.full_name || user.user_metadata?.name || 'User',
          readingLevelSystem: user.user_metadata?.reading_level_system || user.user_metadata?.reading_level || 'US-RAZ'
        });
      }
    } catch (error) {
      console.error('❌ Error refreshing user data:', error);
    }
  };

  // Authentication state listener with detailed logging
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔐 Auth state change:', event, session?.user?.id);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('✅ User signed in successfully');
        console.log('👤 User metadata:', session.user.user_metadata);
        console.log('📧 Email confirmed:', session.user.email_confirmed_at);
        console.log('🔍 Full user object:', session.user);
        
        // Check if user metadata is empty and try to refresh
        if (!session.user.user_metadata?.full_name && !session.user.user_metadata?.name) {
          console.log('⚠️ User metadata appears empty, waiting and refreshing...');
          // Wait a moment and try to refresh user data
          setTimeout(refreshUserData, 2000);
        }
        
        setIsAuthenticated(true);
        setCurrentUser({
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'User',
          email: session.user.email || '',
          readingLevelSystem: session.user.user_metadata?.reading_level_system || session.user.user_metadata?.reading_level || 'US-RAZ',
          avatar: session.user.user_metadata?.avatar || '🐶'
        });
        
        console.log('🎯 Set current user:', {
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'User',
          readingLevelSystem: session.user.user_metadata?.reading_level_system || session.user.user_metadata?.reading_level || 'US-RAZ'
        });
      } else if (event === 'SIGNED_OUT') {
        console.log('🚪 User signed out');
        setIsAuthenticated(false);
        setCurrentUser(null);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('🔄 Token refreshed, updating user data');
        console.log('👤 Updated user metadata:', session.user.user_metadata);
        
        // Update user data when token is refreshed (this might have updated metadata)
        setCurrentUser({
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'User',
          email: session.user.email || '',
          readingLevelSystem: session.user.user_metadata?.reading_level_system || session.user.user_metadata?.reading_level || 'US-RAZ',
          avatar: session.user.user_metadata?.avatar || '🐶'
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Carousel state for each section
  const [carouselIndices, setCarouselIndices] = useState({
    books: 0,
    videos: 0,
    voiceCoach: 0,
    readToMe: 0,
    audiobooks: 0
  });

  // Load uploaded books from IndexedDB on component mount
  useEffect(() => {
    const loadStoredBooks = async () => {
      try {
        console.log('Loading books from IndexedDB for user:', currentUser?.id || 'anonymous');

        // Only load books if user is authenticated
        if (!currentUser?.id) {
          console.log('No authenticated user, skipping book loading');
          setHasLoadedFromStorage(true);
          return;
        }

        // Get user-specific store names
        const userPdfStore = getUserSpecificStoreName(PDF_STORE, currentUser.id);
        const userVideoStore = getUserSpecificStoreName(VIDEO_STORE, currentUser.id);

        // MIGRATION: Only migrate for the original user (you), not new users
        const ORIGINAL_USER_ID = 'fa375aab-6cdb-4133-a1da-9360cc7e4109'; // Your specific user ID
        
        if (currentUser.id === ORIGINAL_USER_ID) {
          console.log('🔄 Original user detected, checking for books to migrate from global storage...');
          try {
            const globalPdfBooks = await getAllFromIndexedDB(PDF_STORE);
            const globalVideoBooks = await getAllFromIndexedDB(VIDEO_STORE);
            
            if (globalPdfBooks.length > 0) {
              console.log('📦 Found', globalPdfBooks.length, 'PDF books in global storage, migrating to user-specific storage...');
              for (const book of globalPdfBooks) {
                await saveToIndexedDB(userPdfStore, book);
                console.log('✅ Migrated PDF:', book.title);
              }
              // Clear global storage after migration
              await clearIndexedDBStore(PDF_STORE);
              console.log('🧹 Cleared global PDF storage after migration');
            }
            
            if (globalVideoBooks.length > 0) {
              console.log('📦 Found', globalVideoBooks.length, 'video books in global storage, migrating to user-specific storage...');
              for (const book of globalVideoBooks) {
                await saveToIndexedDB(userVideoStore, book);
                console.log('✅ Migrated video:', book.title);
              }
              // Clear global storage after migration
              await clearIndexedDBStore(VIDEO_STORE);
              console.log('🧹 Cleared global video storage after migration');
            }
          } catch (migrationError) {
            console.log('⚠️ Migration check failed:', migrationError);
          }
        } else {
          console.log('🆕 New user detected, skipping migration (no books to migrate)');
        }

        // Load PDF books for this specific user
        const storedPdfBooks = await getAllFromIndexedDB(userPdfStore);
        console.log('Stored PDF books from IndexedDB for user:', storedPdfBooks.length);
        if (storedPdfBooks.length > 0) {
          console.log('First stored PDF:', storedPdfBooks[0]);
          console.log('First PDF file data size:', storedPdfBooks[0].fileData?.byteLength || 'No file data');
        } else {
          console.log('No PDF books found in IndexedDB');
        }
        if (storedPdfBooks.length > 0) {
          const restoredPdfBooks: PdfBookData[] = storedPdfBooks.map((stored: StoredPdfBook) => {
            try {
              // Create File object from ArrayBuffer
              const file = new File([stored.fileData], stored.fileName, {
                type: stored.fileType || 'application/pdf',
                lastModified: Date.now()
              });

              // Create blob URL
              const pdfUrl = URL.createObjectURL(file);

              console.log('Restored PDF:', stored.title, 'File size:', file.size, 'URL:', pdfUrl);

              return {
                id: stored.id,
                title: stored.title,
                author: stored.author,
                cover: stored.cover,
                gradeLevel: stored.gradeLevel,
                mediaType: stored.mediaType,
                genre: stored.genre,
                totalPages: stored.totalPages,
                pagesRead: stored.pagesRead,
                file,
                pdfUrl
              };
            } catch (error) {
              console.error('Error restoring PDF:', stored.title, error);
              return null;
            }
          }).filter(Boolean) as PdfBookData[];

          console.log('Successfully restored PDF books:', restoredPdfBooks.length);
          setUploadedPdfBooks(restoredPdfBooks);
        }

        // Load Video books for this specific user
        const storedVideoBooks = await getAllFromIndexedDB(userVideoStore);
        console.log('Stored video books for user:', storedVideoBooks.length);
        if (storedVideoBooks.length > 0) {
          const restoredVideoBooks: VideoBookData[] = storedVideoBooks.map((stored: StoredVideoBook) => {
            const file = new File([stored.fileData], stored.fileName, { type: stored.fileType });
            return {
              id: stored.id,
              title: stored.title,
              author: stored.author,
              cover: stored.cover,
              gradeLevel: stored.gradeLevel,
              mediaType: stored.mediaType,
              genre: stored.genre,
              duration: stored.duration,
              file,
              videoUrl: URL.createObjectURL(file)
            };
          });
          console.log('Restored video books:', restoredVideoBooks.length);
          setUploadedVideoBooks(restoredVideoBooks);
        }

        // Load user-specific favorites from localStorage
        const userFavoritesKey = `favorites_${currentUser.id}`;
        const storedFavorites = localStorage.getItem(userFavoritesKey);
        if (storedFavorites) {
          setFavorites(JSON.parse(storedFavorites));
        } else {
          // Reset to default empty favorites for new user
          setFavorites({
            books: [],
            videoBooks: [],
            voiceCoach: [],
            audiobooks: [],
            readToMe: []
          });
        }

        // Mark that we've completed loading from storage
        setHasLoadedFromStorage(true);
        console.log('Finished loading from IndexedDB');
      } catch (error) {
        console.error('Error loading stored books:', error);

        // If it's the "Failed to read large IndexedDB value" error, clear the corrupted data
        if (error.message && error.message.includes('Failed to read large IndexedDB value')) {
          console.log('Detected corrupted IndexedDB data, clearing stores...');
          try {
            await clearIndexedDBStore(PDF_STORE);
            await clearIndexedDBStore(VIDEO_STORE);
            console.log('Successfully cleared corrupted IndexedDB data');
          } catch (clearError) {
            console.error('Error clearing IndexedDB stores:', clearError);
          }
        }

        // Even if there's an error, mark as loaded to prevent infinite loops
        setHasLoadedFromStorage(true);
      }
    };

    loadStoredBooks();
  }, [currentUser?.id]); // Re-run when user changes

  // Save uploaded books to IndexedDB whenever they change (but only after initial load)
  useEffect(() => {
    if (!hasLoadedFromStorage || !currentUser?.id) return; // Don't save until we've loaded from storage first and user is authenticated

    const saveBooks = async () => {
      try {
        console.log('Saving PDF books to IndexedDB for user:', currentUser.id, 'Books:', uploadedPdfBooks.length);
        
        // Get user-specific store name
        const userPdfStore = getUserSpecificStoreName(PDF_STORE, currentUser.id);
        
        for (const book of uploadedPdfBooks) {
          try {
            // Check file size - if too large, skip IndexedDB storage
            const maxSize = 50 * 1024 * 1024; // 50MB limit
            if (book.file.size > maxSize) {
              console.warn('PDF file too large for IndexedDB storage:', book.title, 'Size:', book.file.size);
              continue;
            }

            // Try to read the file, but handle the case where it's no longer readable
            let fileBuffer;
            try {
              fileBuffer = await book.file.arrayBuffer();
            } catch (fileError) {
              console.warn('File no longer readable, skipping IndexedDB save:', book.title, fileError instanceof Error ? fileError.message : String(fileError));
              continue; // Skip this book and continue with others
            }

            // Double-check the ArrayBuffer size
            if (fileBuffer.byteLength > maxSize) {
              console.warn('PDF ArrayBuffer too large for IndexedDB:', book.title, 'Size:', fileBuffer.byteLength);
              continue;
            }

            const bookToStore: StoredPdfBook = {
              id: book.id,
              title: book.title,
              author: book.author,
              cover: book.cover,
              gradeLevel: book.gradeLevel,
              mediaType: book.mediaType,
              genre: book.genre,
              totalPages: book.totalPages,
              pagesRead: book.pagesRead,
              fileName: book.file.name,
              fileType: book.file.type,
              fileData: fileBuffer
            };

            await saveToIndexedDB(userPdfStore, bookToStore);
            console.log('Successfully saved PDF to user-specific IndexedDB:', book.title, 'Size:', fileBuffer.byteLength);
          } catch (bookError) {
            console.error('Error saving individual PDF book:', book.title, bookError);
            // If it's a size-related error, inform the user
            if (bookError instanceof Error && (bookError.message.includes('large') || bookError.name === 'UnknownError')) {
              console.warn('PDF file may be too large for persistent storage:', book.title);
            }
          }
        }
        console.log('PDF books saving process completed for user:', currentUser.id);
      } catch (error) {
        console.error('Error in PDF books saving process:', error);
      }
    };

    if (uploadedPdfBooks.length > 0) {
      console.log('Triggering IndexedDB save for', uploadedPdfBooks.length, 'PDF books');
      saveBooks();
    } else {
      console.log('No PDF books to save to IndexedDB');
    }
  }, [uploadedPdfBooks, hasLoadedFromStorage, currentUser?.id]);

  useEffect(() => {
    if (!hasLoadedFromStorage || !currentUser?.id) return; // Don't save until we've loaded from storage first and user is authenticated

    const saveVideos = async () => {
      try {
        console.log('Saving video books to IndexedDB for user:', currentUser.id, 'Videos:', uploadedVideoBooks.length);
        
        // Get user-specific store name
        const userVideoStore = getUserSpecificStoreName(VIDEO_STORE, currentUser.id);
        
        for (const video of uploadedVideoBooks) {
          const fileBuffer = await video.file.arrayBuffer();
          const videoToStore: StoredVideoBook = {
            id: video.id,
            title: video.title,
            author: video.author,
            cover: video.cover,
            gradeLevel: video.gradeLevel,
            mediaType: video.mediaType,
            genre: video.genre,
            duration: video.duration,
            fileName: video.file.name,
            fileType: video.file.type,
            fileData: fileBuffer
          };
          await saveToIndexedDB(userVideoStore, videoToStore);
        }
        console.log('Video books saved successfully to user-specific IndexedDB for user:', currentUser.id);
      } catch (error) {
        console.error('Error saving video books:', error);
      }
    };

    if (uploadedVideoBooks.length > 0) {
      saveVideos();
    }
  }, [uploadedVideoBooks, hasLoadedFromStorage, currentUser?.id]);

  // Save favorites to localStorage whenever they change (user-specific)
  useEffect(() => {
    if (currentUser?.id) {
      const userFavoritesKey = `favorites_${currentUser.id}`;
      localStorage.setItem(userFavoritesKey, JSON.stringify(favorites));
    }
  }, [favorites, currentUser?.id]);

  // Voice Coach books data
  const voiceCoachBooks = [
    {
      id: '1',
      title: 'Ocean Adventures',
      author: 'Sarah Waters',
      cover: 'https://images.pexels.com/photos/1148399/pexels-photo-1148399.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
      readingTime: 15,
      difficulty: 'D - E',
      practiceScore: 85,
      completedSessions: 3,
      totalSessions: 5
    },
    {
      id: '2',
      title: 'Space Explorers',
      author: 'Mike Chen',
      cover: 'https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
      readingTime: 12,
      difficulty: 'D - E',
      practiceScore: 92,
      completedSessions: 5,
      totalSessions: 5
    },
    {
      id: '3',
      title: 'Forest Friends',
      author: 'Emma Green',
      cover: 'https://images.pexels.com/photos/1181345/pexels-photo-1181345.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
      readingTime: 18,
      difficulty: 'D - E',
      completedSessions: 1,
      totalSessions: 6
    },
    {
      id: '4',
      title: 'Dinosaur Discovery',
      author: 'Tom Rex',
      cover: 'https://images.pexels.com/photos/1181354/pexels-photo-1181354.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
      readingTime: 10,
      difficulty: 'D - E',
      practiceScore: 78,
      completedSessions: 2,
      totalSessions: 4
    },
    {
      id: '5',
      title: 'Magic Castle',
      author: 'Luna Bright',
      cover: 'https://images.pexels.com/photos/1181276/pexels-photo-1181276.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
      readingTime: 20,
      difficulty: 'D - E',
      completedSessions: 0,
      totalSessions: 7
    },
    {
      id: '6',
      title: 'Animal Friends',
      author: 'Jake Wilson',
      cover: 'https://images.pexels.com/photos/1181394/pexels-photo-1181394.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
      readingTime: 8,
      difficulty: 'D - E',
      practiceScore: 88,
      completedSessions: 4,
      totalSessions: 4
    }
  ];

  // Read to Me books data
  const readToMeBooks = [
    {
      id: '1',
      title: 'The Magic Forest Adventure',
      author: 'Sarah Mitchell',
      cover: 'https://images.pexels.com/photos/1148399/pexels-photo-1148399.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
      readingTime: 15,
      rating: 4.8,
      category: 'Fantasy',
      isNew: true,
      progress: 65
    },
    {
      id: '2',
      title: 'Space Explorers',
      author: 'Mike Chen',
      cover: 'https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
      readingTime: 12,
      rating: 4.9,
      category: 'Science Fiction',
      progress: 30
    },
    {
      id: '3',
      title: 'Ocean Mysteries',
      author: 'Lisa Waters',
      cover: 'https://images.pexels.com/photos/1181345/pexels-photo-1181345.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
      readingTime: 18,
      rating: 4.7,
      category: 'Adventure',
      progress: 85
    },
    {
      id: '4',
      title: 'Dinosaur Discovery',
      author: 'Tom Rex',
      cover: 'https://images.pexels.com/photos/1181354/pexels-photo-1181354.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
      readingTime: 10,
      rating: 4.6,
      category: 'Educational'
    },
    {
      id: '5',
      title: 'Princess Adventures',
      author: 'Emma Royal',
      cover: 'https://images.pexels.com/photos/1181276/pexels-photo-1181276.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
      readingTime: 14,
      rating: 4.8,
      category: 'Fantasy'
    },
    {
      id: '6',
      title: 'Animal Friends',
      author: 'Jake Wilson',
      cover: 'https://images.pexels.com/photos/1181394/pexels-photo-1181394.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1',
      readingTime: 8,
      rating: 4.5,
      category: 'Animals'
    }
  ];

  const readingLevels = ['Pre-K', 'K1', 'K2', '1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B', '5A', '5B', '6A', '6B'];

  const contentTypes: Array<{
    id: string;
    name: string;
    icon: string | React.ComponentType<{ className?: string }>;
  }> = [
      { id: 'all-books', name: 'All Book', icon: bookOpenIcon },
      { id: 'video-books', name: 'Video Books', icon: bookAllIcon },
      { id: 'voice-coach', name: 'Voice Coach', icon: bookMicIcon },
      { id: 'audiobooks', name: 'Audiobooks', icon: bookVoiceIcon },
      { id: 'books', name: 'Books', icon: bookBooksIcon },
      { id: 'read-to-me', name: 'Read to Me', icon: bookReadIcon }
    ];

  const categories = ['All', 'Category 1', 'Category 1', 'Category 1', 'Category 1', 'Category 1', 'Category 1', 'Category 1', 'Category 1', 'Category 1'];

  const handleAuthComplete = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    console.log('🚪 LOGOUT: Starting logout process...');

    // Set logout flag to prevent auth listener interference
    setIsLoggingOut(true);

    // Clear UI state but PRESERVE uploaded files
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentView('dashboard');
    setSelectedPdfBook(null);

    // Clear only user-specific data, NOT uploaded files
    console.log('🧹 LOGOUT: Clearing user-specific data only...');
    try {
      // Clear only specific localStorage keys, preserve uploaded files
      const keysToRemove = ['favorites', 'userStats'];
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });

      // Clear sessionStorage completely  
      sessionStorage.clear();

      // DO NOT clear IndexedDB - this preserves uploaded PDFs and videos
      console.log('💾 LOGOUT: Preserving uploaded files in IndexedDB');

    } catch (storageError) {
      console.error('Storage clearing error:', storageError);
    }

    // Sign out from Supabase
    try {
      console.log('🔐 LOGOUT: Signing out from Supabase...');
      await supabase.auth.signOut({ scope: 'global' });
    } catch (supabaseError) {
      console.error('Supabase signout error:', supabaseError);
    }

    console.log('✅ LOGOUT: Complete - uploaded files preserved');

    // Simple page reload without cache clearing to preserve IndexedDB
    window.location.reload();
  };

  const handleUserPortal = () => {
    setCurrentView('user-portal');
  };

  const handlePdfUploadSuccess = (pdfBook: PdfBookData) => {
    console.log('PDF upload success handler called:', pdfBook.title, 'Media Type:', pdfBook.mediaType);
    const updatedBooks = [...uploadedPdfBooks, pdfBook];
    setUploadedPdfBooks(updatedBooks);
    console.log('Updated PDF books array:', updatedBooks.length);

    // Close the upload dashboard
    setShowFileUpload(false);

    // Route to the appropriate section based on media type
    if (pdfBook.mediaType === 'Read to me') {
      setSelectedContentType('Read to Me');
      console.log(`Successfully uploaded "${pdfBook.title}" - routed to Read to Me section`);
    } else if (pdfBook.mediaType === 'Voice Coach') {
      setSelectedContentType('Voice Coach');
      console.log(`Successfully uploaded "${pdfBook.title}" - routed to Voice Coach section`);
    } else if (pdfBook.mediaType === 'Books') {
      setSelectedContentType('Books');
      console.log(`Successfully uploaded "${pdfBook.title}" - routed to Books section`);
    } else if (pdfBook.mediaType === 'Video Books') {
      setSelectedContentType('Video Books');
      console.log(`Successfully uploaded "${pdfBook.title}" - routed to Video Books section`);
    } else if (pdfBook.mediaType === 'Videos') {
      setSelectedContentType('Video Books'); // Map "Videos" to "Video Books" section
      console.log(`Successfully uploaded "${pdfBook.title}" - routed to Video Books section`);
    } else if (pdfBook.mediaType === 'Audiobooks') {
      setSelectedContentType('Audiobooks');
      console.log(`Successfully uploaded "${pdfBook.title}" - routed to Audiobooks section`);
    } else {
      // Default to All Book if media type is not recognized
      setSelectedContentType('All Book');
      console.log(`Successfully uploaded "${pdfBook.title}" - routed to All Books section (default), mediaType was: ${pdfBook.mediaType}`);
    }
  };

  const handleVideoUploadSuccess = (videoBook: VideoBookData) => {
    const updatedVideos = [...uploadedVideoBooks, videoBook];
    setUploadedVideoBooks(updatedVideos);
    // Note: File objects can't be stored in localStorage, so videos will need to be re-uploaded after app restart
    // For now, we'll keep them in memory during the session
  };

  const handlePdfBookSelect = (pdfBook: PdfBookData) => {
    setSelectedPdfBook(pdfBook);
    setCurrentView('pdf-overview');
  };

  const handlePdfReadAlongSelect = (pdfBook: PdfBookData) => {
    setSelectedPdfBook(pdfBook);
    setCurrentView('pdf-overview'); // First go to overview page
  };

  const handleProgressUpdate = (bookId: string, pagesRead: number, timeSpent?: number) => {
    // Find the book being updated
    const book = uploadedPdfBooks.find(b => b.id === bookId);
    if (!book) return;

    const previousPagesRead = book.pagesRead || 0;
    const newPagesRead = Math.max(previousPagesRead, pagesRead);
    const isNewlyCompleted = previousPagesRead < book.totalPages && newPagesRead >= book.totalPages;

    // Update progress for uploaded PDF books
    setUploadedPdfBooks(prevBooks =>
      prevBooks.map(b =>
        b.id === bookId
          ? { ...b, pagesRead: newPagesRead }
          : b
      )
    );

    // Update the currently selected PDF book if it matches
    if (selectedPdfBook && selectedPdfBook.id === bookId) {
      setSelectedPdfBook(prev => prev ? {
        ...prev,
        pagesRead: newPagesRead
      } : null);
    }

    // If the book is newly completed, record it in user stats
    if (isNewlyCompleted) {
      console.log('🎉 Book completed!', book.title, 'Pages:', newPagesRead, '/', book.totalPages);
      console.log('📊 Media Type:', book.mediaType);

      // Map media type to book type for user stats
      let bookType: 'pdf' | 'audiobook' | 'video' | 'readToMe' | 'voiceCoach' = 'pdf';
      if (book.mediaType === 'Voice Coach') bookType = 'voiceCoach';
      else if (book.mediaType === 'Read to me') bookType = 'readToMe';
      else if (book.mediaType === 'Video Books' || book.mediaType === 'Videos') bookType = 'video';
      else if (book.mediaType === 'Audiobooks') bookType = 'audiobook';

      console.log('📈 Mapped book type:', bookType);

      // Record the reading session
      try {
        addReadingSession({
          bookId: book.id,
          bookTitle: book.title,
          bookType: bookType,
          pagesRead: newPagesRead,
          totalPages: book.totalPages,
          timeSpent: timeSpent || 15, // Default to 15 minutes if not provided
          isCompleted: true
        });

        console.log('✅ Reading session recorded successfully for:', book.title);
        console.log('📋 Session data:', {
          bookId: book.id,
          bookTitle: book.title,
          bookType: bookType,
          pagesRead: newPagesRead,
          totalPages: book.totalPages,
          timeSpent: timeSpent || 15,
          isCompleted: true
        });
      } catch (error) {
        console.error('❌ Error recording reading session:', error);
      }
    }
  };

  // Favorites management functions
  const addToFavorites = (item: any, category: 'books' | 'videoBooks' | 'voiceCoach' | 'audiobooks' | 'readToMe') => {
    setFavorites(prev => ({
      ...prev,
      [category]: [...prev[category].filter(fav => fav.id !== item.id), item]
    }));
  };

  const removeFromFavorites = (itemId: string, category: 'books' | 'videoBooks' | 'voiceCoach' | 'audiobooks' | 'readToMe') => {
    setFavorites(prev => ({
      ...prev,
      [category]: prev[category].filter(fav => fav.id !== itemId)
    }));
  };

  const isFavorited = (itemId: string, category: 'books' | 'videoBooks' | 'voiceCoach' | 'audiobooks' | 'readToMe') => {
    return favorites[category].some(fav => fav.id === itemId);
  };

  const toggleFavorite = (item: any, category: 'books' | 'videoBooks' | 'voiceCoach' | 'audiobooks' | 'readToMe') => {
    if (isFavorited(item.id, category)) {
      removeFromFavorites(item.id, category);
    } else {
      addToFavorites(item, category);
    }
  };

  // Carousel navigation functions
  const getBooksPerPage = () => {
    // Calculate how many books fit on screen based on book width (w-40 = 160px) + spacing
    const bookWidth = 160 + 24; // w-40 + space-x-6
    const containerWidth = window.innerWidth - 200; // Account for margins and padding
    return Math.floor(containerWidth / bookWidth) || 1;
  };

  const handleCarouselNext = (section: keyof typeof carouselIndices) => {
    const booksPerPage = getBooksPerPage();
    let totalBooks = 0;

    switch (section) {
      case 'books':
        totalBooks = uploadedPdfBooks.length > 0 ? uploadedPdfBooks.length : filteredBooks.filter(book => book.category === 'books').length;
        break;
      case 'videos':
        totalBooks = uploadedVideoBooks.length > 0 ? uploadedVideoBooks.length : 3; // Sample videos
        break;
      case 'voiceCoach':
        totalBooks = voiceCoachBooks.length;
        break;
      case 'readToMe':
        totalBooks = readToMeBooks.length;
        break;
      case 'audiobooks':
        totalBooks = readToMeBooks.length; // Using same data for now
        break;
    }

    setCarouselIndices(prev => ({
      ...prev,
      [section]: Math.min(prev[section] + booksPerPage, Math.max(0, totalBooks - booksPerPage))
    }));
  };

  const handleCarouselPrev = (section: keyof typeof carouselIndices) => {
    const booksPerPage = getBooksPerPage();

    setCarouselIndices(prev => ({
      ...prev,
      [section]: Math.max(0, prev[section] - booksPerPage)
    }));
  };

  // Filter functions
  const updateFilters = (newFilters: Partial<BookFiltersType>) => {
    setBookFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setBookFilters(DEFAULT_FILTERS);
  };



  // Handle avatar change - updates local state when avatar is changed
  const handleAvatarUpdate = (newAvatar: string) => {
    if (!currentUser) return;

    setCurrentUser({
      ...currentUser,
      avatar: newAvatar
    });
  };

  // Helper function to get PDFs filtered by media type for specific sections
  const getPdfsByMediaType = (mediaType: string) => {
    return uploadedPdfBooks.filter(pdf => pdf.mediaType === mediaType);
  };

  // Compute filtered books based on current filters
  const filteredBooks = useMemo(() => {
    const allBooks = [
      // Map uploaded PDFs to their correct categories based on media type
      ...uploadedPdfBooks.map(book => ({
        ...book,
        category: book.mediaType === 'Books' ? 'books' :
          book.mediaType === 'Video Books' || book.mediaType === 'Videos' ? 'videoBooks' :
            book.mediaType === 'Voice Coach' ? 'voiceCoach' :
              book.mediaType === 'Read to me' ? 'readToMe' :
                book.mediaType === 'Audiobooks' ? 'audiobooks' :
                  'books' // Default fallback
      })),
      ...uploadedVideoBooks.map(book => ({ ...book, category: 'videoBooks' })),
      ...voiceCoachBooks.map(book => ({ ...book, category: 'voiceCoach', gradeLevel: book.difficulty, genre: 'Education' })),
      ...readToMeBooks.map(book => ({ ...book, category: 'readToMe', gradeLevel: 'D - E', genre: book.category }))
    ];

    return allBooks.filter(book => matchesFilters(book, bookFilters));
  }, [uploadedPdfBooks, uploadedVideoBooks, voiceCoachBooks, readToMeBooks, bookFilters]);

  // Get available filter options from current books
  const availableGenres = useMemo(() => {
    const allBooks = [
      ...uploadedPdfBooks,
      ...uploadedVideoBooks,
      ...voiceCoachBooks.map(book => ({ ...book, genre: 'Education' })),
      ...readToMeBooks.map(book => ({ ...book, genre: book.category }))
    ];
    return ['All', ...getUniqueValues(allBooks, 'genre')];
  }, [uploadedPdfBooks, uploadedVideoBooks, voiceCoachBooks, readToMeBooks]);

  const availableReadingLevels = useMemo(() => {
    const allBooks = [
      ...uploadedPdfBooks,
      ...uploadedVideoBooks,
      ...voiceCoachBooks.map(book => ({ ...book, gradeLevel: book.difficulty })),
      ...readToMeBooks.map(book => ({ ...book, gradeLevel: 'D - E' }))
    ];
    return ['All', ...getUniqueValues(allBooks, 'gradeLevel')];
  }, [uploadedPdfBooks, uploadedVideoBooks, voiceCoachBooks, readToMeBooks]);

  const sectionInfo = useMemo(() => {
    const getCurrentSectionInfo = () => {
      if (currentView === 'read-to-me') {
        return {
          title: 'Read to Me',
          subtitle: 'Listen to engaging stories with beautiful narration',
          icon: User,
          bgClass: 'bg-gradient-to-br from-purple-400 via-pink-400 to-red-400',
          iconColor: 'text-purple-600',
          textColor: 'text-white',
          subtitleColor: 'text-white/90'
        };
      }

      if (currentView === 'voice-coaching') {
        return {
          title: 'Voice Coach',
          subtitle: 'Practice reading aloud and improve your pronunciation',
          icon: Mic,
          bgClass: 'bg-gradient-to-br from-green-400 via-blue-400 to-purple-500',
          iconColor: 'text-green-600',
          textColor: 'text-white',
          subtitleColor: 'text-white/90'
        };
      }

      // For dashboard, use selectedContentType
      switch (selectedContentType) {
        case 'All Book':
          return {
            title: 'All Books',
            subtitle: 'Discover all our content',
            icon: bookOpenIcon, // Now matches circular button
            bgClass: 'bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400',
            iconColor: 'text-blue-600',
            textColor: 'text-white',
            subtitleColor: 'text-white/90'
          };
        case 'Video Books':
          return {
            title: 'Video Books',
            subtitle: 'Watch interactive story experiences',
            icon: bookAllIcon, // Now matches circular button
            bgClass: 'bg-gradient-to-br from-orange-400 via-red-400 to-pink-400',
            iconColor: 'text-orange-600',
            textColor: 'text-white',
            subtitleColor: 'text-white/90'
          };
        case 'Voice Coach':
          return {
            title: 'Voice Coach',
            subtitle: 'Practice reading aloud and improve your pronunciation',
            icon: bookMicIcon, // Now matches circular button
            bgClass: 'bg-gradient-to-br from-green-400 via-blue-400 to-purple-500',
            iconColor: 'text-green-600',
            textColor: 'text-white',
            subtitleColor: 'text-white/90'
          };
        case 'Audiobooks':
          return {
            title: 'Audiobooks',
            subtitle: 'Listen to your favorite stories',
            icon: bookVoiceIcon, // Now matches circular button
            bgClass: 'bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400',
            iconColor: 'text-indigo-600',
            textColor: 'text-white',
            subtitleColor: 'text-white/90'
          };
        case 'Books':
          return {
            title: 'Books',
            subtitle: 'Explore our digital book collection',
            icon: bookBooksIcon, // Now matches circular button
            bgClass: 'bg-gradient-to-br from-teal-400 via-blue-400 to-indigo-400',
            iconColor: 'text-teal-600',
            textColor: 'text-white',
            subtitleColor: 'text-white/90'
          };
        case 'Read to Me':
          return {
            title: 'Read to Me',
            subtitle: 'Listen to engaging stories with beautiful narration',
            icon: bookReadIcon, // Now matches circular button
            bgClass: 'bg-gradient-to-br from-purple-400 via-pink-400 to-red-400',
            iconColor: 'text-purple-600',
            textColor: 'text-white',
            subtitleColor: 'text-white/90'
          };
        default:
          return {
            title: 'Voice Coach',
            subtitle: 'Practice reading aloud and improve your pronunciation',
            icon: Mic,
            bgClass: 'bg-gradient-to-br from-green-400 via-blue-400 to-purple-500',
            iconColor: 'text-green-600',
            textColor: 'text-white',
            subtitleColor: 'text-white/90'
          };
      }
    };

    return getCurrentSectionInfo();
  }, [currentView, selectedContentType]);

  if (!isAuthenticated) {
    return <AuthFlow onAuthComplete={handleAuthComplete} />;
  }

  if (currentView === 'book') {
    return <BookOverview onBack={() => setCurrentView('dashboard')} />;
  }

  if (currentView === 'pdf-overview' && selectedPdfBook) {
    // Use different overview components based on media type
    if (selectedPdfBook.mediaType === 'Read to me') {
      // Use the special Read to Me book cover interface
      return (
        <ReadToMeBookCover
          onBack={() => {
            setCurrentView('dashboard');
            setSelectedPdfBook(null);
          }}
          onStartReading={() => setCurrentView('pdf-read-along')}
          bookId={selectedPdfBook.id}
          pdfBook={selectedPdfBook}
          isFavorited={isFavorited(selectedPdfBook.id, 'readToMe')}
          onToggleFavorite={() => toggleFavorite(selectedPdfBook, 'readToMe')}
        />
      );
    } else {
      // Use regular PDF overview for other types
      return (
        <PdfBookOverview
          pdfBook={selectedPdfBook}
          onBack={() => {
            setCurrentView('dashboard');
            setSelectedPdfBook(null);
          }}
          onStartReading={() => setCurrentView('pdf-viewer')}
        />
      );
    }
  }

  if (currentView === 'pdf-viewer' && selectedPdfBook) {
    return (
      <PdfViewer
        onBack={() => setCurrentView('pdf-overview')}
        pdfBook={selectedPdfBook}
        onProgressUpdate={handleProgressUpdate}
        isFavorited={isFavorited(selectedPdfBook.id, 'books')}
        onToggleFavorite={() => toggleFavorite(selectedPdfBook, 'books')}
      />
    );
  }

  if (currentView === 'read-to-me') {
    return (
      <ReadToMeDashboard
        onBack={() => setCurrentView('dashboard')}
        onBookSelect={(bookId) => {
          setSelectedBookId(bookId);
          setCurrentView('read-to-me-book');
        }}
      />
    );
  }

  if (currentView === 'read-to-me-book' && selectedBookId) {
    // Check if it's a PDF book or regular Read to Me book
    if (selectedPdfBook) {
      // Handle PDF book in Read to Me mode
      return (
        <ReadToMeBookCover
          onBack={() => {
            setCurrentView('dashboard');
            setSelectedPdfBook(null);
          }}
          onStartReading={() => {
            // Navigate to PDF read-along interface with the dog
            setCurrentView('pdf-read-along');
          }}
          bookId={selectedBookId}
          pdfBook={selectedPdfBook}
          isFavorited={isFavorited(selectedPdfBook.id, 'readToMe')}
          onToggleFavorite={() => toggleFavorite(selectedPdfBook, 'readToMe')}
        />
      );
    } else {
      // Handle regular Read to Me book
      const readToMeBook = readToMeBooks.find(book => book.id === selectedBookId) || readToMeBooks[0];
      return (
        <ReadToMeBookCover
          onBack={() => setCurrentView('dashboard')}
          onStartReading={() => {
            // Navigate to the ReadAlongInterface for the reading experience
            setCurrentView('read-along');
          }}
          bookId={selectedBookId}
          isFavorited={isFavorited(readToMeBook.id, 'readToMe')}
          onToggleFavorite={() => toggleFavorite(readToMeBook, 'readToMe')}
        />
      );
    }
  }

  if (currentView === 'voice-coaching') {
    return (
      <VoiceCoachingDashboard
        onBack={() => setCurrentView('dashboard')}
        onStartPractice={(bookId) => {
          setSelectedBookId(bookId);
          setCurrentView('voice-practice');
        }}
      />
    );
  }

  if (currentView === 'voice-practice' && selectedBookId) {
    // Check if it's an uploaded PDF with Voice Coach media type
    const voiceCoachPdf = uploadedPdfBooks.find(pdf => pdf.id === selectedBookId && pdf.mediaType === 'Voice Coach');
    const voiceCoachBook = voiceCoachBooks.find(book => book.id === selectedBookId) || voiceCoachBooks[0];

    return (
      <VoiceCoachPracticeInterface
        onBack={() => setCurrentView('dashboard')}
        bookId={selectedBookId}
        pdfBook={voiceCoachPdf} // Pass PDF data if it's a PDF
        isFavorited={isFavorited(voiceCoachPdf?.id || voiceCoachBook.id, 'voiceCoach')}
        onToggleFavorite={() => toggleFavorite(voiceCoachPdf || voiceCoachBook, 'voiceCoach')}
        onProgressUpdate={handleProgressUpdate}
      />
    );
  }

  if (currentView === 'read-along') {
    return (
      <ReadAlongInterface
        onBack={() => setCurrentView('dashboard')}
      />
    );
  }

  if (currentView === 'pdf-read-along' && selectedPdfBook) {
    return (
      <PdfReadAlongInterface
        onBack={() => setCurrentView('dashboard')}
        pdfBook={selectedPdfBook}
        onProgressUpdate={handleProgressUpdate}
      />
    );
  }

  if (currentView === 'audiobook') {
    const audiobookData = { id: 'miss-nelson-field-day', title: 'Miss Nelson Has a Field Day', author: 'Harry Allard' };

    return (
      <AudiobookPlayer
        onBack={() => setCurrentView('dashboard')}
        isFavorited={isFavorited(audiobookData.id, 'audiobooks')}
        onToggleFavorite={() => toggleFavorite(audiobookData, 'audiobooks')}
        onProgressUpdate={handleProgressUpdate}
      />
    );
  }

  if (currentView === 'video-book') {
    // Find the selected uploaded video if available
    const selectedUploadedVideo = selectedBookId ? uploadedVideoBooks.find(video => video.id === selectedBookId) : null;
    const videoData = selectedUploadedVideo || { id: 'default-video', title: "Pretty Perfect Kitty-Corn", author: "Unknown" };

    return (
      <VideoBookPlayer
        onBack={() => setCurrentView('dashboard')}
        bookTitle={videoData.title}
        uploadedVideo={selectedUploadedVideo ? {
          id: selectedUploadedVideo.id,
          title: selectedUploadedVideo.title,
          author: selectedUploadedVideo.author,
          cover: selectedUploadedVideo.cover,
          videoUrl: selectedUploadedVideo.videoUrl,
          duration: selectedUploadedVideo.duration
        } : undefined}
        isFavorited={isFavorited(videoData.id, 'videoBooks')}
        onToggleFavorite={() => toggleFavorite(videoData, 'videoBooks')}
        onProgressUpdate={handleProgressUpdate}
      />
    );
  }

  if (currentView === 'user-portal') {
    return (
      <UserPortal
        onBack={() => setCurrentView('dashboard')}
        onLogout={handleLogout}
        favorites={favorites}
        currentUser={currentUser}
        onAvatarChange={handleAvatarUpdate}
        onOpenBook={(bookId, category) => {
          setSelectedBookId(bookId);
          // Navigate to appropriate view based on category
          switch (category) {
            case 'books':
              setCurrentView('pdf-overview');
              break;
            case 'videoBooks':
              setCurrentView('video-book');
              break;
            case 'voiceCoach':
              setCurrentView('voice-practice');
              break;
            case 'audiobooks':
              setCurrentView('audiobook');
              break;
            case 'readToMe':
              setCurrentView('read-to-me-book');
              break;
            default:
              setCurrentView('dashboard');
          }
        }}
      />
    );
  }

  if (showFileUpload) {
    return (
      <FileUploadDashboard
        onBack={() => setShowFileUpload(false)}
        onPdfUploadSuccess={handlePdfUploadSuccess}
        onVideoUploadSuccess={handleVideoUploadSuccess}
        existingPdfBooks={uploadedPdfBooks}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <TrialStatusBanner />
      {/* Header with transparency */}
      <div className="relative z-10 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-400 via-purple-400 to-blue-400 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-3xl">{currentUser?.avatar || '🐶'}</span>
              </div>
              <div className="flex flex-col">
                <button
                  onClick={handleUserPortal}
                  className="text-xl font-superclarendon-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent hover:from-pink-600 hover:via-purple-600 hover:to-blue-600 transition-all duration-300 transform hover:scale-105"
                >
                  Hello {currentUser?.name?.split(' ')[0] || 'User'}! 🌟
                </button>
                {currentUser?.readingLevelSystem && (
                  <div className="text-sm text-gray-600 bg-white/80 backdrop-blur-sm rounded-md px-2 py-1 shadow-sm border border-white/30">
                    Reading Level: <span className="font-bold text-blue-700">{currentUser.readingLevelSystem}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 max-w-2xl mx-8 flex items-center space-x-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Search books, authors, genres..."
                  value={bookFilters.searchQuery}
                  onChange={(e) => updateFilters({ searchQuery: e.target.value })}
                  className="w-full px-4 py-2 bg-white/90 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
                />
                <button className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Settings className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <button
                onClick={() => setShowFileUpload(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors"
              >
                <Upload className="w-5 h-5" />
                <span className="font-medium">Upload</span>
              </button>

              {/* Library/School Toggle - Smaller version */}
              <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <button
                  onClick={() => setCurrentMode('library')}
                  className={`flex items-center space-x-1 px-3 py-2 text-sm font-medium transition-colors ${currentMode === 'library'
                    ? 'bg-brand-pink text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Library</span>
                </button>
                <button
                  onClick={() => setCurrentMode('school')}
                  className={`flex items-center space-x-1 px-3 py-2 text-sm font-medium transition-colors ${currentMode === 'school'
                    ? 'bg-brand-pink text-white'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>School</span>
                </button>
              </div>
            </div>

            {/* App Logo */}
            <div className="flex items-center">
              <img
                src={appLogo}
                alt="App Logo"
                className="h-10 object-contain"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section with Background that bleeds up into header */}
      <div
        className={`relative py-16 -mt-20 pt-36 bg-cover bg-center`}
        style={selectedContentType === 'All Book' ? {
          backgroundImage: `url(${volcanoBookBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        } : selectedContentType === 'Video Books' ? {
          backgroundImage: `url(${stargazingBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        } : selectedContentType === 'Audiobooks' ? {
          backgroundImage: `url(${cozyBedroomBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        } : selectedContentType === 'Books' ? {
          backgroundImage: `url(${booksBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        } : (selectedContentType === 'Read to Me' || selectedContentType === 'Voice Coach') ? {
          backgroundImage: `url(${hippoWaterBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        } : {}}>
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-block bg-white/95 backdrop-blur-md rounded-2xl px-8 py-6 shadow-lg border border-white/50">
            <div className="flex items-center justify-center space-x-3 mb-4">
              {typeof sectionInfo.icon === 'string' ? (
                <img src={sectionInfo.icon} alt={sectionInfo.title} className="w-8 h-8 object-contain drop-shadow-sm" />
              ) : (
                <sectionInfo.icon className={`w-8 h-8 ${sectionInfo.iconColor} drop-shadow-sm`} />
              )}
              <h1 className="text-4xl font-superclarendon-bold drop-shadow-sm" style={{ color: '#9fcfd1' }}>{sectionInfo.title}</h1>
            </div>
            <p className="text-lg drop-shadow-sm" style={{ color: '#9fcfd1' }}>{sectionInfo.subtitle}</p>
          </div>
        </div>
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div
          className="relative rounded-2xl p-6 shadow-lg overflow-hidden"
          style={{
            backgroundImage: `url(${mainContentBg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/95 via-white/90 to-white/85 backdrop-blur-sm"></div>

          {/* Content Container */}
          <div className="relative z-10">


            {/* Content Type Tabs */}
            <div className="mb-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:justify-evenly items-center gap-3 sm:gap-4 lg:gap-2 py-6 px-2 sm:px-4">
                {contentTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setSelectedContentType(type.name);
                      // Both Voice Coach and Read to Me content will show inline, no view change needed
                    }}
                    className={`group w-24 h-24 sm:w-28 sm:h-28 lg:w-36 lg:h-36 rounded-full transition-all duration-300 hover:scale-105 lg:hover:scale-110 hover:shadow-2xl flex flex-col items-center justify-center relative ${selectedContentType === type.name
                      ? 'text-white shadow-2xl shadow-pink-500/30'
                      : 'text-blue-700 shadow-lg shadow-pink-200/50'
                      }`}
                    style={{
                      background: selectedContentType === type.name
                        ? 'linear-gradient(135deg, #f8fafc, #e2e8f0, #cbd5e1)'
                        : 'linear-gradient(135deg, rgba(253, 242, 248, 0.7), rgba(252, 231, 243, 0.7), rgba(251, 207, 232, 0.7))',
                      boxShadow: selectedContentType === type.name
                        ? '0 20px 40px rgba(251, 191, 36, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 0 0 4px #fbbf24, 0 0 0 8px #f59e0b'
                        : '0 8px 25px rgba(236, 72, 153, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 0 0 3px #f9a8d4, 0 0 0 6px #f472b6'
                    }}
                  >
                    {typeof type.icon === 'string' ? (
                      <img
                        src={type.icon}
                        alt={type.name}
                        className="w-16 h-16 mx-auto mb-3 object-contain transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 group-hover:drop-shadow-lg"
                      />
                    ) : (
                      React.createElement(type.icon as React.ComponentType<{ className?: string }>, {
                        className: "w-14 h-14 mx-auto mb-3 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 group-hover:drop-shadow-lg"
                      })
                    )}
                    <div
                      className="text-base font-black text-yellow-600 tracking-wider"
                      style={{
                        textShadow: '1px 1px 0px black, -1px -1px 0px black, 1px -1px 0px black, -1px 1px 0px black, 0 2px 4px rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      {type.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>



            {/* Genre Categories Slider */}
            <div className="mb-8">
              <h3 className="text-2xl font-superclarendon-bold text-blue-800 mb-6 text-center">Genres</h3>
              <div className="flex items-center space-x-4">
                {/* Left Arrow */}
                <button
                  onClick={() => {
                    const container = document.getElementById('genres-container');
                    if (container) {
                      container.scrollBy({ left: -200, behavior: 'smooth' });
                    }
                  }}
                  className="flex-shrink-0 w-10 h-10 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full flex items-center justify-center hover:bg-white hover:shadow-md transition-all duration-200 shadow-sm"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div id="genres-container" className="flex-1 overflow-x-auto scrollbar-hide">
                  <div className="flex space-x-3 pb-4 pt-2" style={{ width: 'max-content' }}>
                    {[
                      // Science & Nature
                      { name: 'Animals & Their Habitats', icon: '🦁', color: 'bg-orange-100 border-orange-300 text-orange-700' },
                      { name: 'Plants & Their Environments', icon: '🌱', color: 'bg-green-100 border-green-300 text-green-700' },
                      { name: 'Weather', icon: '🌤️', color: 'bg-blue-100 border-blue-300 text-blue-700' },
                      { name: 'Space', icon: '🚀', color: 'bg-indigo-100 border-indigo-300 text-indigo-700' },
                      { name: 'Five Senses', icon: '👁️', color: 'bg-purple-100 border-purple-300 text-purple-700' },

                      // Animals
                      { name: 'Backyard Animals', icon: '🐿️', color: 'bg-amber-100 border-amber-300 text-amber-700' },
                      { name: 'Baby Animals', icon: '🐣', color: 'bg-pink-100 border-pink-300 text-pink-700' },
                      { name: 'Sharks', icon: '🦈', color: 'bg-cyan-100 border-cyan-300 text-cyan-700' },
                      { name: 'Big Cats', icon: '🐅', color: 'bg-orange-100 border-orange-300 text-orange-700' },
                      { name: 'Birds', icon: '🦅', color: 'bg-sky-100 border-sky-300 text-sky-700' },
                      { name: 'Snakes', icon: '🐍', color: 'bg-green-100 border-green-300 text-green-700' },
                      { name: 'Bugs', icon: '🐛', color: 'bg-lime-100 border-lime-300 text-lime-700' },
                      { name: 'Cats', icon: '🐱', color: 'bg-gray-100 border-gray-300 text-gray-700' },
                      { name: 'Dinosaurs', icon: '🦕', color: 'bg-emerald-100 border-emerald-300 text-emerald-700' },
                      { name: 'Dogs', icon: '🐕', color: 'bg-yellow-100 border-yellow-300 text-yellow-700' },
                      { name: 'Fish', icon: '🐠', color: 'bg-blue-100 border-blue-300 text-blue-700' },
                      { name: 'Pets', icon: '🐾', color: 'bg-rose-100 border-rose-300 text-rose-700' },
                      { name: 'Horses', icon: '🐎', color: 'bg-amber-100 border-amber-300 text-amber-700' },
                      { name: 'Unicorns', icon: '🦄', color: 'bg-purple-100 border-purple-300 text-purple-700' },

                      // Creative Arts
                      { name: 'Art', icon: '🎨', color: 'bg-purple-100 border-purple-300 text-purple-700' },
                      { name: 'Music', icon: '🎵', color: 'bg-pink-100 border-pink-300 text-pink-700' },
                      { name: 'Makerspace', icon: '🔧', color: 'bg-orange-100 border-orange-300 text-orange-700' },

                      // Health & Wellness
                      { name: 'Bodies in Motion', icon: '🏃', color: 'bg-red-100 border-red-300 text-red-700' },
                      { name: 'Healthy Habits', icon: '🥗', color: 'bg-green-100 border-green-300 text-green-700' },
                      { name: 'Mindfulness', icon: '🧘', color: 'bg-indigo-100 border-indigo-300 text-indigo-700' },

                      // Sports & Activities
                      { name: 'Soccer', icon: '⚽', color: 'bg-green-100 border-green-300 text-green-700' },
                      { name: 'Sports', icon: '🏈', color: 'bg-red-100 border-red-300 text-red-700' },

                      // Seasons & Holidays
                      { name: 'Winter', icon: '❄️', color: 'bg-blue-100 border-blue-300 text-blue-700' },
                      { name: 'Spring', icon: '🌸', color: 'bg-pink-100 border-pink-300 text-pink-700' },

                      // Fantasy & Imagination
                      { name: 'Princesses', icon: '👸', color: 'bg-pink-100 border-pink-300 text-pink-700' },
                      { name: 'Fairy Tales', icon: '🧚', color: 'bg-violet-100 border-violet-300 text-violet-700' },
                      { name: 'Mythical Creatures', icon: '🐉', color: 'bg-emerald-100 border-emerald-300 text-emerald-700' },
                      { name: 'Superheroes', icon: '🦸', color: 'bg-red-100 border-red-300 text-red-700' },
                      { name: 'Comic Books', icon: '💥', color: 'bg-yellow-100 border-yellow-300 text-yellow-700' },

                      // Math & Learning
                      { name: 'Money', icon: '💰', color: 'bg-green-100 border-green-300 text-green-700' },
                      { name: 'Telling Time', icon: '⏰', color: 'bg-blue-100 border-blue-300 text-blue-700' },
                      { name: 'Addition & Subtraction', icon: '➕', color: 'bg-orange-100 border-orange-300 text-orange-700' },
                      { name: 'Counting', icon: '🔢', color: 'bg-indigo-100 border-indigo-300 text-indigo-700' },
                      { name: 'Measuring', icon: '📏', color: 'bg-purple-100 border-purple-300 text-purple-700' },
                      { name: 'Shapes, Colors, Letters & Numbers', icon: '🔤', color: 'bg-cyan-100 border-cyan-300 text-cyan-700' },

                      // History & Social Studies
                      { name: 'American Symbols', icon: '🗽', color: 'bg-red-100 border-red-300 text-red-700' },
                      { name: 'Biography', icon: '📖', color: 'bg-amber-100 border-amber-300 text-amber-700' },
                      { name: 'Black History Month', icon: '✊', color: 'bg-gray-100 border-gray-300 text-gray-700' },
                      { name: 'Economics: Goods & Services', icon: '🏪', color: 'bg-green-100 border-green-300 text-green-700' },
                      { name: 'Explore Our Past & Present', icon: '🏛️', color: 'bg-stone-100 border-stone-300 text-stone-700' },
                      { name: 'History', icon: '📜', color: 'bg-yellow-100 border-yellow-300 text-yellow-700' },
                      { name: 'Native Americans', icon: '🪶', color: 'bg-orange-100 border-orange-300 text-orange-700' },
                      { name: 'Our Neighborhood', icon: '🏘️', color: 'bg-blue-100 border-blue-300 text-blue-700' },
                      { name: "Women's History Month", icon: '👩', color: 'bg-purple-100 border-purple-300 text-purple-700' },

                      // Transportation
                      { name: 'Adventure', icon: '🗺️', color: 'bg-green-100 border-green-300 text-green-700' },
                      { name: 'Airplanes', icon: '✈️', color: 'bg-sky-100 border-sky-300 text-sky-700' },
                      { name: 'Boats & Ships', icon: '🚢', color: 'bg-blue-100 border-blue-300 text-blue-700' },
                      { name: 'Cars & Trucks', icon: '🚗', color: 'bg-red-100 border-red-300 text-red-700' },
                      { name: 'Cars, Trucks & Trains', icon: '🚛', color: 'bg-orange-100 border-orange-300 text-orange-700' },
                      { name: 'Trains', icon: '🚂', color: 'bg-gray-100 border-gray-300 text-gray-700' },

                      // Social & Emotional Learning
                      { name: 'Bravery', icon: '🦁', color: 'bg-yellow-100 border-yellow-300 text-yellow-700' },
                      { name: 'Bullying', icon: '🛡️', color: 'bg-blue-100 border-blue-300 text-blue-700' },
                      { name: 'Exploring My World', icon: '🌍', color: 'bg-green-100 border-green-300 text-green-700' },
                      { name: 'Families', icon: '👨‍👩‍👧‍👦', color: 'bg-pink-100 border-pink-300 text-pink-700' },
                      { name: 'Friendship', icon: '👫', color: 'bg-rose-100 border-rose-300 text-rose-700' },
                      { name: 'Grief & Loss', icon: '💙', color: 'bg-blue-100 border-blue-300 text-blue-700' },
                      { name: 'Growth Mindset', icon: '🌱', color: 'bg-green-100 border-green-300 text-green-700' },
                      { name: 'Identifying Emotions', icon: '😊', color: 'bg-yellow-100 border-yellow-300 text-yellow-700' },
                      { name: 'Jobs Around Town', icon: '👷', color: 'bg-orange-100 border-orange-300 text-orange-700' },
                      { name: 'Kindness', icon: '💝', color: 'bg-pink-100 border-pink-300 text-pink-700' },
                      { name: 'Laugh Out Loud', icon: '😂', color: 'bg-amber-100 border-amber-300 text-amber-700' },
                      { name: 'Learning to Read', icon: '📚', color: 'bg-indigo-100 border-indigo-300 text-indigo-700' },
                      { name: 'Narrative Nonfiction', icon: '📰', color: 'bg-gray-100 border-gray-300 text-gray-700' }
                    ].map((genre) => (
                      <button
                        key={genre.name}
                        onClick={() => {
                          setSelectedCategory(genre.name);
                          // Update the filter system when genre is selected
                          updateFilters({ genre: genre.name });
                        }}
                        className={`p-4 rounded-lg border-2 transition-all duration-300 hover:scale-105 hover:shadow-md flex flex-col items-center justify-center flex-shrink-0 w-32 h-32 ${selectedCategory === genre.name
                          ? 'bg-brand-pink border-brand-pink text-white shadow-lg'
                          : genre.color
                          }`}
                      >
                        <span className="text-4xl mb-2">{genre.icon}</span>
                        <span className="text-sm font-medium text-center leading-tight">{genre.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right Arrow */}
                <button
                  onClick={() => {
                    const container = document.getElementById('genres-container');
                    if (container) {
                      container.scrollBy({ left: 200, behavior: 'smooth' });
                    }
                  }}
                  className="flex-shrink-0 w-10 h-10 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full flex items-center justify-center hover:bg-white hover:shadow-md transition-all duration-200 shadow-sm"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Category Filter */}
            <div className="mb-8">
              <div className="flex items-start space-x-4">
                {/* All Button */}
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700 mb-2">Books</span>
                  <button
                    onClick={() => {
                      setSelectedCategory('All');
                      // Clear genre filter when "All" is selected
                      updateFilters({ genre: 'All' });
                    }}
                    className={`px-6 py-3 rounded-lg font-medium transition-all duration-300 ${selectedCategory === 'All'
                      ? 'bg-brand-pink text-white shadow-lg'
                      : 'bg-white border border-blue-300 text-blue-700 hover:border-blue-400 hover:shadow-md hover:bg-blue-50'
                      }`}
                  >
                    All
                  </button>
                </div>

                {/* Reading Level Dropdown */}
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700 mb-2">Reading Level</span>
                  <select
                    value={selectedLevel}
                    onChange={(e) => {
                      setSelectedLevel(e.target.value);
                      // Update the filter system when reading level is selected
                      updateFilters({ readingLevel: e.target.value });
                    }}
                    className="px-4 py-3 bg-white border border-blue-300 text-blue-700 rounded-lg font-medium hover:border-blue-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  >
                    {readingLevels.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category Dropdown */}
                <div className="flex flex-col flex-1">
                  <span className="text-sm font-medium text-gray-700 mb-2">Categories</span>
                  <CategoryDropdown
                    selectedCategory={selectedCategory}
                    onCategorySelect={setSelectedCategory}
                    isCompact={true}
                  />
                </div>
              </div>
            </div>

            {/* Selected Category Display */}
            {selectedCategory && selectedCategory !== 'All' && (
              <div className="mb-8 p-4 bg-yellow-100 rounded-xl border border-yellow-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-brand-yellow rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">📚</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-yellow-900">Selected Category</h3>
                      <p className="text-yellow-800">{selectedCategory}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCategory('All');
                      // Clear all filters when clearing category
                      clearFilters();
                    }}
                    className="px-4 py-2 bg-brand-pink text-white rounded-lg hover:bg-pink-800 transition-colors text-sm font-medium shadow-md"
                  >
                    Clear Filter
                  </button>
                </div>
              </div>
            )}

            {/* Continue Reading Section - Hide when Read to Me or Voice Coach is selected */}
            {selectedContentType !== 'Read to Me' && selectedContentType !== 'Voice Coach' && (
              <div className="mb-12">
                <h3 className="text-2xl font-superclarendon-bold text-blue-800 mb-6">Continue Reading</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                  {/* Display recently uploaded PDF books that match current content type */}
                  {uploadedPdfBooks.filter(book => {
                    // Only show PDFs that match the current selected content type
                    if (selectedContentType === 'All Book') return true; // Show all in All Book section
                    if (selectedContentType === 'Books' && book.mediaType === 'Books') return true;
                    if (selectedContentType === 'Video Books' && (book.mediaType === 'Video Books' || book.mediaType === 'Videos')) return true;
                    if (selectedContentType === 'Audiobooks' && book.mediaType === 'Audiobooks') return true;
                    return false; // Don't show PDFs that don't match current section
                  }).slice(0, 3).map((book) => (
                    <div
                      key={`continue-${book.id}`}
                      className="group cursor-pointer"
                      onClick={() => {
                        console.log('📖 Continue reading book clicked:', book.title);
                        handlePdfBookSelect(book);
                      }}
                    >
                      <div className="aspect-[3/4] bg-gray-200 rounded-lg mb-3 group-hover:shadow-lg group-hover:scale-105 transition-all duration-300 border border-gray-300 overflow-hidden relative">
                        <img
                          src={book.cover}
                          alt={book.title}
                          className="w-full h-full object-cover"
                        />
                        {/* Progress indicator */}
                        {book.pagesRead && book.totalPages && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70">
                            <div className="h-1 bg-gray-600">
                              <div
                                className="h-full bg-blue-500 transition-all duration-300"
                                style={{ width: `${(book.pagesRead / book.totalPages) * 100}%` }}
                              />
                            </div>
                            <div className="text-white text-xs px-2 py-1">
                              {Math.round((book.pagesRead / book.totalPages) * 100)}% complete
                            </div>
                          </div>
                        )}
                        {/* Dynamic book type indicator based on media type */}
                        <div className={`absolute top-2 right-2 text-white text-xs px-2 py-1 rounded font-medium ${
                          book.mediaType === 'Read to me' ? 'bg-purple-600/90' :
                          book.mediaType === 'Voice Coach' ? 'bg-green-600/90' :
                          book.mediaType === 'Video Books' || book.mediaType === 'Videos' ? 'bg-red-600/90' :
                          book.mediaType === 'Audiobooks' ? 'bg-blue-600/90' :
                          book.mediaType === 'Books' ? 'bg-gray-700/90' :
                          'bg-black/70'
                        }`}>
                          {book.mediaType === 'Read to me' ? 'Read to Me' :
                           book.mediaType === 'Voice Coach' ? 'Voice Coach' :
                           book.mediaType === 'Video Books' ? 'Video Book' :
                           book.mediaType === 'Videos' ? 'Video' :
                           book.mediaType === 'Audiobooks' ? 'Audiobook' :
                           book.mediaType === 'Books' ? 'Book' :
                           'PDF'}
                        </div>
                      </div>
                      <div className="text-sm font-superclarendon-bold text-blue-700 text-center mt-2 leading-tight">
                        {book.title}
                      </div>
                      <div className="text-xs text-gray-600 text-center">
                        {book.author}
                      </div>
                    </div>
                  ))}
                  {/* Display uploaded videos first - Only show when Video Books is selected */}
                  {selectedContentType === 'Video Books' && uploadedVideoBooks.map((videoBook) => (
                    <div
                      key={videoBook.id}
                      className="group cursor-pointer"
                      onClick={() => {
                        setSelectedBookId(videoBook.id);
                        setCurrentView('video-book');
                      }}
                    >
                      <div className="aspect-[3/4] bg-black rounded-lg mb-3 group-hover:shadow-lg group-hover:scale-105 transition-all duration-300 border border-purple-300 overflow-hidden relative">
                        <img
                          src={videoBook.cover}
                          alt={videoBook.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
                            <Play className="w-6 h-6 text-gray-800 ml-0.5" />
                          </div>
                        </div>
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          {Math.floor(videoBook.duration / 60)}:{(videoBook.duration % 60).toString().padStart(2, '0')}
                        </div>
                      </div>
                      <div className="text-sm font-superclarendon-bold text-purple-700 text-center mt-2 leading-tight">
                        {videoBook.title}
                      </div>
                    </div>
                  ))}

                  {/* Default Video Book - Only show when Video Books is selected and no uploaded videos */}
                  {selectedContentType === 'Video Books' && uploadedVideoBooks.length === 0 && (
                    <div
                      className="group cursor-pointer"
                      onClick={() => setCurrentView('video-book')}
                    >
                      <div className="aspect-[3/4] bg-gradient-to-br from-purple-400 via-pink-400 to-yellow-400 rounded-lg mb-3 group-hover:shadow-lg group-hover:scale-105 transition-all duration-300 border border-purple-300 overflow-hidden relative">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-4xl mb-2">🦄</div>
                            <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center mx-auto">
                              <Play className="w-4 h-4 text-gray-800 ml-0.5" />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-superclarendon-bold text-purple-700 text-center mt-2 leading-tight">
                        Pretty Perfect Kitty-Corn
                      </div>
                    </div>
                  )}

                  {/* Audiobook - Only show when Audiobooks is selected */}
                  {selectedContentType === 'Audiobooks' && (
                    <div
                      className="group cursor-pointer"
                      onClick={() => setCurrentView('audiobook')}
                    >
                      <div className="aspect-[3/4] bg-gradient-to-br from-teal-400 via-cyan-500 to-blue-500 rounded-lg mb-3 group-hover:shadow-lg group-hover:scale-105 transition-all duration-300 border border-teal-300 overflow-hidden relative">
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
                          <div className="text-center">
                            <div className="text-2xl mb-2">🏫📚</div>
                            <div className="text-white text-xs font-superclarendon-bold leading-tight mb-2">
                              MISS NELSON HAS A FIELD DAY
                            </div>
                            <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center mx-auto">
                              <Volume2 className="w-4 h-4 text-gray-800" />
                            </div>
                          </div>
                        </div>
                        <div className="absolute bottom-2 right-2 bg-teal-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                          Audiobook 🔊
                        </div>
                      </div>
                      <div className="text-sm font-superclarendon-bold text-purple-700 text-center mt-2 leading-tight">
                        Miss Nelson Has a Field Day
                      </div>
                    </div>
                  )}

                  {/* Display uploaded PDF books - Show PDFs that match current content type */}
                  {(() => {
                    // Don't show Featured Books section in All Book view - it has its own categorized sections
                    if (selectedContentType === 'All Book') return [];

                    // For specific content types, show only PDFs that match that type
                    let mediaTypeToShow = '';
                    if (selectedContentType === 'Books') mediaTypeToShow = 'Books';
                    if (selectedContentType === 'Voice Coach') mediaTypeToShow = 'Voice Coach';
                    if (selectedContentType === 'Read to Me') mediaTypeToShow = 'Read to me';
                    if (selectedContentType === 'Video Books') mediaTypeToShow = 'Video Books';
                    if (selectedContentType === 'Audiobooks') mediaTypeToShow = 'Audiobooks';

                    return getPdfsByMediaType(mediaTypeToShow).slice(0, 3);
                  })().map((pdfBook) => (
                    <BookCardWithHover
                      key={pdfBook.id}
                      book={pdfBook}
                      onClick={() => {
                        if ((pdfBook as any).needsReupload) {
                          alert('This PDF needs to be re-uploaded. Please go to Upload Files and upload it again.');
                          return;
                        }
                        handlePdfBookSelect(pdfBook);
                      }}
                      onToggleFavorite={() => toggleFavorite(pdfBook, 'books')}
                      isFavorited={isFavorited(pdfBook.id, 'books')}
                      category={pdfBook.mediaType === 'Read to me' ? 'Read to Me' :
                               pdfBook.mediaType === 'Voice Coach' ? 'Voice Coach' :
                               pdfBook.mediaType === 'Video Books' ? 'Video Book' :
                               pdfBook.mediaType === 'Videos' ? 'Video' :
                               pdfBook.mediaType === 'Audiobooks' ? 'Audiobook' :
                               pdfBook.mediaType === 'Books' ? 'Book' : 'PDF'}
                      showProgress={true}
                    />
                  ))}

                  {/* Fill remaining slots with placeholder books */}
                  {[...Array(Math.max(0, 6 - uploadedPdfBooks.length))].map((_, index) => (
                    <div
                      key={`placeholder-${index}`}
                      className="group cursor-pointer"
                      onClick={() => {
                        // Add smooth transition
                        setTimeout(() => {
                          setCurrentView('book');
                        }, 100);
                      }}
                    >
                      <div className="aspect-[3/4] bg-blue-200 rounded-lg mb-3 group-hover:shadow-lg group-hover:scale-105 transition-all duration-300 border border-blue-300"></div>
                    </div>
                  ))}
                </div>

                {/* Progress indicator */}
                <div className="flex justify-center mt-6">
                  <div className="flex space-x-2">
                    <div className="w-8 h-1 bg-brand-pink rounded"></div>
                    <div className="w-1 h-1 bg-blue-300 rounded"></div>
                    <div className="w-1 h-1 bg-blue-300 rounded"></div>
                  </div>
                </div>
              </div>
            )}

            {/* All Books - Categorized Sections */}
            {selectedContentType === 'All Book' && (
              <div className="space-y-12">
                {/* Books Section */}
                {(filteredBooks.filter(book => book.category === 'books').length > 0 || uploadedPdfBooks.filter(pdf => pdf.mediaType === 'Books').length > 0) && (
                  <div className="mb-12">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-2xl font-superclarendon-bold text-blue-800">Book</h3>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleCarouselPrev('books')}
                          className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleCarouselNext('books')}
                          className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex gap-6 transition-transform duration-300">
                        {(uploadedPdfBooks.filter(pdf => pdf.mediaType === 'Books').length > 0 ? uploadedPdfBooks.filter(pdf => pdf.mediaType === 'Books') : filteredBooks.filter(book => book.category === 'books')).slice(carouselIndices.books, carouselIndices.books + getBooksPerPage()).map((book) => (
                          <div key={`books-${book.id}`} className="flex-shrink-0 w-48">
                            <BookCardWithHover
                              book={book}
                              onClick={() => handlePdfBookSelect(book as PdfBookData)}
                              onToggleFavorite={() => toggleFavorite(book, 'books')}
                              isFavorited={isFavorited(book.id, 'books')}
                              category="books"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Video Books Section */}
                <div className="mb-12">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-superclarendon-bold text-blue-800">Videos</h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleCarouselPrev('videos')}
                        className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleCarouselNext('videos')}
                        className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex gap-6 transition-transform duration-300">
                      {/* Show uploaded videos with "Video Books" or "Videos" media type first */}
                      {uploadedVideoBooks.filter(video => video.mediaType === 'Video Books' || video.mediaType === 'Videos').slice(carouselIndices.videos, carouselIndices.videos + getBooksPerPage()).map((videoBook) => (
                        <div key={`video-uploaded-${videoBook.id}`} className="flex-shrink-0 w-48">
                          <BookCardWithHover
                            book={videoBook}
                            onClick={() => {
                              setSelectedBookId(videoBook.id);
                              setCurrentView('video-book');
                            }}
                            onToggleFavorite={() => toggleFavorite(videoBook, 'videoBooks')}
                            isFavorited={isFavorited(videoBook.id, 'videoBooks')}
                            category="videoBooks"
                          />
                        </div>
                      ))}
                      {/* Show uploaded PDFs with "Video Books" or "Videos" media type */}
                      {uploadedPdfBooks.filter(pdf => pdf.mediaType === 'Video Books' || pdf.mediaType === 'Videos').slice(carouselIndices.videos, carouselIndices.videos + getBooksPerPage()).map((pdfBook) => (
                        <div key={`video-pdf-${pdfBook.id}`} className="flex-shrink-0 w-48">
                          <BookCardWithHover
                            book={pdfBook}
                            onClick={() => handlePdfBookSelect(pdfBook)}
                            onToggleFavorite={() => toggleFavorite(pdfBook, 'videoBooks')}
                            isFavorited={isFavorited(pdfBook.id, 'videoBooks')}
                            category={pdfBook.mediaType === 'Read to me' ? 'Read to Me' :
                                     pdfBook.mediaType === 'Voice Coach' ? 'Voice Coach' :
                                     pdfBook.mediaType === 'Video Books' ? 'Video Book' :
                                     pdfBook.mediaType === 'Videos' ? 'Video' :
                                     pdfBook.mediaType === 'Audiobooks' ? 'Audiobook' :
                                     pdfBook.mediaType === 'Books' ? 'Book' : 'PDF'}
                          />
                        </div>
                      ))}
                      {/* Then show sample videos if no uploaded content */}
                      {(uploadedVideoBooks.filter(video => video.mediaType === 'Video Books' || video.mediaType === 'Videos').length === 0 &&
                        uploadedPdfBooks.filter(pdf => pdf.mediaType === 'Video Books' || pdf.mediaType === 'Videos').length === 0) &&
                        [
                          { id: 'v1', title: 'Sample Video Book 1', author: 'Video Creator', cover: 'https://images.pexels.com/photos/1148399/pexels-photo-1148399.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1', totalPages: 0, gradeLevel: 'K1' },
                          { id: 'v2', title: 'Sample Video Book 2', author: 'Video Creator', cover: 'https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1', totalPages: 0, gradeLevel: 'K2' },
                          { id: 'v3', title: 'Sample Video Book 3', author: 'Video Creator', cover: 'https://images.pexels.com/photos/1181345/pexels-photo-1181345.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&dpr=1', totalPages: 0, gradeLevel: '1A' }
                        ].slice(carouselIndices.videos, carouselIndices.videos + getBooksPerPage()).map((book) => (
                          <div key={`video-${book.id}`} className="flex-shrink-0 w-48">
                            <BookCardWithHover
                              book={book}
                              onClick={() => setCurrentView('video-book')}
                              onToggleFavorite={() => toggleFavorite(book, 'videoBooks')}
                              isFavorited={isFavorited(book.id, 'videoBooks')}
                              category="videoBooks"
                            />
                          </div>
                        ))
                      }
                    </div>
                  </div>
                </div>

                {/* Voice Coach Books Section - Hide when Voice Coach is specifically selected */}
                {selectedContentType !== 'Voice Coach' && (
                  <div className="mb-12">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-2xl font-superclarendon-bold text-blue-800">Voice Coach Books</h3>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleCarouselPrev('voiceCoach')}
                          className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleCarouselNext('voiceCoach')}
                          className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex gap-6 transition-transform duration-300">
                        {/* Show uploaded PDFs with "Voice Coach" media type first */}
                        {uploadedPdfBooks.filter(pdf => pdf.mediaType === 'Voice Coach').slice(carouselIndices.voiceCoach, carouselIndices.voiceCoach + getBooksPerPage()).map((pdfBook) => (
                          <div key={`voice-pdf-${pdfBook.id}`} className="flex-shrink-0 w-48">
                            <BookCardWithHover
                              book={pdfBook}
                              onClick={() => handlePdfBookSelect(pdfBook)}
                              onToggleFavorite={() => toggleFavorite(pdfBook, 'voiceCoach')}
                              isFavorited={isFavorited(pdfBook.id, 'voiceCoach')}
                              category={pdfBook.mediaType === 'Read to me' ? 'Read to Me' :
                                       pdfBook.mediaType === 'Voice Coach' ? 'Voice Coach' :
                                       pdfBook.mediaType === 'Video Books' ? 'Video Book' :
                                       pdfBook.mediaType === 'Videos' ? 'Video' :
                                       pdfBook.mediaType === 'Audiobooks' ? 'Audiobook' :
                                       pdfBook.mediaType === 'Books' ? 'Book' : 'PDF'}
                              showProgress={true}
                            />
                          </div>
                        ))}
                        {/* Then show hardcoded Voice Coach books */}
                        {voiceCoachBooks.slice(carouselIndices.voiceCoach, carouselIndices.voiceCoach + getBooksPerPage()).map((book) => (
                          <div key={`voice-${book.id}`} className="flex-shrink-0 w-48">
                            <BookCardWithHover
                              book={{
                                ...book,
                                gradeLevel: book.difficulty,
                                totalPages: book.totalSessions * 5 // Estimate pages based on sessions
                              }}
                              onClick={() => {
                                setSelectedBookId(book.id);
                                setCurrentView('voice-practice');
                              }}
                              onToggleFavorite={() => toggleFavorite(book, 'voiceCoach')}
                              isFavorited={isFavorited(book.id, 'voiceCoach')}
                              category="voiceCoach"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Read to Me Books Section */}
                {(readToMeBooks.length > 0 || uploadedPdfBooks.filter(pdf => pdf.mediaType === 'Read to me').length > 0) && (
                  <div className="mb-12">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-2xl font-superclarendon-bold text-blue-800">Read to Me</h3>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleCarouselPrev('readToMe')}
                          className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleCarouselNext('readToMe')}
                          className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex gap-6 transition-transform duration-300">
                        {/* Show uploaded PDFs with "Read to me" media type first */}
                        {uploadedPdfBooks.filter(pdf => pdf.mediaType === 'Read to me').slice(carouselIndices.readToMe, carouselIndices.readToMe + getBooksPerPage()).map((pdfBook) => (
                          <div key={`readtome-pdf-${pdfBook.id}`} className="flex-shrink-0 w-48">
                            <BookCardWithHover
                              book={pdfBook}
                              onClick={() => handlePdfReadAlongSelect(pdfBook)}
                              onToggleFavorite={() => toggleFavorite(pdfBook, 'readToMe')}
                              isFavorited={isFavorited(pdfBook.id, 'readToMe')}
                              category={pdfBook.mediaType === 'Read to me' ? 'Read to Me' :
                                       pdfBook.mediaType === 'Voice Coach' ? 'Voice Coach' :
                                       pdfBook.mediaType === 'Video Books' ? 'Video Book' :
                                       pdfBook.mediaType === 'Videos' ? 'Video' :
                                       pdfBook.mediaType === 'Audiobooks' ? 'Audiobook' :
                                       pdfBook.mediaType === 'Books' ? 'Book' : 'PDF'}
                              showProgress={true}
                            />
                          </div>
                        ))}
                        {/* Then show regular Read to Me books */}
                        {readToMeBooks.slice(carouselIndices.readToMe, carouselIndices.readToMe + getBooksPerPage()).map((book) => (
                          <div key={`readtome-${book.id}`} className="flex-shrink-0 w-48">
                            <BookCardWithHover
                              book={{
                                ...book,
                                gradeLevel: 'D - E',
                                totalPages: book.readingTime * 2 // Estimate pages based on reading time
                              }}
                              onClick={() => {
                                console.log('📚 Read to Me book selected:', book.title);
                                setSelectedBookId(book.id);
                                setCurrentView('read-to-me-book');
                              }}
                              onToggleFavorite={() => toggleFavorite(book, 'readToMe')}
                              isFavorited={isFavorited(book.id, 'readToMe')}
                              category="readToMe"
                              showProgress={book.progress !== undefined}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Audiobooks Section */}
                <div className="mb-12">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-superclarendon-bold text-blue-800">Audiobooks</h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleCarouselPrev('audiobooks')}
                        className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleCarouselNext('audiobooks')}
                        className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex gap-6 transition-transform duration-300">
                      {/* Show uploaded PDFs with "Audiobooks" media type first */}
                      {uploadedPdfBooks.filter(pdf => pdf.mediaType === 'Audiobooks').slice(carouselIndices.audiobooks, carouselIndices.audiobooks + getBooksPerPage()).map((pdfBook) => (
                        <div key={`audiobook-pdf-${pdfBook.id}`} className="flex-shrink-0 w-48">
                          <BookCardWithHover
                            book={pdfBook}
                            onClick={() => handlePdfBookSelect(pdfBook)}
                            onToggleFavorite={() => toggleFavorite(pdfBook, 'audiobooks')}
                            isFavorited={isFavorited(pdfBook.id, 'audiobooks')}
                            category={pdfBook.mediaType === 'Read to me' ? 'Read to Me' :
                                     pdfBook.mediaType === 'Voice Coach' ? 'Voice Coach' :
                                     pdfBook.mediaType === 'Video Books' ? 'Video Book' :
                                     pdfBook.mediaType === 'Videos' ? 'Video' :
                                     pdfBook.mediaType === 'Audiobooks' ? 'Audiobook' :
                                     pdfBook.mediaType === 'Books' ? 'Book' : 'PDF'}
                            showProgress={true}
                          />
                        </div>
                      ))}
                      {/* Then show hardcoded audiobooks */}
                      {readToMeBooks.slice(carouselIndices.audiobooks, carouselIndices.audiobooks + getBooksPerPage()).map((book) => (
                        <div key={`audiobook-${book.id}`} className="flex-shrink-0 w-48">
                          <BookCardWithHover
                            book={{
                              ...book,
                              gradeLevel: 'D - E',
                              totalPages: book.readingTime * 3 // Estimate pages based on reading time
                            }}
                            onClick={() => {
                              setSelectedBookId(book.id);
                              setCurrentView('audiobook');
                            }}
                            onToggleFavorite={() => toggleFavorite(book, 'audiobooks')}
                            isFavorited={isFavorited(book.id, 'audiobooks')}
                            category="audiobooks"
                            showProgress={book.progress !== undefined}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filtered Books Section - Only show when NOT All Books, Read to Me or Voice Coach */}
            {selectedContentType !== 'All Book' && selectedContentType !== 'Read to Me' && selectedContentType !== 'Voice Coach' && (
              <div className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-light text-blue-800">
                    {bookFilters.genre !== 'All' || bookFilters.readingLevel !== 'All' || bookFilters.searchQuery
                      ? 'Filtered Books'
                      : 'Featured Books'
                    }
                  </h3>
                  <div className="text-sm text-gray-600">
                    {(() => {
                      // Count books that match the current content type
                      let booksToShow = filteredBooks;
                      if (selectedContentType === 'Books') {
                        booksToShow = filteredBooks.filter(book => book.category === 'books');
                      } else if (selectedContentType === 'Video Books') {
                        booksToShow = filteredBooks.filter(book => book.category === 'videoBooks');
                      } else if (selectedContentType === 'Audiobooks') {
                        booksToShow = filteredBooks.filter(book => book.category === 'audiobooks');
                      }
                      return booksToShow.length;
                    })()} book{(() => {
                      let booksToShow = filteredBooks;
                      if (selectedContentType === 'Books') {
                        booksToShow = filteredBooks.filter(book => book.category === 'books');
                      } else if (selectedContentType === 'Video Books') {
                        booksToShow = filteredBooks.filter(book => book.category === 'videoBooks');
                      } else if (selectedContentType === 'Audiobooks') {
                        booksToShow = filteredBooks.filter(book => book.category === 'audiobooks');
                      }
                      return booksToShow.length !== 1 ? 's' : '';
                    })()} found
                  </div>
                </div>

                {(() => {
                  // Filter books to only show those that match the current content type
                  let booksToShow = filteredBooks;
                  if (selectedContentType === 'Books') {
                    booksToShow = filteredBooks.filter(book => book.category === 'books');
                  } else if (selectedContentType === 'Video Books') {
                    booksToShow = filteredBooks.filter(book => book.category === 'videoBooks');
                  } else if (selectedContentType === 'Audiobooks') {
                    booksToShow = filteredBooks.filter(book => book.category === 'audiobooks');
                  }
                  return booksToShow;
                })().length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                    {(() => {
                      // Filter books to only show those that match the current content type
                      let booksToShow = filteredBooks;
                      if (selectedContentType === 'Books') {
                        booksToShow = filteredBooks.filter(book => book.category === 'books');
                      } else if (selectedContentType === 'Video Books') {
                        booksToShow = filteredBooks.filter(book => book.category === 'videoBooks');
                      } else if (selectedContentType === 'Audiobooks') {
                        booksToShow = filteredBooks.filter(book => book.category === 'audiobooks');
                      }
                      return booksToShow.slice(0, 12);
                    })().map((book) => (
                      <div
                        key={`${book.category}-${book.id}`}
                        className="group cursor-pointer"
                        onClick={() => {
                          if (book.category === 'books') {
                            handlePdfBookSelect(book as PdfBookData);
                          } else if (book.category === 'videoBooks') {
                            // Handle video book selection
                            setCurrentView('video-book');
                          } else if (book.category === 'voiceCoach') {
                            setSelectedBookId(book.id);
                            setCurrentView('voice-practice');
                          } else if (book.category === 'readToMe') {
                            setSelectedBookId(book.id);
                            setCurrentView('read-to-me-book');
                          }
                        }}
                      >
                        <div className="aspect-[3/4] bg-white rounded-lg mb-3 group-hover:shadow-lg group-hover:scale-105 transition-all duration-300 border border-blue-300 overflow-hidden relative">
                          <img
                            src={book.cover}
                            alt={book.title}
                            className="w-full h-full object-cover"
                          />
                          {/* Category Badge */}
                          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            {book.category === 'books' ? 'PDF' :
                              book.category === 'videoBooks' ? 'Video' :
                                book.category === 'voiceCoach' ? 'Voice' : 'Audio'}
                          </div>
                          {/* Genre Badge */}
                          <div className="absolute bottom-2 left-2 bg-blue-500/80 text-white text-xs px-2 py-1 rounded">
                            {book.genre}
                          </div>
                          {/* Reading Level Badge */}
                          <div className="absolute bottom-2 right-2 bg-green-500/80 text-white text-xs px-2 py-1 rounded">
                            {book.gradeLevel || book.difficulty}
                          </div>
                        </div>
                        <div className="text-sm font-superclarendon-bold text-purple-700 text-center mt-2 leading-tight">
                          {book.title}
                        </div>
                        <div className="text-xs text-gray-500 text-center">
                          by {book.author}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📚</div>
                    <h4 className="text-xl font-semibold text-gray-700 mb-2">No books found</h4>
                    <p className="text-gray-500 mb-4">
                      Try adjusting your filters or upload some books to get started.
                    </p>
                    <button
                      onClick={clearFilters}
                      className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Read to Me Books Section - Only show when Read to Me is selected */}
            {selectedContentType === 'Read to Me' && (
              <div className="mb-12">

                {/* Read to Me Stories Section */}
                <div className="mb-8">
                  <h3 className="text-2xl font-light text-purple-800 mb-6">Read to Me Stories</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                    {readToMeBooks.map((book) => (
                      <BookCardWithHover
                        key={book.id}
                        book={{
                          ...book,
                          gradeLevel: 'D - E',
                          genre: book.category,
                          totalPages: book.readingTime * 2, // Estimate pages based on reading time
                          pagesRead: book.progress ? Math.round((book.progress / 100) * book.readingTime * 2) : 0
                        }}
                        onClick={() => {
                          console.log('📚 Read to Me book selected:', book.title);
                          setSelectedBookId(book.id);
                          setCurrentView('read-to-me-book');
                        }}
                        onToggleFavorite={() => toggleFavorite(book, 'readToMe')}
                        isFavorited={isFavorited(book.id, 'readToMe')}
                        category="Audio"
                        showProgress={true}
                      />
                    ))}
                  </div>
                </div>

                {/* Books Section within Read to Me - for uploaded PDFs */}
                {uploadedPdfBooks.filter(pdf => pdf.mediaType === 'Read to me').length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-2xl font-light text-purple-800 mb-6">Books</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                      {uploadedPdfBooks.filter(pdf => pdf.mediaType === 'Read to me').map((pdfBook) => (
                        <BookCardWithHover
                          key={pdfBook.id}
                          book={pdfBook}
                          onClick={() => handlePdfReadAlongSelect(pdfBook)}
                          onToggleFavorite={() => toggleFavorite(pdfBook, 'readToMe')}
                          isFavorited={isFavorited(pdfBook.id, 'readToMe')}
                          category={pdfBook.mediaType === 'Read to me' ? 'Read to Me' :
                                   pdfBook.mediaType === 'Voice Coach' ? 'Voice Coach' :
                                   pdfBook.mediaType === 'Video Books' ? 'Video Book' :
                                   pdfBook.mediaType === 'Videos' ? 'Video' :
                                   pdfBook.mediaType === 'Audiobooks' ? 'Audiobook' :
                                   pdfBook.mediaType === 'Books' ? 'Book' : 'PDF'}
                          showProgress={true}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Reading Tips */}
                <div className="mt-8 bg-purple-50 rounded-xl p-6 border border-purple-200">
                  <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center space-x-2">
                    <BookOpen className="w-5 h-5" />
                    <span>Read to Me Tips</span>
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm text-purple-800">
                    <div className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-brand-pink rounded-full mt-2 flex-shrink-0"></div>
                      <p>Follow along with the highlighted text as the story is read</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-brand-pink rounded-full mt-2 flex-shrink-0"></div>
                      <p>Use the pause button if you need more time to look at pictures</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-brand-pink rounded-full mt-2 flex-shrink-0"></div>
                      <p>Turn pages manually or let the story advance automatically</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <div className="w-2 h-2 bg-brand-pink rounded-full mt-2 flex-shrink-0"></div>
                      <p>Enjoy the beautiful illustrations and engaging narration</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Voice Coach Books Section - Only show when Voice Coach is selected */}
            {selectedContentType === 'Voice Coach' && (
              <div className="mb-12">
                {/* Voice Coach Practice Section */}
                <div className="mt-12 mb-8">
                  <h3 className="text-2xl font-light text-green-800 mb-6">Voice Coach Practice</h3>
                  {/* Debug info */}
                  {console.log('🎯 Voice Coach section - Total uploaded PDFs:', uploadedPdfBooks.length)}
                  {console.log('🎯 Voice Coach PDFs:', uploadedPdfBooks.filter(pdf => pdf.mediaType === 'Voice Coach'))}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                    {/* Show uploaded PDFs with "Voice Coach" media type first */}
                    {uploadedPdfBooks.filter(pdf => pdf.mediaType === 'Voice Coach').map((pdfBook) => (
                      <div key={`voice-pdf-${pdfBook.id}`} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                        {/* Book Cover */}
                        <div className="relative aspect-[3/4] overflow-hidden">
                          <img
                            src={pdfBook.cover}
                            alt={pdfBook.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                            PDF
                          </div>
                        </div>

                        {/* Book Info */}
                        <div className="p-4">
                          <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1">
                            {pdfBook.title}
                          </h3>
                          <p className="text-xs text-gray-500 mb-2">{pdfBook.author}</p>

                          {/* Progress Bar */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                              <span>Progress</span>
                              <span>{pdfBook.pagesRead || 0}/{pdfBook.totalPages}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-brand-pink h-2 rounded-full transition-all duration-300"
                                style={{ width: `${((pdfBook.pagesRead || 0) / pdfBook.totalPages) * 100}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{pdfBook.totalPages} pages</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Star className="w-3 h-3 fill-blue-500 text-blue-500" />
                              <span>{pdfBook.gradeLevel}</span>
                            </div>
                          </div>

                          {/* Start Practice Button */}
                          <button
                            onClick={() => {
                              console.log('🎯 Voice Coach PDF clicked:', pdfBook.title);
                              setSelectedPdfBook(pdfBook);
                              setSelectedBookId(pdfBook.id); // Also set selectedBookId for the rendering logic
                              setCurrentView('voice-practice');
                            }}
                            className="w-full bg-brand-pink hover:bg-pink-800 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-md"
                          >
                            <Play className="w-4 h-4" />
                            <span>Start Practice</span>
                          </button>
                        </div>
                      </div>
                    ))}
                    {/* Then show static voice coach books */}
                    {voiceCoachBooks.map((book) => (
                      <div key={book.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                        {/* Book Cover */}
                        <div className="relative aspect-[3/4] overflow-hidden">
                          <img
                            src={book.cover}
                            alt={book.title}
                            className="w-full h-full object-cover"
                          />
                          {book.practiceScore && (
                            <div className="absolute top-2 right-2 bg-brand-yellow text-white text-xs px-2 py-1 rounded-full font-medium">
                              {book.practiceScore}%
                            </div>
                          )}
                        </div>

                        {/* Book Info */}
                        <div className="p-4">
                          <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1">
                            {book.title}
                          </h3>
                          <p className="text-xs text-gray-500 mb-2">{book.author}</p>

                          {/* Progress Bar */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                              <span>Progress</span>
                              <span>{book.completedSessions}/{book.totalSessions}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-brand-pink h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(book.completedSessions / book.totalSessions) * 100}%` }}
                              ></div>
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{book.readingTime} min</span>
                            </div>
                            {book.practiceScore && (
                              <div className="flex items-center space-x-1">
                                <Star className="w-3 h-3 fill-brand-yellow text-brand-yellow" />
                                <span>{book.practiceScore}%</span>
                              </div>
                            )}
                          </div>

                          {/* Start Practice Button */}
                          <button
                            onClick={() => {
                              setSelectedBookId(book.id);
                              setCurrentView('voice-practice');
                            }}
                            className="w-full bg-brand-pink hover:bg-pink-800 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-md"
                          >
                            <Play className="w-4 h-4" />
                            <span>Start Practice</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Practice Tips */}
                  <div className="mt-8 bg-green-50 rounded-xl p-6 border border-green-200">
                    <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center space-x-2">
                      <Volume2 className="w-5 h-5" />
                      <span>Voice Coaching Tips</span>
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4 text-sm text-green-800">
                      <div className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-brand-pink rounded-full mt-2 flex-shrink-0"></div>
                        <p>Read slowly and clearly, focusing on pronunciation</p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-brand-pink rounded-full mt-2 flex-shrink-0"></div>
                        <p>Listen to the reference audio before recording</p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-brand-pink rounded-full mt-2 flex-shrink-0"></div>
                        <p>Practice difficult words multiple times</p>
                      </div>
                      <div className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-brand-pink rounded-full mt-2 flex-shrink-0"></div>
                        <p>Use proper expression and intonation</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>


    </div>
  );
}

function App() {
  return (
    <SubscriptionProvider>
      <UserStatsProvider>
        <AppContent />
      </UserStatsProvider>
    </SubscriptionProvider>
  );
}

export default App;