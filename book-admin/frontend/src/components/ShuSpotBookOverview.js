import React, { useState, useEffect } from 'react';
import { ArrowLeft, Heart, MapPin, Play, ChevronUp, ChevronDown, Book } from 'lucide-react';
import { getApiUrl } from '../utils/api';

export default function ShuSpotBookOverview({ book, onBack, onStartReading, isShuSpotBook }) {
  const [isFavorited, setIsFavorited] = useState(false);
  const [isTopBarExpanded, setIsTopBarExpanded] = useState(true);
  const [isBottomBarExpanded, setIsBottomBarExpanded] = useState(true);
  const [loadedDescription, setLoadedDescription] = useState(null);
  const currentDate = new Date().toLocaleDateString();

  // Extract book information
  const title = book.Name || book.title || 'Unknown Title';
  const author = book.Author || book.author || 'Unknown Author';
  const apiUrl = getApiUrl(); // Store API URL at component level for use in event handlers
  
  // Load description from description.txt if not in book data
  useEffect(() => {
    const loadDescriptionFromFile = async () => {
      // Only try to load if we don't have a description and have a folder path
      if (!book.description && !book.Description && book._folder_path) {
        try {
          const folderPathMatch = book._folder_path.match(/.*CROP-ShuSpot[\/\\](.+)$/);
          if (folderPathMatch) {
            const [, relativePath] = folderPathMatch;
            const cleanPath = relativePath.replace(/\\/g, '/');
            const descriptionUrl = `${apiUrl}/CROP-ShuSpot/${cleanPath}/description.txt`;
            
            console.log('Trying to load description from:', descriptionUrl);
            const response = await fetch(descriptionUrl);
            if (response.ok) {
              const descriptionText = await response.text();
              setLoadedDescription(descriptionText.trim());
              console.log('Loaded description:', descriptionText.trim());
            }
          }
        } catch (error) {
          console.log('Could not load description.txt:', error);
        }
      }
    };
    
    loadDescriptionFromFile();
  }, [book._folder_path, book.description, book.Description, apiUrl]);
  
  // Better cover image logic - check multiple possible sources
  const getCoverImageUrl = () => {
    console.log('🔥 UPDATED ShuSpotBookOverview getCoverImageUrl - VERSION 2024-01-09 🔥');
    console.log('Getting cover image for book:', title, book);
    
    // First check if there's a direct cover_image_url
    if (book.cover_image_url) {
      console.log('🚨 FOUND EXISTING cover_image_url:', book.cover_image_url);
      
      // If it's already a working Supabase URL, use it directly
      if (book.cover_image_url.startsWith('https://') && book.cover_image_url.includes('supabase.co')) {
        console.log('✅ Using working Supabase URL directly:', book.cover_image_url);
        return book.cover_image_url;
      }
      
      // Only convert if it's a local file path
      if (book.cover_image_url.includes('CROP-ShuSpot') && !book.cover_image_url.startsWith('http')) {
        const cropMatch = book.cover_image_url.match(/.*CROP-ShuSpot[\/\\](.+)$/);
        if (cropMatch) {
          const [, relativePath] = cropMatch;
          const cleanPath = relativePath.replace(/\\/g, '/');
          const correctedUrl = `${apiUrl}/CROP-ShuSpot/${cleanPath}`;
          console.log('🔧 CONVERTED local path to backend URL:', correctedUrl);
          return correctedUrl;
        }
      }
      
      return book.cover_image_url;
    }
    
    // Check if book has notes with cover_image_path
    if (book.notes) {
      try {
        const parsedNotes = typeof book.notes === 'string' ? JSON.parse(book.notes) : book.notes;
        if (parsedNotes.cover_image_path) {
          return parsedNotes.cover_image_path;
        }
      } catch (e) {
        console.log('Error parsing notes for cover image:', e);
      }
    }
    
    // Use the correct path structure that matches backend serving
    // Backend serves from /CROP-ShuSpot, and we need to construct the path relative to the backend
    if (book._folder_path) {
      const folderPathMatch = book._folder_path.match(/.*CROP-ShuSpot[\/\\](.+)$/);
      if (folderPathMatch) {
        const [, relativePath] = folderPathMatch;
        const cleanPath = relativePath.replace(/\\/g, '/');
        const coverUrl = `${apiUrl}/CROP-ShuSpot/${cleanPath}/cover.jpg`;
        console.log('Using derived cover URL from _folder_path:', coverUrl);
        return coverUrl;
      }
    }    // Check notes for folder_path
    if (book.notes) {
      try {
        const parsedNotes = typeof book.notes === 'string' ? JSON.parse(book.notes) : book.notes;
        if (parsedNotes.folder_path) {
          console.log('Using notes folder_path:', parsedNotes.folder_path);
          const cropMatch = parsedNotes.folder_path.match(/.*CROP-ShuSpot[\/\\](.+)$/);
          if (cropMatch) {
            const [, relativePath] = cropMatch;
            const cleanPath = relativePath.replace(/\\/g, '/');
            const coverUrl = `${apiUrl}/CROP-ShuSpot/${cleanPath}/cover.jpg`;
            console.log('Generated cover URL from notes:', coverUrl);
            return coverUrl;
          }
        }
      } catch (e) {
        console.log('Error parsing notes for folder path:', e);
      }
    }
    
    // Fallback: try to use the first page as cover if cover.jpg doesn't exist
    if (book._page_sequence && book._page_sequence.length > 0) {
      const firstPage = book._page_sequence[0];
      console.log('Using first page fallback:', firstPage);
      if (firstPage.file_path) {
        const cropMatch = firstPage.file_path.match(/.*CROP-ShuSpot[\/\\](.+)$/);
        if (cropMatch) {
          const [, relativePath] = cropMatch;
          const cleanPath = relativePath.replace(/\\/g, '/');
          const fallbackUrl = `${apiUrl}/CROP-ShuSpot/${cleanPath}`;
          console.log('Generated fallback URL:', fallbackUrl);
          return fallbackUrl;
        }
      }
    }
    
    console.log('No cover image found for book:', title);
    return null;
  };
  
  const coverImage = getCoverImageUrl();
  console.log('Cover image URL:', coverImage, 'for book:', title);
  const totalPages = book._total_pages || book.Pages || 0;
  const gradeLevel = book['Grade Level'] || book.grade_level || 'K2';
  const genre = book.Genre || book.genre || 'Animals & Their Habitats';
  const pagesRead = 0;
  // Get description from multiple possible sources
  const getDescription = () => {
    // Check loaded description first
    if (loadedDescription) {
      return loadedDescription;
    }
    
    // Check direct description field
    if (book.description) {
      return book.description;
    }
    
    // Check notes for description
    if (book.notes) {
      try {
        const parsedNotes = typeof book.notes === 'string' ? JSON.parse(book.notes) : book.notes;
        if (parsedNotes.description) {
          return parsedNotes.description;
        }
      } catch (e) {
        console.log('Error parsing notes for description:', e);
      }
    }
    
    // Check other possible fields
    if (book.Description) {
      return book.Description;
    }
    
    return "No description available.";
  };
  
  const description = getDescription();
  const readingProgress = (pagesRead / totalPages) * 100;

  const handleStartReading = () => {
    onStartReading();
  };

  const handleFavoriteClick = () => {
    setIsFavorited(!isFavorited);
  };

  return (
    <div className="shuspot-book-overview">
      {/* Top Navigation Bar */}
      <div className={`shuspot-top-bar ${isTopBarExpanded ? 'expanded' : ''}`}>
        <div className="top-bar-content">
          <button onClick={onBack} className="shuspot-icon-button">
            <ArrowLeft size={24} />
          </button>
          <div className="book-info">
            <span className="book-title-small">{title}</span>
            <span className="book-author-small">{author}</span>
          </div>
          <div className="shuspot-icon-group">
            <button
              className={`shuspot-icon-button ${isFavorited ? 'favorited' : ''}`}
              onClick={handleFavoriteClick}
            >
              <Heart size={24} />
            </button>
            <button className="shuspot-icon-button">
              <MapPin size={24} />
            </button>
          </div>
        </div>
        <button 
          className="expand-toggle"
          onClick={() => setIsTopBarExpanded(!isTopBarExpanded)}
        >
          {isTopBarExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
        </button>
      </div>

      <div className="shuspot-content">
        {/* Left Section: Book Cover */}
        <div className="shuspot-book-cover-section">
          <div className="shuspot-book-cover">
            {coverImage ? (
              <img
                src={coverImage}
                alt={title}
                onError={(e) => {
                  console.log('Cover image failed to load:', coverImage);
                  // Try fallback to first page if cover.jpg doesn't exist
                  if (coverImage && coverImage.includes('cover.jpg')) {
                    // Use proper backend URL for fallback
                    let fallbackUrl = coverImage.replace('/cover.jpg', '/resized/crop-1.png');
                    // Ensure it's a backend URL, not an absolute file path
                    if (fallbackUrl.includes('CROP-ShuSpot') && !fallbackUrl.startsWith(`${apiUrl}/`)) {
                      const cropMatch = fallbackUrl.match(/.*CROP-ShuSpot[\/\\](.+)$/);
                      if (cropMatch) {
                        const [, relativePath] = cropMatch;
                        const cleanPath = relativePath.replace(/\\/g, '/');
                        fallbackUrl = `${apiUrl}/CROP-ShuSpot/${cleanPath}`;
                      }
                    }
                    console.log('Trying fallback:', fallbackUrl);
                    e.target.src = fallbackUrl;
                  } else {
                    // If even the fallback fails, show the fallback div
                    e.target.style.display = 'none';
                    const fallbackDiv = document.createElement('div');
                    fallbackDiv.className = 'shuspot-book-cover-fallback';
                    fallbackDiv.innerHTML = `
                      <div class="shuspot-book-cover-fallback-content">
                        <div class="shuspot-book-cover-fallback-icon">📖</div>
                        <p>Cover Not Available</p>
                      </div>
                    `;
                    e.target.parentNode.appendChild(fallbackDiv);
                  }
                }}
              />
            ) : (
              <div className="shuspot-book-cover-fallback">
                <div className="shuspot-book-cover-fallback-content">
                  <div className="shuspot-book-cover-fallback-icon">📖</div>
                  <p>No Cover Image</p>
                </div>
              </div>
            )}
            <div className="pdf-badge">PDF</div>
          </div>
        </div>

        {/* Right Section: Book Details */}
        <div className="shuspot-details-panel">
          <div className="book-details-section">
            <h1 className="book-title">{title}</h1>
            
            <div className="book-preview-section">
              <div className="book-preview-image">
                {coverImage ? (
                  <img
                    src={coverImage}
                    alt={`${title} preview`}
                    onError={(e) => {
                      console.log('Preview image failed to load:', coverImage);
                      // Try fallback to first page if cover.jpg doesn't exist
                      if (coverImage && coverImage.includes('cover.jpg')) {
                        // Use proper backend URL for fallback
                        let fallbackUrl = coverImage.replace('/cover.jpg', '/resized/crop-1.png');
                        // Ensure it's a backend URL, not an absolute file path
                        if (fallbackUrl.includes('CROP-ShuSpot') && !fallbackUrl.startsWith(`${apiUrl}/`)) {
                          const cropMatch = fallbackUrl.match(/.*CROP-ShuSpot[\/\\](.+)$/);
                          if (cropMatch) {
                            const [, relativePath] = cropMatch;
                            const cleanPath = relativePath.replace(/\\/g, '/');
                            fallbackUrl = `${apiUrl}/CROP-ShuSpot/${cleanPath}`;
                          }
                        }
                        console.log('Trying preview fallback:', fallbackUrl);
                        e.target.src = fallbackUrl;
                      } else {
                        // If even the fallback fails, show the fallback div
                        e.target.style.display = 'none';
                        const fallbackDiv = document.createElement('div');
                        fallbackDiv.className = 'book-preview-fallback';
                        fallbackDiv.innerHTML = '📖';
                        e.target.parentNode.appendChild(fallbackDiv);
                      }
                    }}
                  />
                ) : (
                  <div className="book-preview-fallback">📖</div>
                )}
              </div>
              <div className="book-description">
                {description}
              </div>
            </div>

            <div className="book-metadata">
              <div className="metadata-item">
                <label>Author:</label>
                <span>{author}</span>
              </div>
              <div className="metadata-item">
                <label>Grade Level:</label>
                <span>{gradeLevel}</span>
              </div>
              <div className="metadata-item">
                <label>Genre:</label>
                <span>{genre}</span>
              </div>
              <div className="metadata-item">
                <label>Total Pages:</label>
                <span>{totalPages}</span>
              </div>
            </div>

            <div className="progress-section">
              <h2>PROGRESS</h2>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${readingProgress}%` }} />
              </div>
              <div className="progress-stats">
                <div className="progress-item">
                  <label>Reading Progress:</label>
                  <span>{readingProgress}%</span>
                </div>
                <div className="progress-item">
                  <label>Pages Read:</label>
                  <span>{pagesRead} / {totalPages}</span>
                </div>
                <div className="progress-item">
                  <label>Status:</label>
                  <span className="status-not-started">Not Started</span>
                </div>
              </div>
            </div>

            <button onClick={handleStartReading} className="shuspot-start-reading-btn">
              <Play size={24} />
              Start Reading
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div className={`shuspot-bottom-bar ${isBottomBarExpanded ? 'expanded' : ''}`}>
        <button 
          className="expand-toggle"
          onClick={() => setIsBottomBarExpanded(!isBottomBarExpanded)}
        >
          {isBottomBarExpanded ? <ChevronDown size={24} /> : <ChevronUp size={24} />}
        </button>
        <div className="bottom-bar-content">
          <div className="page-info">
            <Book size={20} />
            <span>Page {pagesRead} of {totalPages}</span>
          </div>
          <div className="reading-progress">
            <div className="progress-bar-mini">
              <div className="progress-bar-fill" style={{ width: `${readingProgress}%` }} />
            </div>
            <span className="progress-percentage">{Math.round(readingProgress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}