import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, File, Image, FileText, Check, AlertCircle, Trash2, Edit3, Search, Filter, Plus } from 'lucide-react';
import { pdfjs } from 'react-pdf';

// Unique ID generator to prevent duplicate keys
let idCounter = 0;
const generateUniqueId = () => {
  idCounter += 1;
  // Use performance.now() for higher precision and add process ID simulation
  const timestamp = performance.now();
  const random = Math.random().toString(36).substr(2, 12);
  return `file_${timestamp}_${idCounter}_${random}`;
};

// Configure PDF.js worker - use version that matches react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@5.3.31/build/pdf.worker.min.mjs';


interface PdfBookData {
  id: string;
  title: string;
  author: string;
  cover: string; // Data URL of first page
  pdfUrl: string; // Object URL of PDF file
  gradeLevel: string;
  mediaType: string;
  genre: string;
  totalPages: number;
  file: File;
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

interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  gradeLevel: string;
  mediaType: string;
  genre: string;
  error?: string;
}

interface FileUploadDashboardProps {
  onBack: () => void;
  onPdfUploadSuccess?: (pdfBook: PdfBookData) => void;
  onVideoUploadSuccess?: (videoBook: VideoBookData) => void;
  existingPdfBooks?: PdfBookData[];
}

const GRADE_LEVELS = [
  'Pre-K', 'K1', 'K2', '1A', '1B', '2A', '2B', '3A', '3B', 
  '4A', '4B', '5A', '5B', '6A', '6B'
];

const MEDIA_TYPES = [
  'Books', 'Read to me', 'Audiobooks', 'Video Books', 
  'Videos', 'Voice Coach', 'Grammar Downloads'
];

const GENRES = [
  // Science & Nature
  'Animals & Their Habitats',
  'Plants & Their Environments',
  'Weather',
  'Space',
  'Five Senses',
  
  // Animals
  'Backyard Animals',
  'Baby Animals',
  'Sharks',
  'Big Cats',
  'Birds',
  'Snakes',
  'Bugs',
  'Cats',
  'Dinosaurs',
  'Dogs',
  'Fish',
  'Pets',
  'Horses',
  'Unicorns',
  
  // Creative Arts
  'Art',
  'Music',
  'Makerspace',
  
  // Health & Wellness
  'Bodies in Motion',
  'Healthy Habits',
  'Mindfulness',
  
  // Sports & Activities
  'Soccer',
  'Sports',
  
  // Seasons & Holidays
  'Winter',
  'Spring',
  
  // Fantasy & Imagination
  'Princesses',
  'Fairy Tales',
  'Mythical Creatures',
  'Superheroes',
  'Comic Books',
  
  // Math & Learning
  'Money',
  'Telling Time',
  'Addition & Subtraction',
  'Counting',
  'Measuring',
  'Shapes, Colors, Letters & Numbers',
  
  // History & Social Studies
  'American Symbols',
  'Biography',
  'Black History Month',
  'Economics: Goods & Services',
  'Explore Our Past & Present',
  'History',
  'Native Americans',
  'Our Neighborhood',
  "Women's History Month",
  
  // Transportation
  'Adventure',
  'Airplanes',
  'Boats & Ships',
  'Cars & Trucks',
  'Cars, Trucks & Trains',
  'Trains',
  
  // Social & Emotional Learning
  'Bravery',
  'Bullying',
  'Exploring My World',
  'Families',
  'Friendship',
  'Grief & Loss',
  'Growth Mindset',
  'Identifying Emotions',
  'Jobs Around Town',
  'Kindness',
  'Laugh Out Loud',
  'Learning to Read',
  'Narrative Nonfiction'
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf', 'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];

