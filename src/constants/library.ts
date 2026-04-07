import { MediaTypeOption, GradeLevel } from '../types/library';
import bookBooksIcon from '../assets/8529901-removebg-preview.png';
import bookReadIcon from '../assets/language-book-3d-icon-education-literature_431668-1675-removebg-preview.png';
import bookVoiceIcon from '../assets/audiobook-3d-icon-download-in-png-blend-fbx-gltf-file-formats--desk-science-highlighter-library-pack-school-education-icons-11333837-removebg-preview.png';
import bookMicIcon from '../assets/voice-record-3d-icon-download-in-png-blend-fbx-gltf-file-formats--message-chat-essential-pack-user-interface-icons-5576210-removebg-preview.png';
import bookAllIcon from '../assets/video-education-3d-icon-download-in-png-blend-fbx-gltf-file-formats--online-learning-digital-pack-school-icons-7285452-removebg-preview.png';
import coachIcon from '../assets/video-education-3d-icon-download-in-png-blend-fbx-gltf-file-formats--online-learning-digital-pack-school-icons-7285452-removebg-preview.png';
import downloadsIcon from '../assets/downloads-icon.svg';
import videosIcon from '../assets/videos-icon.svg';
import comicsIcon from '../assets/comics-icon.svg';

// Grade levels for Tier 1
export const GRADE_LEVELS: GradeLevel[] = [
  { id: 'k', label: 'K', value: 'K' },
  { id: '1', label: '1', value: '1' },
  { id: '2', label: '2', value: '2' },
  { id: '3', label: '3', value: '3' },
  { id: '4', label: '4', value: '4' },
  { id: '5', label: '5', value: '5' },
  { id: '6', label: '6', value: '6' }
];

// Media types for Tier 2
export const MEDIA_TYPES: MediaTypeOption[] = [
  {
    id: 'books',
    name: 'Books',
    icon: bookBooksIcon,
    description: 'Read books at your own pace'
  },
  {
    id: 'read-to-me',
    name: 'Read to Me',
    icon: bookReadIcon,
    description: 'Listen to narrated stories'
  },
  {
    id: 'audiobooks',
    name: 'Audiobooks',
    icon: bookVoiceIcon,
    description: 'Audio-only book experiences'
  },
  {
    id: 'video-books',
    name: 'Video Books',
    icon: bookAllIcon,
    description: 'Books with video narration'
  },
  {
    id: 'videos',
    name: 'Videos',
    icon: videosIcon,
    description: 'Educational video content'
  },
  {
    id: 'comics',
    name: 'Comics',
    icon: comicsIcon,
    description: 'Graphic novels and comics'
  },
  {
    id: 'ai-voice',
    name: 'AI Voice',
    icon: bookMicIcon,
    description: 'AI-powered voice reading assistance'
  },
  {
    id: 'coach',
    name: 'Coach',
    icon: coachIcon,
    description: 'Reading coach and practice sessions'
  },
  {
    id: 'downloads',
    name: 'Downloads',
    icon: downloadsIcon,
    description: 'Downloadable resources and worksheets'
  }
];

// Reading systems
export const READING_SYSTEMS = [
  {
    id: 'Grade',
    name: 'US Grade Level',
    description: 'Standard K-6 grade levels'
  },
  {
    id: 'RAZ',
    name: 'Reading A-Z',
    description: 'Leveled reading system (A-Z)'
  },
  {
    id: 'Lexile',
    name: 'Lexile Framework',
    description: 'Lexile measure (e.g., 500L)'
  }
];

// Fiction types for settings
export const FICTION_TYPES = [
  { id: 'all', name: 'All Types' },
  { id: 'fiction', name: 'Fiction Only' },
  { id: 'non-fiction', name: 'Non-Fiction Only' }
];

// Default navigation state
export const DEFAULT_NAVIGATION = {
  grade: '1',
  mediaType: 'books' as const,
  genre: 'All',
  readingSystem: 'Grade' as const
};

// Media types that don't show genre tier
export const MEDIA_TYPES_WITHOUT_GENRES = ['videos', 'downloads', 'coach'];

// Scroll behavior constants
export const SCROLL_THRESHOLD = 100; // px to scroll before hiding navigation
export const SCROLL_DEBOUNCE = 100; // ms to debounce scroll events

// Banner constants
export const BANNER_AUTO_ROTATE_INTERVAL = 5000; // ms
export const BANNER_TRANSITION_DURATION = 500; // ms

// Search constants
export const SEARCH_DEBOUNCE = 300; // ms

// Infinite scroll constants
export const BOOKS_PER_PAGE = 24;
export const GENRES_PER_PAGE = 10;
export const SCROLL_LOAD_THRESHOLD = 100; // px from bottom to trigger load

// API endpoints (relative to Supabase)
export const API_ENDPOINTS = {
  BOOKS: '/rest/v1/books',
  GENRES: '/rest/v1/genres',
  SEARCH: '/rest/v1/rpc/search_content',
  USER_PROFILE: '/rest/v1/user_profiles'
};

// Z-index layers
export const Z_INDEX = {
  HEADER: 1000,
  NAVIGATION: 900,
  MODAL_BACKDROP: 1100,
  MODAL: 1200,
  DROPDOWN: 1050
};

// Breakpoints (matches Tailwind defaults)
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536
};

// Animation durations
export const ANIMATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500
};

// Touch gesture thresholds
export const TOUCH = {
  SWIPE_THRESHOLD: 50, // px
  SWIPE_VELOCITY: 0.3 // px/ms
};
