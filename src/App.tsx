import React, { useState, useEffect, useCallback } from 'react';
import { useMemo } from 'react';
import { UserStatsProvider, useUserStats } from './contexts/UserStatsContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { AdminProvider } from './contexts/AdminContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { useTranslation } from './contexts/LanguageContext';
import { ParentalControlsProvider, useParentalControlsContext } from './contexts/ParentalControlsContext';
import LanguageSwitch, { LanguageSwitchMobile } from './components/LanguageSwitch';
import LibraryPage from './pages/LibraryPage';
import MyLibraryPage from './pages/MyLibraryPage';
// import MyBuddyPage from './pages/MyBuddyPage'; // HIDDEN
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
import { useBooks } from './hooks/useBooks';
import ReadToMeBookCover from './components/ReadToMeBookCover';
import ReadAlongInterface from './components/ReadAlongInterface';
import VoiceCoachPracticeInterface from './components/VoiceCoachPracticeInterface';
import AudiobookPlayer from './components/AudiobookPlayer';
import PdfReadAlongInterface from './components/PdfReadAlongInterface';
import ShuSpotImageReaderWrapper from './components/ShuSpotImageReaderWrapper';
import { addFavourite, removeFavourite, getFavourites } from './api/favourites';
import { mapSupabaseBookToUI } from './utils/bookMapping';
import { BookOpen, Video, Mic, Volume2, Book, User, Settings, LogOut, Upload, Clock, Star, PlayCircle, Play, Eye, EyeOff, Heart } from 'lucide-react';
import { userProfile, featuredBooks, recommendedBooks } from './data/mockData';
import { READING_LEVELS, GENRES, MEDIA_TYPES, BookFilters as BookFiltersType, DEFAULT_FILTERS, matchesFilters, getUniqueValues } from './data/filterData';
import AuthFlow from './components/auth/AuthFlow';
import UserPortal from './components/UserPortal';
import FileUploadDashboard from './components/FileUploadDashboard';
import AdminUpload from './components/AdminUpload';
import PdfBookOverview from './components/PdfBookOverview';
import PdfViewer from './components/PdfViewer';
import CategoryDropdown from './components/CategoryDropdown';
import VideoBookPlayer from './components/VideoBookPlayer';
import BookFiltersComponent from './components/BookFilters';
import ContinueReadingSection from './components/ContinueReadingSection';
import VideoDiscoveryApp from './components/video/VideoDiscoveryApp';
import NewThreeTierNavigation from './components/library/NewThreeTierNavigation';
import EpicNavigationWrapper from './components/EpicNavigationWrapper';
import { useRecentVideos } from './hooks/useVideos';
import './styles/EpicNavigation.css';
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
import genreBg1 from './assets/Asset 1@2x.png';
import genreBg2 from './assets/Asset 2@2x.png';
import genreBg3 from './assets/Asset 3@2x.png';
import genreBg4 from './assets/Asset 4@2x.png';
import shuDogIcon from './assets/Shu Dog.png';



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
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { controls: parentalControls } = useParentalControlsContext();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; readingLevelSystem?: string; avatar?: string } | null>(null);



  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(true);

  const [currentView, setCurrentView] = useState<'dashboard' | 'new-library' | 'book' | 'voice-coaching' | 'voice-practice' | 'user-portal' | 'read-to-me-book' | 'pdf-overview' | 'pdf-viewer' | 'video-book' | 'read-along' | 'audiobook' | 'pdf-read-along' | 'shuspot-reader' | 'my-library'>('dashboard');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedPdfBook, setSelectedPdfBook] = useState<PdfBookData | null>(null);
  const [selectedSupabaseBook, setSelectedSupabaseBook] = useState<any | null>(null);
  const [initialPage, setInitialPage] = useState<number | undefined>(undefined);
  const [selectedLevel, setSelectedLevel] = useState('D - E');
  const [selectedContentType, setSelectedContentType] = useState('Voice Coach');
  const [selectedCategory, setSelectedCategory] = useState('All');


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

  // Sync NavigationContext with App.tsx's selectedContentType
  useEffect(() => {
    // Map NavigationContext media types to App.tsx content types
    const mediaTypeMap: Record<string, string> = {
      'books': 'All Book',
      'read-to-me': 'Read to Me',
      'audiobooks': 'Audiobooks',
      'video-books': 'Video Books',
      'videos': 'Video Books',
      'ai-voice': 'Voice Coach',
      'coach': 'Voice Coach',
      'comics': 'Books',
      'downloads': 'All Book'
    };
    
    const contentType = mediaTypeMap[navigation.selectedMediaType] || 'All Book';
    setSelectedContentType(contentType);

    // Navigate to the dedicated Voice Coach practice view when AI Voice / Coach icon is clicked
    if (navigation.selectedMediaType === 'ai-voice' || navigation.selectedMediaType === 'coach') {
      setCurrentView('voice-coaching');
    } else if (contentType !== 'Voice Coach') {
      setCurrentView(prev => (prev === 'voice-coaching' || prev === 'voice-practice') ? 'dashboard' : prev);
    }
  }, [navigation.selectedMediaType]);

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

  // Carousel state for each section - REMOVED: Epic navigation handles scrolling internally
  // const [carouselIndices, setCarouselIndices] = useState({
  //   books: 0,
  //   videos: 0,
  //   voiceCoach: 0,
  //   readToMe: 0,
  //   audiobooks: 0
  // });

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

        // Load user-specific favorites from Supabase (persistent) with localStorage fallback
        const userFavoritesKey = `favorites_${currentUser.id}`;
        try {
          const favResult = await getFavourites(currentUser.id);
          if (favResult.success && favResult.data && favResult.data.length > 0) {
            // Map Supabase favorites back into the category-based local state
            const mapped: typeof favorites = { books: [], videoBooks: [], voiceCoach: [], audiobooks: [], readToMe: [] };
            favResult.data.forEach(fav => {
              const ct = (fav.contentType || '').toLowerCase();
              const entry = { id: fav.bookId, title: fav.title, author: fav.author, cover: fav.thumbnailUrl, contentType: fav.contentType };
              if (ct.includes('read to me') || ct.includes('read-to-me')) mapped.readToMe.push(entry);
              else if (ct.includes('audiobook')) mapped.audiobooks.push(entry);
              else if (ct.includes('voice')) mapped.voiceCoach.push(entry);
              else if (ct.includes('video')) mapped.videoBooks.push(entry);
              else mapped.books.push(entry);
            });
            setFavorites(mapped);
          } else {
            // Fallback: migrate from localStorage if Supabase has nothing yet
            const storedFavorites = localStorage.getItem(userFavoritesKey);
            if (storedFavorites) {
              setFavorites(JSON.parse(storedFavorites));
            } else {
              setFavorites({ books: [], videoBooks: [], voiceCoach: [], audiobooks: [], readToMe: [] });
            }
          }
        } catch {
          // Fallback to localStorage if Supabase fails
          const storedFavorites = localStorage.getItem(userFavoritesKey);
          if (storedFavorites) {
            setFavorites(JSON.parse(storedFavorites));
          } else {
            setFavorites({ books: [], videoBooks: [], voiceCoach: [], audiobooks: [], readToMe: [] });
          }
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

  // Favorites are persisted to Supabase directly in addToFavorites/removeFromFavorites

  // Voice Coach books data - REMOVED hardcoded books, only use uploaded PDFs
  const voiceCoachBooks: any[] = [];

  // Fetch Read to Me books from Supabase
  const { books: supabaseReadToMeBooks } = useBooks({
    section: 'read-to-me',
    limit: 50
  });

  // Fetch ALL books from Supabase for "All Books" section
  const { books: supabaseAllBooks } = useBooks({
    section: 'all',
    limit: 100
  });

  // Fetch audiobooks from Supabase
  // Note: Using 'audiobook' (singular) as the standard content_type value
  const { books: supabaseAudiobooks } = useBooks({
    contentType: 'audiobook',
    limit: 50
  });

  // Fetch recent videos from Supabase
  const { videos: recentVideos, loading: recentVideosLoading } = useRecentVideos(10);

  // Use only Supabase Read to Me books (no hardcoded books)
  const readToMeBooks: any[] = [];

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

  const handleMyLibrary = () => {
    setCurrentView('my-library');
  };

  const handlePdfUploadSuccess = (pdfBook: PdfBookData) => {
    console.log('PDF upload success handler called:', pdfBook.title, 'Media Type:', pdfBook.mediaType);
    const updatedBooks = [...uploadedPdfBooks, pdfBook];
    setUploadedPdfBooks(updatedBooks);
    console.log('Updated PDF books array:', updatedBooks.length);

    // Upload completed

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

  const handleBookSelect = async (book: any) => {
    // Check if it's an uploaded PDF book (has a 'file' property)
    if ('file' in book && book.file instanceof File) {
      // It's an uploaded PDF
      handlePdfBookSelect(book as PdfBookData);
    } else {
      // It's a Supabase book - open ReadToMeBookOverview
      setSelectedBookId(book.id);
      setSelectedSupabaseBook(book);
      setCurrentView('read-to-me-book');
    }
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
    // Persist to Supabase
    if (currentUser?.id && item.id) {
      addFavourite(currentUser.id, item.id).catch(err => console.error('Failed to save favourite to Supabase:', err));
    }
  };

  const removeFromFavorites = (itemId: string, category: 'books' | 'videoBooks' | 'voiceCoach' | 'audiobooks' | 'readToMe') => {
    setFavorites(prev => ({
      ...prev,
      [category]: prev[category].filter(fav => fav.id !== itemId)
    }));
    // Remove from Supabase
    if (currentUser?.id && itemId) {
      removeFavourite(currentUser.id, itemId).catch(err => console.error('Failed to remove favourite from Supabase:', err));
    }
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

  // Carousel navigation functions - REMOVED: Epic navigation handles scrolling internally
  // const getBooksPerPage = () => {
  //   // Calculate how many books fit on screen based on book width (w-40 = 160px) + spacing
  //   const bookWidth = 160 + 24; // w-40 + space-x-6
  //   const containerWidth = window.innerWidth - 200; // Account for margins and padding
  //   return Math.floor(containerWidth / bookWidth) || 1;
  // };

  // const handleCarouselNext = (section: keyof typeof carouselIndices) => {
  //   const booksPerPage = getBooksPerPage();
  //   let totalBooks = 0;

  //   switch (section) {
  //     case 'books':
  //       totalBooks = uploadedPdfBooks.length > 0 ? uploadedPdfBooks.length : filteredBooks.filter(book => book.category === 'books').length;
  //       break;
  //     case 'videos':
  //       totalBooks = uploadedVideoBooks.length > 0 ? uploadedVideoBooks.length : 3; // Sample videos
  //       break;
  //     case 'voiceCoach':
  //       totalBooks = voiceCoachBooks.length;
  //       break;
  //     case 'readToMe':
  //       totalBooks = readToMeBooks.length;
  //       break;
  //     case 'audiobooks':
  //       totalBooks = readToMeBooks.length; // Using same data for now
  //       break;
  //   }

  //   setCarouselIndices(prev => ({
  //     ...prev,
  //     [section]: Math.min(prev[section] + booksPerPage, Math.max(0, totalBooks - booksPerPage))
  //   }));
  // };

  // const handleCarouselPrev = (section: keyof typeof carouselIndices) => {
  //   const booksPerPage = getBooksPerPage();

  //   setCarouselIndices(prev => ({
  //     ...prev,
  //     [section]: Math.max(0, prev[section] - booksPerPage)
  //   }));
  // };

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

  // Helper function to check if a media type is blocked by parental controls
  const isMediaTypeBlocked = (mediaTypeId: string): boolean => {
    if (!parentalControls || !parentalControls.blocked_media_types) {
      return false;
    }
    return parentalControls.blocked_media_types.includes(mediaTypeId);
  };

  // Compute filtered books based on current filters AND three-tier navigation
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
      // Removed voiceCoachBooks from filteredBooks - they should only appear in their dedicated section
      ...readToMeBooks.map(book => ({ ...book, category: 'readToMe', gradeLevel: 'D - E', genre: book.category })),
      // Include Supabase books from the "All Books" section
      ...supabaseAllBooks.map(book => ({
        ...book,
        category: book.contentType === 'video' ? 'videoBooks' :
                  book.contentType === 'audio' ? 'audiobooks' :
                  book.contentType === 'interactive' ? 'readToMe' :
                  'books',
        gradeLevel: book.readingLevel || 'Unknown',
        genre: book.category || 'Unknown'
      }))
    ];

    // Apply existing filters first
    let filtered = allBooks.filter(book => matchesFilters(book, bookFilters));

    // Apply parental control filters (Requirement 5.4)
    if (parentalControls) {
      // Filter by restricted grade levels
      if (parentalControls.restricted_grade_levels && parentalControls.restricted_grade_levels.length > 0) {
        filtered = filtered.filter(book => {
          const bookGrade = (book as any).readingLevel || (book as any).gradeLevel;
          return !parentalControls.restricted_grade_levels!.includes(bookGrade);
        });
      }

      // Filter by blocked media types
      if (parentalControls.blocked_media_types && parentalControls.blocked_media_types.length > 0) {
        filtered = filtered.filter(book => {
          // Map book categories to media type IDs
          const categoryToMediaType: Record<string, string> = {
            'books': 'books',
            'readToMe': 'read-to-me',
            'audiobooks': 'audiobooks',
            'videoBooks': 'video-books',
            'videos': 'videos',
            'voiceCoach': 'coach',
            'comics': 'comics',
            'downloads': 'downloads'
          };
          
          const bookMediaType = categoryToMediaType[book.category] || book.category;
          const bookContentType = (book as any).contentType;
          
          // Check if either the category-mapped media type or content type is blocked
          return !parentalControls.blocked_media_types!.includes(bookMediaType) &&
                 !parentalControls.blocked_media_types!.includes(bookContentType);
        });
      }

      // Filter by blocked genres
      if (parentalControls.blocked_genres && parentalControls.blocked_genres.length > 0) {
        filtered = filtered.filter(book => {
          const bookGenre = book.genre || (book as any).category;
          return !parentalControls.blocked_genres!.includes(bookGenre);
        });
      }
    }

    // THREE-TIER NAVIGATION FILTERS - TEMPORARILY DISABLED
    // TODO: Re-enable once we verify books are showing correctly
    // The filters are working but may be too restrictive initially
    
    // Uncomment these when ready to test:
    /*
    // Filter by grade level (Tier 1)
    if (navigation.selectedGrade && navigation.selectedGrade !== 'All' && navigation.selectedGrade !== '1') {
      filtered = filtered.filter(book => {
        const bookGrade = (book as any).readingLevel || (book as any).gradeLevel;
        return bookGrade === navigation.selectedGrade;
      });
    }

    // Filter by media type (Tier 2)
    if (navigation.selectedMediaType && navigation.selectedMediaType !== 'books') {
      filtered = filtered.filter(book => {
        const mediaTypeMap: Record<string, string[]> = {
          'read-to-me': ['readToMe', 'read-to-me'],
          'audiobooks': ['audiobooks'],
          'video-books': ['videoBooks', 'video-books'],
          'videos': ['videoBooks', 'videos'],
          'ai-voice-coach': ['voiceCoach'],
          'comics': ['comics'],
          'downloads': ['downloads']
        };
        
        const validCategories = mediaTypeMap[navigation.selectedMediaType] || [];
        return validCategories.includes(book.category) || 
               ((book as any).contentType === 'video' && navigation.selectedMediaType === 'video-books') ||
               ((book as any).contentType === 'audio' && navigation.selectedMediaType === 'audiobooks') ||
               ((book as any).contentType === 'interactive' && navigation.selectedMediaType === 'read-to-me');
      });
    }

    // Filter by genre (Tier 3)
    if (navigation.selectedGenre && navigation.selectedGenre !== 'All') {
      filtered = filtered.filter(book => {
        return book.category === navigation.selectedGenre || (book as any).genre === navigation.selectedGenre;
      });
    }
    */

    return filtered;
  }, [uploadedPdfBooks, uploadedVideoBooks, readToMeBooks, supabaseAllBooks, bookFilters, navigation.selectedGrade, navigation.selectedMediaType, navigation.selectedGenre, parentalControls]);

  // Get available filter options from current books
  const availableGenres = useMemo(() => {
    const allBooks = [
      ...uploadedPdfBooks,
      ...uploadedVideoBooks,
      // Removed voiceCoachBooks from genre filters - they should only appear in their dedicated section
      ...readToMeBooks.map(book => ({ ...book, genre: book.category }))
    ];
    return ['All', ...getUniqueValues(allBooks, 'genre')];
  }, [uploadedPdfBooks, uploadedVideoBooks, readToMeBooks]);

  const availableReadingLevels = useMemo(() => {
    const allBooks = [
      ...uploadedPdfBooks,
      ...uploadedVideoBooks,
      // Removed voiceCoachBooks from reading level filters - they should only appear in their dedicated section
      ...readToMeBooks.map(book => ({ ...book, gradeLevel: 'D - E' }))
    ];
    return ['All', ...getUniqueValues(allBooks, 'gradeLevel')];
  }, [uploadedPdfBooks, uploadedVideoBooks, readToMeBooks]);

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

  if (currentView === 'new-library') {
    return <LibraryPage />;
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
      // Handle regular Read to Me book from Supabase
      const readToMeBook = supabaseReadToMeBooks.find(book => book.id === selectedBookId) || supabaseReadToMeBooks[0];
      return (
        <ReadToMeBookCover
          onBack={() => setCurrentView('dashboard')}
          onStartReading={async () => {
            // Fetch the full book data from Supabase for the ShuSpot reader
            const { data: bookData, error } = await supabase
              .from('books')
              .select('*')
              .eq('id', selectedBookId)
              .single();
            
            if (bookData && !error) {
              // Transform the raw Supabase data to UI format
              const transformedBook = mapSupabaseBookToUI(bookData);
              setSelectedSupabaseBook(transformedBook);
              setCurrentView('shuspot-reader');
            } else {
              console.error('Error fetching book data:', error);
              // Fallback to read-along interface if fetch fails
              setCurrentView('read-along');
            }
          }}
          bookId={selectedBookId}
          isFavorited={readToMeBook ? isFavorited(readToMeBook.id, 'readToMe') : false}
          onToggleFavorite={() => readToMeBook && toggleFavorite(readToMeBook, 'readToMe')}
        />
      );
    }
  }

  if (currentView === 'voice-coaching') {
    // Go straight to the practice interface — use first available Voice Coach PDF if any
    const firstVoiceCoachPdf = uploadedPdfBooks.find(pdf => pdf.mediaType === 'Voice Coach');
    return (
      <VoiceCoachPracticeInterface
        onBack={() => {
          setCurrentView('dashboard');
          navigation.setMediaType('books');
        }}
        bookId={firstVoiceCoachPdf?.id || 'voice-coach-default'}
        pdfBook={firstVoiceCoachPdf}
        isFavorited={firstVoiceCoachPdf ? isFavorited(firstVoiceCoachPdf.id, 'voiceCoach') : false}
        onToggleFavorite={() => firstVoiceCoachPdf && toggleFavorite(firstVoiceCoachPdf, 'voiceCoach')}
        onProgressUpdate={handleProgressUpdate}
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

  if (currentView === 'shuspot-reader' && selectedSupabaseBook) {
    return (
      <ShuSpotImageReaderWrapper
        book={selectedSupabaseBook}
        initialPage={initialPage}
        onBack={() => {
          setCurrentView('dashboard');
          setSelectedSupabaseBook(null);
          setSelectedBookId(null);
          setInitialPage(undefined);
        }}
        onBookmarkPage={(pageNumber) => {
          console.log('Bookmarked page:', pageNumber);
          // Progress is now automatically tracked by the wrapper
        }}
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

  if (currentView === 'audiobook' && selectedSupabaseBook) {
    return (
      <AudiobookPlayer
        book={selectedSupabaseBook}
        onBack={() => {
          setCurrentView('dashboard');
          setSelectedSupabaseBook(null);
        }}
        isFavorited={isFavorited(selectedSupabaseBook.id, 'audiobooks')}
        onToggleFavorite={() => toggleFavorite(selectedSupabaseBook, 'audiobooks')}
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

  if (currentView === 'my-library') {
    return (
      <div className="min-h-screen bg-white">
        <TrialStatusBanner />
        {/* Header with transparency */}
        <div className="relative z-10 bg-white/80 backdrop-blur-md shadow-sm">
          <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
            <div className="flex items-center justify-between">
              {/* App Logo - Click to go back */}
              <div className="flex items-center cursor-pointer" onClick={() => setCurrentView('dashboard')}>
                <img
                  src={appLogo}
                  alt="App Logo"
                  className="h-8 sm:h-10 md:h-12 object-contain"
                />
              </div>

              {/* Search Bar - Hidden on mobile */}
              <div className="hidden md:flex flex-1 max-w-2xl mx-8 items-center space-x-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder={t('header.search.placeholder')}
                    value={bookFilters.searchQuery}
                    onChange={(e) => updateFilters({ searchQuery: e.target.value })}
                    className="w-full px-4 py-2 bg-white/90 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
                  />
                  <button className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Settings className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                
                {/* Language Switch next to search bar */}
                <LanguageSwitch className="flex" />
              </div>

              {/* User Profile Section - Responsive */}
              <div className="flex items-center space-x-2 sm:space-x-3">
                {/* My Library Button - Epic Style */}
                <button 
                  onClick={handleMyLibrary}
                  className="hidden md:flex flex-col items-center px-3 py-2 text-[#a2cfd2] bg-gray-50 rounded-lg transition-colors min-w-[80px]"
                >
                  <Heart className="w-10 h-10 mb-1 fill-[#FF69B4]" fill="currentColor" />
                  <span className="text-sm font-bold">My Library</span>
                </button>
                
                {/* My Buddy Button - HIDDEN */}
                {/* 
                <button 
                  onClick={() => {}}
                  className="hidden md:flex flex-col items-center px-3 py-2 text-gray-600 hover:text-[#a2cfd2] hover:bg-gray-50 rounded-lg transition-colors min-w-[80px]"
                >
                  <img src={shuDogIcon} alt="My Buddy" className="w-10 h-10 mb-1 object-contain" />
                  <span className="text-sm font-bold">My Buddy</span>
                </button>
                */}
                
                <button
                  onClick={handleUserPortal}
                  className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-pink-400 via-purple-400 to-blue-400 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer"
                >
                  <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl">{currentUser?.avatar || '🐶'}</span>
                </button>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button
                      onClick={handleUserPortal}
                      className="text-sm sm:text-base md:text-lg lg:text-xl font-superclarendon-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent hover:from-pink-600 hover:via-purple-600 hover:to-blue-600 transition-all duration-300 transform hover:scale-105"
                    >
                      <span className="hidden sm:inline">{t('header.hello')} {currentUser?.name?.split(' ')[0] || 'User'}!</span>
                      <span className="sm:hidden">{currentUser?.name?.split(' ')[0] || 'User'}</span>
                      <span className="hidden sm:inline"> 🌟</span>
                    </button>
                  </div>
                  {currentUser?.readingLevelSystem && (
                    <div className="text-xs sm:text-sm text-gray-600 bg-white/80 backdrop-blur-sm rounded-md px-1.5 sm:px-2 py-0.5 sm:py-1 shadow-sm border border-white/30 mt-0.5">
                      <span className="hidden sm:inline">Reading Level: </span>
                      <span className="font-bold text-blue-700">{currentUser.readingLevelSystem}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <MyLibraryPage
          onBack={() => setCurrentView('dashboard')}
          userName={currentUser?.name?.split(' ')[0] || 'User'}
        />
      </div>
    );
  }

  // My Buddy view - HIDDEN
  // if (currentView === 'my-buddy') { ... }

  return (
    <div className="min-h-screen bg-white">
      <TrialStatusBanner />
      {/* Header with transparency */}
      <div className="relative z-10 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="px-3 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
          <div className="flex items-center justify-between">
            {/* App Logo - Click to reset to All Books view */}
            <div className="flex items-center cursor-pointer" onClick={() => {
              console.log('Logo clicked - resetting to All Book view');
              setSelectedContentType('All Book');
            }}>
              <img
                src={appLogo}
                alt="App Logo"
                className="h-8 sm:h-10 md:h-12 object-contain"
              />
            </div>

            {/* Search Bar - Hidden on mobile */}
            <div className="hidden md:flex flex-1 max-w-2xl mx-8 items-center space-x-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder={t('header.search.placeholder')}
                  value={bookFilters.searchQuery}
                  onChange={(e) => updateFilters({ searchQuery: e.target.value })}
                  className="w-full px-4 py-2 bg-white/90 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
                />
                <button className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Settings className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              
              {/* Language Switch next to search bar */}
              <LanguageSwitch className="flex" />
            </div>

            {/* User Profile Section - Responsive */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Language Switch - Show on desktop and mobile */}
              <div className="flex md:hidden">
                <LanguageSwitchMobile />
              </div>
              
              {/* My Library Button - Show on desktop and mobile */}
              <button 
                onClick={handleMyLibrary}
                className="flex flex-col items-center px-2 sm:px-3 py-2 text-gray-600 hover:text-[#a2cfd2] hover:bg-gray-50 rounded-lg transition-colors min-w-[70px] sm:min-w-[80px]"
              >
                <Heart className="w-8 h-8 sm:w-10 sm:h-10 mb-1 fill-[#FF69B4]" fill="currentColor" />
                <span className="text-xs sm:text-sm font-bold">My Library</span>
              </button>
              
              {/* My Buddy Button - HIDDEN */}
              {/* 
              <button 
                onClick={() => {}}
                className="hidden md:flex flex-col items-center px-3 py-2 text-gray-600 hover:text-[#a2cfd2] hover:bg-gray-50 rounded-lg transition-colors min-w-[80px]"
              >
                <img src={shuDogIcon} alt="My Buddy" className="w-10 h-10 mb-1 object-contain" />
                <span className="text-sm font-bold">My Buddy</span>
              </button>
              */}
              
              <button
                onClick={handleUserPortal}
                className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-pink-400 via-purple-400 to-blue-400 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer"
              >
                <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl">{currentUser?.avatar || '🐶'}</span>
              </button>
              <div className="flex flex-col">
                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={handleUserPortal}
                    className="text-sm sm:text-base md:text-lg lg:text-xl font-superclarendon-bold bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent hover:from-pink-600 hover:via-purple-600 hover:to-blue-600 transition-all duration-300 transform hover:scale-105"
                  >
                    <span className="hidden sm:inline">{t('header.hello')} {currentUser?.name?.split(' ')[0] || 'User'}!</span>
                    <span className="sm:hidden">{currentUser?.name?.split(' ')[0] || 'User'}</span>
                    <span className="hidden sm:inline"> 🌟</span>
                  </button>
                  {currentUser?.email === 'ethan@shivasounds.com' && (
                    <button
                      onClick={() => {
                        console.log('Toggling admin panel:', !showAdminPanel);
                        setShowAdminPanel(!showAdminPanel);
                      }}
                      className="p-1 sm:p-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 transition-all shadow-md hover:shadow-lg transform hover:scale-105"
                      title={showAdminPanel ? "Hide Admin Panel" : "Show Admin Panel"}
                    >
                      <Settings className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </button>
                  )}
                </div>
                {currentUser?.readingLevelSystem && (
                  <div className="text-xs sm:text-sm text-gray-600 bg-white/80 backdrop-blur-sm rounded-md px-1.5 sm:px-2 py-0.5 sm:py-1 shadow-sm border border-white/30 mt-0.5">
                    <span className="hidden sm:inline">Reading Level: </span>
                    <span className="font-bold text-blue-700">{currentUser.readingLevelSystem}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Mobile Search Bar */}
          <div className="md:hidden mt-2">
            <div className="relative">
              <input
                type="text"
                placeholder={t('header.search.mobile.placeholder')}
                value={bookFilters.searchQuery}
                onChange={(e) => updateFilters({ searchQuery: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white/90 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm"
              />
              <button className="absolute right-2 top-1/2 transform -translate-y-1/2">
                <Settings className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Three-Tier Navigation - Streamlined Filtering (hidden for Video Books) */}
      {selectedContentType !== 'Video Books' && (
        <NewThreeTierNavigation />
      )}

      <main className="relative z-10 px-4 sm:px-6 py-4 sm:py-8">
        {/* Admin Upload Panel */}
        {showAdminPanel && <AdminUpload />}
        
        {/* Remove the container box - make content full width */}


            {/* Old circular content type buttons removed - now using three-tier navigation */}

        {/* Video Discovery Section - Show when Video Books is selected */}
        {selectedContentType === 'Video Books' && (
          <VideoDiscoveryApp />
        )}

        {/* Main content - Hidden when Video Books is selected */}
        {selectedContentType !== 'Video Books' && (
          <>

            {/* Continue Reading Section - Supabase Books */}
            {selectedContentType !== 'Video Books' && (
            <ContinueReadingSection
              bookType={
                selectedContentType === 'Read to Me' ? 'read-to-me' :
                selectedContentType === 'Voice Coach' ? 'voice-coach' :
                selectedContentType === 'Books' ? 'books' :
                selectedContentType === 'Video Books' ? 'videos' :
                selectedContentType === 'Audiobooks' ? 'audiobooks' :
                'all'
              }
              onBookClick={async (bookId, currentPage) => {
                console.log('📖 Continue reading Supabase book:', bookId, 'at page:', currentPage);
                
                // Fetch the full book data from Supabase
                const { data: bookData, error } = await supabase
                  .from('books')
                  .select('*')
                  .eq('id', bookId)
                  .single();

                if (error) {
                  console.error('Error fetching book:', error);
                  return;
                }

                if (bookData) {
                  // Transform the raw Supabase data to UI format
                  const transformedBook = mapSupabaseBookToUI(bookData);
                  setSelectedSupabaseBook(transformedBook);
                  setSelectedBookId(bookId);
                  setInitialPage(currentPage);
                  setCurrentView('shuspot-reader');
                }
              }}
              className="mb-12"
            />
            )}



            {/* All Books - Categorized Sections */}
            {selectedContentType === 'All Book' && (
              <div className="space-y-12">
                {/* Books Section */}
                {!isMediaTypeBlocked('books') && (filteredBooks.filter(book => book.category === 'books').length > 0 || uploadedPdfBooks.filter(pdf => pdf.mediaType === 'Books').length > 0) && (
                  <div className="mb-12">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <Book className="w-6 h-6" style={{ color: '#e2d051' }} />
                        <h3 className="font-superclarendon-bold font-bold text-black" style={{ fontSize: '1.3rem' }}>{t('media.books')}</h3>
                      </div>
                    </div>
                    <EpicNavigationWrapper scrollContainerId="books-carousel">
                      <div 
                        id="books-carousel"
                        className="overflow-x-auto epic-scroll-container"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                      >
                        <div className="flex gap-6 pb-4">
                          {(uploadedPdfBooks.filter(pdf => pdf.mediaType === 'Books').length > 0 ? uploadedPdfBooks.filter(pdf => pdf.mediaType === 'Books') : filteredBooks.filter(book => book.category === 'books')).map((book) => (
                            <div key={`books-${book.id}`} className="flex-shrink-0 w-36 sm:w-40 md:w-44 lg:w-48 xl:w-52">
                              <BookCardWithHover
                                book={book}
                                onClick={() => handleBookSelect(book)}
                                onToggleFavorite={() => toggleFavorite(book, 'books')}
                                isFavorited={isFavorited(book.id, 'books')}
                                category="books"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </EpicNavigationWrapper>
                  </div>
                )}

                {/* Video Books Section */}
                {!isMediaTypeBlocked('video-books') && !isMediaTypeBlocked('videos') && (
                <div className="mb-12">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <Video className="w-6 h-6" style={{ color: '#e2d051' }} />
                      <h3 className="font-superclarendon-bold font-bold text-black" style={{ fontSize: '1.3rem' }}>{t('library.videos')}</h3>
                    </div>
                  </div>
                  <EpicNavigationWrapper scrollContainerId="videos-carousel">
                    <div 
                      id="videos-carousel"
                      className="overflow-x-auto epic-scroll-container"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                      <div className="flex gap-6 pb-4">
                        {/* Show recent videos from Supabase */}
                        {!recentVideosLoading && recentVideos.length > 0 && recentVideos.map((video) => (
                          <div 
                            key={`recent-video-${video.id}`} 
                            className="flex-shrink-0 w-56 sm:w-60 md:w-64 lg:w-72 xl:w-80 cursor-pointer group"
                            onClick={() => {
                              // Store the selected video ID and navigate to Video Books section
                              sessionStorage.setItem('autoPlayVideoId', video.id);
                              setSelectedContentType('Video Books');
                            }}
                          >
                            <div className="relative aspect-video bg-black rounded-lg mb-3 overflow-hidden group-hover:shadow-lg group-hover:scale-105 transition-all duration-300">
                              <img
                                src={video.thumbnail_url}
                                alt={video.title}
                                className="w-full h-full object-cover"
                              />
                              {/* Play Button Overlay */}
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                  <div className="w-0 h-0 border-l-[16px] border-l-black border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent ml-1" />
                                </div>
                              </div>
                              {/* Duration Badge */}
                              {video.duration && (
                                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                                  {Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, '0')}
                                </div>
                              )}
                              {/* AR Level Badge */}
                              {video.ar_level !== undefined && video.ar_level !== null && (
                                <div className="absolute top-2 left-2 bg-[#24BFE6] text-white text-xs font-bold px-2 py-1 rounded">
                                  AR {video.ar_level.toFixed(1)}
                                </div>
                              )}
                            </div>
                            <div className="text-sm font-superclarendon-bold text-purple-700 text-center mt-2 leading-tight line-clamp-2">
                              {video.title}
                            </div>
                            {/* Genre Tags */}
                            {(video.genre_1 || video.genre_2) && (
                              <div className="flex flex-wrap gap-1 justify-center mt-1">
                                {video.genre_1 && (
                                  <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded">
                                    {video.genre_1}
                                  </span>
                                )}
                                {video.genre_2 && (
                                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">
                                    {video.genre_2}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                        
                        {/* Show uploaded videos with "Video Books" or "Videos" media type */}
                        {uploadedVideoBooks.filter(video => video.mediaType === 'Video Books' || video.mediaType === 'Videos').map((videoBook) => (
                          <div key={`video-uploaded-${videoBook.id}`} className="flex-shrink-0 w-36 sm:w-40 md:w-44 lg:w-48 xl:w-52">
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
                        {uploadedPdfBooks.filter(pdf => pdf.mediaType === 'Video Books' || pdf.mediaType === 'Videos').map((pdfBook) => (
                          <div key={`video-pdf-${pdfBook.id}`} className="flex-shrink-0 w-36 sm:w-40 md:w-44 lg:w-48 xl:w-52">
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
                      </div>
                    </div>
                  </EpicNavigationWrapper>
                </div>
                )}

                {/* Voice Coach Books Section - Hide when Voice Coach is specifically selected */}
                {!isMediaTypeBlocked('coach') && !isMediaTypeBlocked('ai-voice') && selectedContentType !== 'Voice Coach' && (
                  <div className="mb-12">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <Mic className="w-6 h-6" style={{ color: '#e2d051' }} />
                        <h3 className="font-superclarendon-bold font-bold text-black" style={{ fontSize: '1.3rem' }}>{t('media.voice.coach')} {t('media.books')}</h3>
                      </div>
                    </div>
                    <EpicNavigationWrapper scrollContainerId="voice-coach-carousel">
                      <div 
                        id="voice-coach-carousel"
                        className="overflow-x-auto epic-scroll-container"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                      >
                        <div className="flex gap-6 pb-4">
                          {/* Show uploaded PDFs with "Voice Coach" media type first */}
                          {uploadedPdfBooks.filter(pdf => pdf.mediaType === 'Voice Coach').map((pdfBook) => (
                            <div key={`voice-pdf-${pdfBook.id}`} className="flex-shrink-0 w-36 sm:w-40 md:w-44 lg:w-48 xl:w-52">
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
                          {voiceCoachBooks.map((book) => (
                            <div key={`voice-${book.id}`} className="flex-shrink-0 w-36 sm:w-40 md:w-44 lg:w-48 xl:w-52">
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
                    </EpicNavigationWrapper>
                  </div>
                )}

                {/* Read to Me Books Section */}
                {!isMediaTypeBlocked('read-to-me') && (readToMeBooks.length > 0 || uploadedPdfBooks.filter(pdf => pdf.mediaType === 'Read to me').length > 0 || supabaseReadToMeBooks.length > 0) && (
                  <div className="mb-12">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <BookOpen className="w-6 h-6" style={{ color: '#e2d051' }} />
                        <h3 className="font-superclarendon-bold font-bold text-black" style={{ fontSize: '1.3rem' }}>{t('media.read.to.me')}</h3>
                      </div>
                    </div>
                    <EpicNavigationWrapper scrollContainerId="read-to-me-carousel">
                      <div 
                        id="read-to-me-carousel"
                        className="overflow-x-auto epic-scroll-container"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                      >
                        <div className="flex gap-6 pb-4">
                          {/* Show Supabase Read to Me books first */}
                          {supabaseReadToMeBooks.map((book) => (
                            <div key={`readtome-supabase-${book.id}`} className="flex-shrink-0 w-36 sm:w-40 md:w-44 lg:w-48 xl:w-52">
                              <BookCardWithHover
                                book={book}
                                onClick={() => {
                                  setSelectedBookId(book.id);
                                  setCurrentView('read-to-me-book');
                                }}
                                onToggleFavorite={() => toggleFavorite(book, 'readToMe')}
                                isFavorited={isFavorited(book.id, 'readToMe')}
                                category="readToMe"
                              />
                            </div>
                          ))}
                          {/* Show uploaded PDFs with "Read to me" media type */}
                          {uploadedPdfBooks.filter(pdf => pdf.mediaType === 'Read to me').map((pdfBook) => (
                            <div key={`readtome-pdf-${pdfBook.id}`} className="flex-shrink-0 w-36 sm:w-40 md:w-44 lg:w-48 xl:w-52">
                              <BookCardWithHover
                                book={pdfBook}
                                onClick={() => handlePdfReadAlongSelect(pdfBook)}
                                onToggleFavorite={() => toggleFavorite(pdfBook, 'readToMe')}
                                isFavorited={isFavorited(pdfBook.id, 'readToMe')}
                                category="Read to Me"
                                showProgress={true}
                              />
                            </div>
                          ))}
                          {/* Removed duplicate readToMeBooks - already showing supabaseReadToMeBooks above */}
                        </div>
                      </div>
                    </EpicNavigationWrapper>
                  </div>
                )}

                {/* Audiobooks Section */}
                {!isMediaTypeBlocked('audiobooks') && (
                <div className="mb-12">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <Volume2 className="w-6 h-6" style={{ color: '#e2d051' }} />
                      <h3 className="font-superclarendon-bold font-bold text-black" style={{ fontSize: '1.3rem' }}>{t('media.audiobooks')}</h3>
                    </div>
                  </div>
                  <EpicNavigationWrapper scrollContainerId="audiobooks-carousel">
                    <div 
                      id="audiobooks-carousel"
                      className="overflow-x-auto epic-scroll-container"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                      <div className="flex gap-6 pb-4">
                        {/* Show Supabase audiobooks */}
                        {supabaseAudiobooks.map((book) => (
                          <div key={`audiobook-supabase-${book.id}`} className="flex-shrink-0 w-36 sm:w-40 md:w-44 lg:w-48 xl:w-52">
                            <BookCardWithHover
                              book={book}
                              onClick={() => {
                                setSelectedSupabaseBook(book);
                                setCurrentView('audiobook');
                              }}
                              onToggleFavorite={() => toggleFavorite(book, 'audiobooks')}
                              isFavorited={isFavorited(book.id, 'audiobooks')}
                              category="Audiobook"
                            />
                          </div>
                        ))}
                        {/* Show uploaded PDFs with "Audiobooks" media type */}
                        {uploadedPdfBooks.filter(pdf => pdf.mediaType === 'Audiobooks').map((pdfBook) => (
                          <div key={`audiobook-pdf-${pdfBook.id}`} className="flex-shrink-0 w-36 sm:w-40 md:w-44 lg:w-48 xl:w-52">
                            <BookCardWithHover
                              book={pdfBook}
                              onClick={() => handlePdfBookSelect(pdfBook)}
                              onToggleFavorite={() => toggleFavorite(pdfBook, 'audiobooks')}
                              isFavorited={isFavorited(pdfBook.id, 'audiobooks')}
                              category="Audiobook"
                              showProgress={true}
                            />
                          </div>
                        ))}
                        {/* Show placeholder if no audiobooks */}
                        {supabaseAudiobooks.length === 0 && uploadedPdfBooks.filter(pdf => pdf.mediaType === 'Audiobooks').length === 0 && (
                          <div className="flex-shrink-0 w-48">
                            <div className="text-center text-gray-500 p-8">
                              <p>No audiobooks yet</p>
                              <p className="text-sm mt-2">Upload audiobooks to get started</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </EpicNavigationWrapper>
                </div>
                )}
              </div>
            )}

            {/* Read to Me Section - Show when Read to Me is selected */}
            {selectedContentType === 'Read to Me' && (
              <div className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <BookOpen className="w-6 h-6" style={{ color: '#e2d051' }} />
                    <h3 className="font-superclarendon-bold font-bold text-black" style={{ fontSize: '1.3rem' }}>{t('media.read.to.me')} {t('library.stories')}</h3>
                  </div>
                </div>
                <EpicNavigationWrapper scrollContainerId="read-to-me-main-carousel">
                  <div 
                    id="read-to-me-main-carousel"
                    className="overflow-x-auto epic-scroll-container"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    <div className="flex gap-6 pb-4">
                      {/* Show Supabase Read to Me books */}
                      {supabaseReadToMeBooks.map((book) => (
                        <div key={`readtome-main-${book.id}`} className="flex-shrink-0 w-36 sm:w-40 md:w-44 lg:w-48 xl:w-52">
                          <BookCardWithHover
                            book={book}
                            onClick={() => {
                              setSelectedBookId(book.id);
                              setCurrentView('read-to-me-book');
                            }}
                            onToggleFavorite={() => toggleFavorite(book, 'readToMe')}
                            isFavorited={isFavorited(book.id, 'readToMe')}
                            category="readToMe"
                          />
                        </div>
                      ))}
                      {/* Show uploaded PDFs with "Read to me" media type */}
                      {uploadedPdfBooks.filter(pdf => pdf.mediaType === 'Read to me').map((pdfBook) => (
                        <div key={`readtome-main-pdf-${pdfBook.id}`} className="flex-shrink-0 w-36 sm:w-40 md:w-44 lg:w-48 xl:w-52">
                          <BookCardWithHover
                            book={pdfBook}
                            onClick={() => handlePdfReadAlongSelect(pdfBook)}
                            onToggleFavorite={() => toggleFavorite(pdfBook, 'readToMe')}
                            isFavorited={isFavorited(pdfBook.id, 'readToMe')}
                            category="Read to Me"
                            showProgress={true}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </EpicNavigationWrapper>
              </div>
            )}

            {/* Filtered Books Section - Only show when NOT All Books, Read to Me or Voice Coach */}
            {selectedContentType !== 'All Book' && selectedContentType !== 'Read to Me' && selectedContentType !== 'Voice Coach' && (
              <div className="mb-12">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-light text-blue-800" style={{ fontSize: '1.3rem' }}>
                    {bookFilters.genre !== 'All' || bookFilters.readingLevel !== 'All' || bookFilters.searchQuery
                      ? t('library.filtered.books', 'Filtered Books')
                      : t('library.featured.books', 'Featured Books')
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
                  <div className="flex space-x-4 md:space-x-6 overflow-x-auto pb-4 scrollbar-hide"
                       style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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
                        className="flex-shrink-0 w-36 sm:w-40 md:w-44 lg:w-48 xl:w-52 cursor-pointer group"
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
                  <h3 className="font-light text-purple-800 mb-6" style={{ fontSize: '1.3rem' }}>{t('media.read.to.me')} {t('library.stories')}</h3>
                  <div className="flex space-x-4 md:space-x-6 overflow-x-auto pb-4 scrollbar-hide"
                       style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {readToMeBooks.map((book) => (
                      <BookCardWithHover
                        key={book.id}
                        className="flex-shrink-0 w-36 sm:w-40 md:w-44 lg:w-48 xl:w-52"
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
                    <h3 className="font-light text-purple-800 mb-6" style={{ fontSize: '1.3rem' }}>{t('media.books')}</h3>
                    <div className="flex space-x-4 md:space-x-6 overflow-x-auto pb-4 scrollbar-hide"
                         style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                      {uploadedPdfBooks.filter(pdf => pdf.mediaType === 'Read to me').map((pdfBook) => (
                        <BookCardWithHover
                          key={pdfBook.id}
                          className="flex-shrink-0 w-36 sm:w-40 md:w-44 lg:w-48 xl:w-52"
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
                  <h3 className="font-light text-green-800 mb-6" style={{ fontSize: '1.3rem' }}>{t('media.voice.coach')} {t('mode.practice')}</h3>
                  {/* Debug info */}
                  {console.log('🎯 Voice Coach section - Total uploaded PDFs:', uploadedPdfBooks.length)}
                  {console.log('🎯 Voice Coach PDFs:', uploadedPdfBooks.filter(pdf => pdf.mediaType === 'Voice Coach'))}
                  <div className="flex space-x-4 md:space-x-6 overflow-x-auto pb-4 scrollbar-hide"
                       style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
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
          </>
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <SubscriptionProvider>
        <AdminProvider>
          <UserStatsProvider>
            <ParentalControlsProvider>
              <NavigationProvider>
                <AppContent />
              </NavigationProvider>
            </ParentalControlsProvider>
          </UserStatsProvider>
        </AdminProvider>
      </SubscriptionProvider>
    </LanguageProvider>
  );
}

export default App;