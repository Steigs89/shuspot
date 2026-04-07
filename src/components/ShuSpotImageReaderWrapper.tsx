import React, { useEffect, useCallback } from 'react';
// @ts-ignore - ShuSpotImageReader is a JSX file
import ShuSpotImageReader from './ShuSpotImageReader.jsx';
import ReactPageFlipReader from './ReactPageFlipReader';
import { useReadingProgress } from '../hooks/useReadingProgress';

interface ShuSpotImageReaderWrapperProps {
  book: any;
  onBack: () => void;
  onBookmarkPage: (pageNumber: number) => void;
  initialPage?: number; // Support resuming from a specific page
}

/**
 * TypeScript wrapper for the ShuSpotImageReader JavaScript component
 * with integrated reading progress tracking and Read to Me support
 */
const ShuSpotImageReaderWrapper: React.FC<ShuSpotImageReaderWrapperProps> = ({ 
  book, 
  onBack, 
  onBookmarkPage,
  initialPage 
}) => {
  // Get total pages from book metadata
  // Try multiple possible locations for page count
  const totalPages = 
    book?.page_count || 
    book?.pages?.length || 
    book?.metadata?.pages?.length ||
    book?.metadata?.total_pages || 
    0;

  // Detect if this is a Read to Me book
  // Check both snake_case (database) and camelCase (legacy) field names
  const isReadToMeBook = 
    book?.content_type === 'read-to-me' || 
    (book?.contentType === 'read-to-me' && book?.audioType === 'per-page' && book?.hasAudio === true);

  // Debug logging
  console.log('📚 ShuSpotReader - Book data:', {
    bookId: book?.id,
    contentType: book?.contentType,
    audioType: book?.audioType,
    hasAudio: book?.hasAudio,
    isReadToMeBook: isReadToMeBook,
    pageCount: book?.page_count,
    pagesLength: book?.pages?.length,
    metadataPagesLength: book?.metadata?.pages?.length,
    metadataTotalPages: book?.metadata?.total_pages,
    calculatedTotalPages: totalPages
  });

  // Initialize reading progress tracking
  const { progress, updateProgress, markComplete } = useReadingProgress({
    bookId: book?.id || '',
    bookType: 'supabase',
    totalPages: totalPages
  });

  // Enhanced bookmark handler that also updates progress
  const handleBookmarkPage = useCallback(async (pageNumber: number) => {
    console.log('📖 ShuSpotReader - Page changed to:', pageNumber);
    
    // Update progress
    if (pageNumber > 0) {
      await updateProgress(pageNumber);
    }

    // Check if book is complete
    if (totalPages > 0 && pageNumber >= totalPages) {
      console.log('🎉 ShuSpotReader - Book completed!');
      await markComplete();
    }

    // Call original bookmark handler
    if (onBookmarkPage) {
      onBookmarkPage(pageNumber);
    }
  }, [updateProgress, markComplete, totalPages, onBookmarkPage]);

  // Log progress on mount
  useEffect(() => {
    if (progress) {
      console.log('📚 ShuSpotReader - Current progress:', {
        currentPage: progress.currentPage,
        percentage: progress.progressPercentage,
        totalPages: progress.totalPages
      });
    }
  }, [progress]);

  // If this is a Read to Me book, render ReactPageFlipReader instead
  if (isReadToMeBook) {
    console.log('🎵 Rendering ReactPageFlipReader for Read to Me book');
    return (
      <ReactPageFlipReader
        book={book}
        onBack={onBack}
        initialPage={initialPage || progress?.currentPage || 1}
      />
    );
  }

  // Otherwise, render the regular ShuSpotImageReader
  return (
    <ShuSpotImageReader
      book={book}
      onBack={onBack}
      onBookmarkPage={handleBookmarkPage}
      initialPage={initialPage || progress?.currentPage || 1}
    />
  );
};

export default ShuSpotImageReaderWrapper;