export default function FileUploadDashboard({ onBack, onPdfUploadSuccess, onVideoUploadSuccess, existingPdfBooks = [] }: FileUploadDashboardProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('');
  const [selectedMediaType, setSelectedMediaType] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [genreSearch, setGenreSearch] = useState('');
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredGenres = GENRES.filter(genre => 
    genre.toLowerCase().includes(genreSearch.toLowerCase())
  );

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const processVideoFile = async (file: File): Promise<VideoBookData | null> => {
    try {
      // Create object URL for the video file
      const videoUrl = URL.createObjectURL(file);
      
      // Create video element to get metadata and thumbnail
      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      
      return new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          // Create canvas for thumbnail
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          
          if (!context) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          // Set canvas size (16:9 aspect ratio for thumbnail)
          canvas.width = 400;
          canvas.height = 225;
          
          // Seek to 10% of video duration for thumbnail
          video.currentTime = video.duration * 0.1;
          
          video.onseeked = () => {
            // Draw video frame to canvas
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Convert canvas to data URL for thumbnail
            const thumbnailDataUrl = canvas.toDataURL('image/png');
            
            // Extract title from filename (remove extension)
            const title = file.name.replace(/\.(mp4|mov|avi|mkv)$/i, '');
            
            // Create video book data
            const videoBookData: VideoBookData = {
              id: generateUniqueId(),
              title: title,
              author: 'Unknown Author',
              cover: thumbnailDataUrl,
              videoUrl: videoUrl,
              gradeLevel: selectedGradeLevel,
              mediaType: selectedMediaType,
              genre: selectedGenre,
              duration: Math.round(video.duration),
              file: file
            };
            
            resolve(videoBookData);
          };
          
          video.onerror = () => {
            reject(new Error('Failed to seek video for thumbnail'));
          };
        };
        
        video.onerror = () => {
          reject(new Error('Failed to load video metadata'));
        };
      });
    } catch (error) {
      console.error('Error processing video:', error);
      showNotification('error', `Failed to process video: ${file.name}`);
      return null;
    }
  };

  // Check for duplicate PDFs based on title, author, and file size
  const checkForDuplicatePdf = (file: File, title: string): { isDuplicate: boolean; existingBook?: any } => {
    const cleanTitle = title.toLowerCase().trim();
    const fileSize = file.size;
    
    // Check against existing uploaded PDFs
    for (const existingPdf of existingPdfBooks) {
      const existingTitle = existingPdf.title.toLowerCase().trim();
      const sizeDifference = Math.abs(existingPdf.file.size - fileSize);
      const sizeTolerance = fileSize * 0.05; // 5% tolerance for file size differences
      
      // Check if titles match (exact or very similar)
      const titleMatch = existingTitle === cleanTitle || 
                        existingTitle.includes(cleanTitle) || 
                        cleanTitle.includes(existingTitle);
      
      // Check if file sizes are very similar (within 5% tolerance)
      const sizeMatch = sizeDifference <= sizeTolerance;
      
      if (titleMatch && sizeMatch) {
        return { isDuplicate: true, existingBook: existingPdf };
      }
    }
    
    return { isDuplicate: false };
  };

  const processPdfFile = async (file: File): Promise<PdfBookData | null> => {
    try {
      console.log('Processing PDF file:', file.name, 'Size:', file.size, 'Type:', file.type);
      
      // Extract title from filename (remove .pdf extension) early for duplicate check
      const title = file.name.replace(/\.pdf$/i, '');
      
      // Check for duplicates before processing
      const duplicateCheck = checkForDuplicatePdf(file, title);
      if (duplicateCheck.isDuplicate) {
        const existingBook = duplicateCheck.existingBook;
        const errorMessage = `Duplicate PDF detected! "${title}" is already uploaded.\n\nExisting book details:\n• Title: ${existingBook.title}\n• Genre: ${existingBook.genre}\n• Reading Level: ${existingBook.gradeLevel}\n• Pages: ${existingBook.totalPages}\n\nPlease choose a different PDF to upload.`;
        
        // Show user-friendly error message
        alert(errorMessage);
        console.warn('Duplicate PDF detected:', title, 'matches existing:', existingBook.title);
        return null;
      }
      
      // Create object URL for the PDF file
      const pdfUrl = URL.createObjectURL(file);
      console.log('Created PDF URL:', pdfUrl);
      
      // Load the PDF document using react-pdf with local worker
      const pdf = await pdfjs.getDocument(pdfUrl).promise;
      console.log('PDF loaded successfully, pages:', pdf.numPages);
      
      // Get the first page for cover image
      const page = await pdf.getPage(1);
      
      // Set up canvas for rendering
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('Could not get canvas context');
      }
      
      // Calculate scale to fit a reasonable cover size (e.g., 400px width)
      const viewport = page.getViewport({ scale: 1 });
      const scale = 400 / viewport.width;
      const scaledViewport = page.getViewport({ scale });
      
      // Set canvas dimensions
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      
      // Render the page
      const renderContext = {
        canvasContext: context,
        viewport: scaledViewport,
      };
      
      await page.render(renderContext).promise;
      
      // Convert canvas to data URL for cover image
      const coverDataUrl = canvas.toDataURL('image/png');
      
      // Create PDF book data
      const pdfBookData: PdfBookData = {
        id: generateUniqueId(),
        title: title,
        author: 'Unknown Author',
        cover: coverDataUrl,
        pdfUrl: pdfUrl,
        gradeLevel: selectedGradeLevel,
        mediaType: selectedMediaType,
        genre: selectedGenre,
        totalPages: pdf.numPages,
        file: file
      };
      
      console.log('PDF processed successfully:', title);
      return pdfBookData;
    } catch (error) {
      console.error('Error processing PDF:', error);
      showNotification('error', `Failed to process PDF: ${file.name}`);
      return null;
    }
  };

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'File type not supported. Please upload PNG, JPEG, or PDF files.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size exceeds 50MB limit.';
    }
    return null;
  };

  const validateForm = (): string | null => {
    if (!selectedGradeLevel) return 'Please select a grade level.';
    if (!selectedMediaType) return 'Please select a media type.';
    if (!selectedGenre) return 'Please select a genre.';
    return null;
  };

  const createFilePreview = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        resolve(undefined);
      }
    });
  };

  const simulateUpload = (fileId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileId 
              ? { ...f, status: 'success' as const, progress: 100 }
              : f
          ));
          resolve();
        } else {
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileId 
              ? { ...f, progress: Math.min(progress, 100) }
              : f
          ));
        }
      }, 200);

      // Simulate occasional errors
      if (Math.random() < 0.1) {
        setTimeout(() => {
          clearInterval(interval);
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileId 
              ? { ...f, status: 'error' as const, error: 'Upload failed. Please try again.' }
              : f
          ));
          reject(new Error('Upload failed'));
        }, 1000);
      }
    });
  };

  const processFiles = async (files: FileList | File[]) => {
    const formError = validateForm();
    if (formError) {
      showNotification('error', formError);
      return;
    }

    const fileArray = Array.from(files);
    const newFiles: UploadedFile[] = [];

    // Check for files that are already being processed
    const existingFileNames = uploadedFiles.map(f => f.file.name);

    for (const file of fileArray) {
      // Skip if file is already being processed
      if (existingFileNames.includes(file.name)) {
        showNotification('error', `${file.name} is already being processed`);
        continue;
      }

      const error = validateFile(file);
      if (error) {
        showNotification('error', `${file.name}: ${error}`);
        continue;
      }

      // Handle video files specially
      if (file.type.startsWith('video/')) {
        const newFile: UploadedFile = {
          id: generateUniqueId(),
          file,
          preview: undefined,
          status: 'uploading',
          progress: 0,
          gradeLevel: selectedGradeLevel,
          mediaType: selectedMediaType,
          genre: selectedGenre
        };

        newFiles.push(newFile);
        setUploadedFiles(prev => [...prev, newFile]);

        // Process video in background
        try {
          const videoBookData = await processVideoFile(file);
          if (videoBookData && onVideoUploadSuccess) {
            // Update file status to success
            setUploadedFiles(prev => prev.map(f => 
              f.id === newFile.id 
                ? { ...f, status: 'success' as const, progress: 100, preview: videoBookData.cover }
                : f
            ));
            
            // Notify parent component
            onVideoUploadSuccess(videoBookData);
            showNotification('success', `Video "${file.name}" processed successfully!`);
          } else {
            // Update file status to error
            setUploadedFiles(prev => prev.map(f => 
              f.id === newFile.id 
                ? { ...f, status: 'error' as const, error: 'Failed to process video' }
                : f
            ));
          }
        } catch (error) {
          setUploadedFiles(prev => prev.map(f => 
            f.id === newFile.id 
              ? { ...f, status: 'error' as const, error: 'Failed to process video' }
              : f
          ));
          showNotification('error', `Failed to process video: ${file.name}`);
        }
        continue;
      }

      // Handle PDF files specially
      if (file.type === 'application/pdf') {
        const newFile: UploadedFile = {
          id: generateUniqueId(),
          file,
          preview: undefined,
          status: 'uploading',
          progress: 0,
          gradeLevel: selectedGradeLevel,
          mediaType: selectedMediaType,
          genre: selectedGenre
        };

        newFiles.push(newFile);
        setUploadedFiles(prev => [...prev, newFile]);

        // Process PDF in background
        try {
          const pdfBookData = await processPdfFile(file);
          if (pdfBookData && onPdfUploadSuccess) {
            // Update file status to success
            setUploadedFiles(prev => prev.map(f => 
              f.id === newFile.id 
                ? { ...f, status: 'success' as const, progress: 100, preview: pdfBookData.cover }
                : f
            ));
            
            // Notify parent component
            onPdfUploadSuccess(pdfBookData);
            showNotification('success', `PDF "${file.name}" processed successfully!`);
          } else {
            // Update file status to error
            setUploadedFiles(prev => prev.map(f => 
              f.id === newFile.id 
                ? { ...f, status: 'error' as const, error: 'Failed to process PDF' }
                : f
            ));
          }
        } catch (error) {
          setUploadedFiles(prev => prev.map(f => 
            f.id === newFile.id 
              ? { ...f, status: 'error' as const, error: 'Failed to process PDF' }
              : f
          ));
          showNotification('error', `Failed to process PDF: ${file.name}`);
        }
        continue;
      }

      const preview = await createFilePreview(file);
      const newFile: UploadedFile = {
        id: generateUniqueId(),
        file,
        preview,
        status: 'uploading',
        progress: 0,
        gradeLevel: selectedGradeLevel,
        mediaType: selectedMediaType,
        genre: selectedGenre
      };

      newFiles.push(newFile);
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Start uploads
    for (const file of newFiles) {
      try {
        await simulateUpload(file.id);
        showNotification('success', `${file.file.name} uploaded successfully!`);
      } catch (error) {
        showNotification('error', `Failed to upload ${file.file.name}`);
      }
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [selectedGradeLevel, selectedMediaType, selectedGenre]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const clearAll = () => {
    setUploadedFiles([]);
    setSelectedGradeLevel('');
    setSelectedMediaType('');
    setSelectedGenre('');
    setGenreSearch('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="w-8 h-8 text-blue-500" />;
    if (file.type === 'application/pdf') return <FileText className="w-8 h-8 text-red-500" />;
    return <File className="w-8 h-8 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
              <span className="font-medium">Close</span>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">File Upload Dashboard</h1>
            <button
              onClick={clearAll}
              className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`fixed top-20 right-6 z-50 p-4 rounded-lg shadow-lg ${
          notification.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center space-x-2">
            {notification.type === 'success' ? (
              <Check className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upload Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Form Fields */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Upload Configuration</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Grade Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grade Level <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedGradeLevel}
                    onChange={(e) => setSelectedGradeLevel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Grade Level</option>
                    {GRADE_LEVELS.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>

                {/* Media Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Media Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedMediaType}
                    onChange={(e) => setSelectedMediaType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Media Type</option>
                    {MEDIA_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Genre */}
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Genre <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={selectedGenre || genreSearch}
                      onChange={(e) => {
                        setGenreSearch(e.target.value);
                        setShowGenreDropdown(true);
                        if (!e.target.value) setSelectedGenre('');
                      }}
                      onFocus={() => setShowGenreDropdown(true)}
                      placeholder="Search genres..."
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  
                  {showGenreDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {filteredGenres.map(genre => (
                        <button
                          key={genre}
                          onClick={() => {
                            setSelectedGenre(genre);
                            setGenreSearch('');
                            setShowGenreDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 transition-colors"
                        >
                          {genre}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Upload Zone */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">File Upload</h2>
              
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                  isDragOver 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Drop files here or click to upload
                </h3>
                <p className="text-gray-500 mb-4">
                  Supports PNG, JPEG, and PDF files up to 50MB
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Choose Files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".png,.jpg,.jpeg,.pdf,.mp4,.mov,.avi,.mkv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Upload Status */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Upload Status</h2>
              
              {uploadedFiles.length === 0 ? (
                <div className="text-center py-8">
                  <File className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No files uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {uploadedFiles.map((file, index) => (
                    <div key={`${file.id}-${index}-${file.file.name}`} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        {file.preview ? (
                          <img 
                            src={file.preview} 
                            alt={file.file.name}
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                        ) : (
                          getFileIcon(file.file)
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {file.file.name}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.file.size)}
                          </p>
                          
                          {file.status === 'uploading' && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                <span>Uploading...</span>
                                <span>{Math.round(file.progress)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${file.progress}%` }}
                                ></div>
                              </div>
                            </div>
                          )}
                          
                          {file.status === 'success' && (
                            <div className="mt-2 flex items-center space-x-1 text-green-600">
                              <Check className="w-4 h-4" />
                              <span className="text-xs">Upload complete</span>
                            </div>
                          )}
                          
                          {file.status === 'error' && (
                            <div className="mt-2">
                              <div className="flex items-center space-x-1 text-red-600">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-xs">Upload failed</span>
                              </div>
                              {file.error && (
                                <p className="text-xs text-red-500 mt-1">{file.error}</p>
                              )}
                            </div>
                          )}
                          
                          <div className="mt-2 text-xs text-gray-500">
                            <div>Grade: {file.gradeLevel}</div>
                            <div>Type: {file.mediaType}</div>
                            <div>Genre: {file.genre}</div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => removeFile(file.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upload Summary */}
            {uploadedFiles.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Files:</span>
                    <span className="font-medium">{uploadedFiles.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Completed:</span>
                    <span className="font-medium text-green-600">
                      {uploadedFiles.filter(f => f.status === 'success').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">In Progress:</span>
                    <span className="font-medium text-blue-600">
                      {uploadedFiles.filter(f => f.status === 'uploading').length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Failed:</span>
                    <span className="font-medium text-red-600">
                      {uploadedFiles.filter(f => f.status === 'error').length}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}