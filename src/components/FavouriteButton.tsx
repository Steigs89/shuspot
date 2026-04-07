import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import { useFavourites } from '../hooks/useFavourites';

/**
 * Reusable favourite button component for book pages
 * 
 * This button allows users to add/remove books from their favourites
 * and displays the current favourite status with a heart icon.
 */
interface FavouriteButtonProps {
  bookId: string;
  userId: string | null;
  className?: string;
  variant?: 'default' | 'rounded'; // default: icon only, rounded: with border
}

export const FavouriteButton: React.FC<FavouriteButtonProps> = ({
  bookId,
  userId,
  className = '',
  variant = 'rounded'
}) => {
  const { toggleFavouriteStatus, checkIsFavourite } = useFavourites({ 
    userId,
    autoFetch: false // Don't fetch all favourites, just check status
  });
  
  const [isFavourited, setIsFavourited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check initial favourite status
  useEffect(() => {
    const checkStatus = async () => {
      if (userId && bookId) {
        const status = await checkIsFavourite(bookId);
        setIsFavourited(status);
      }
    };
    checkStatus();
  }, [userId, bookId, checkIsFavourite]);

  const handleToggle = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent parent click events
    }

    if (!userId) {
      console.warn('User must be logged in to favourite books');
      return;
    }

    setIsLoading(true);
    try {
      const newStatus = await toggleFavouriteStatus(bookId);
      setIsFavourited(newStatus);
    } catch (error) {
      console.error('Failed to toggle favourite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const baseClasses = variant === 'rounded'
    ? `p-2 rounded-full border transition-colors ${
        isFavourited
          ? 'bg-red-50 border-red-200 text-red-500'
          : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-red-400'
      }`
    : `transition-colors ${
        isFavourited
          ? 'text-red-500'
          : 'text-gray-400 hover:text-red-400'
      }`;

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading || !userId}
      className={`${baseClasses} ${className} ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
      aria-label={isFavourited ? 'Remove from favourites' : 'Add to favourites'}
      title={isFavourited ? 'Remove from favourites' : 'Add to favourites'}
    >
      <Heart 
        className={`w-5 h-5 ${isFavourited ? 'fill-current' : ''}`}
      />
    </button>
  );
};

/**
 * Example usage in a book list component:
 * 
 * ```tsx
 * import { FavouriteButton } from './FavouriteButton';
 * 
 * function BookCard({ book, userId }) {
 *   return (
 *     <div className="book-card">
 *       <img src={book.thumbnailUrl} alt={book.title} />
 *       <h3>{book.title}</h3>
 *       <FavouriteButton bookId={book.id} userId={userId} />
 *     </div>
 *   );
 * }
 * ```
 */
