import React, { useState, useMemo, useEffect } from 'react';
import { useParentalControlsContext } from '../../contexts/ParentalControlsContext';
import { GRADE_LEVELS, MEDIA_TYPES } from '../../constants/library';
import './ContentBlockingPanel.css';

// Import genres from constants
const GENRES = [
  'Action', 'Adventure', 'Animals', 'Art', 'Biography', 'Classics', 'Comedy',
  'Comics', 'Cooking', 'Crime', 'Drama', 'Education', 'Family', 'Fantasy',
  'Fiction', 'Folklore', 'Friendship', 'Geography', 'Health', 'History',
  'Horror', 'Humor', 'Imagination', 'Inspirational', 'Language', 'Magic',
  'Math', 'Music', 'Mystery', 'Mythology', 'Nature', 'Non-Fiction', 'Poetry',
  'Politics', 'Psychology', 'Religion', 'Romance', 'Science', 'Self-Help',
  'Social', 'Sports', 'Technology', 'Thriller', 'Travel', 'War'
  // Add all 117 genres here
];

export const ContentBlockingPanel: React.FC = () => {
  const { controls, updateGenres, updateMediaTypes, updateGradeLevels } = useParentalControlsContext();
  const [blockedGenres, setBlockedGenres] = useState<Set<string>>(new Set());
  const [blockedMediaTypes, setBlockedMediaTypes] = useState<Set<string>>(new Set());
  const [restrictedGradeLevels, setRestrictedGradeLevels] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);

  // Load existing blocked items from controls
  useEffect(() => {
    if (controls) {
      setBlockedGenres(new Set(controls.blocked_genres));
      setBlockedMediaTypes(new Set(controls.blocked_media_types));
      setRestrictedGradeLevels(new Set(controls.restricted_grade_levels || []));
    }
  }, [controls]);

  const filteredGenres = useMemo(() => {
    if (!searchTerm) return GENRES;
    return GENRES.filter(genre => 
      genre.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const toggleGenre = (genre: string) => {
    const newBlocked = new Set(blockedGenres);
    if (newBlocked.has(genre)) {
      newBlocked.delete(genre);
    } else {
      newBlocked.add(genre);
    }
    setBlockedGenres(newBlocked);
  };

  const toggleMediaType = (mediaType: string) => {
    const newBlocked = new Set(blockedMediaTypes);
    if (newBlocked.has(mediaType)) {
      newBlocked.delete(mediaType);
    } else {
      newBlocked.add(mediaType);
    }
    setBlockedMediaTypes(newBlocked);
  };

  const toggleGradeLevel = (gradeLevel: string) => {
    const newRestricted = new Set(restrictedGradeLevels);
    if (newRestricted.has(gradeLevel)) {
      newRestricted.delete(gradeLevel);
    } else {
      newRestricted.add(gradeLevel);
    }
    setRestrictedGradeLevels(newRestricted);
  };

  const selectAllGenres = () => {
    setBlockedGenres(new Set(filteredGenres));
  };

  const deselectAllGenres = () => {
    setBlockedGenres(new Set());
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save genres, media types, and grade levels
      const genresResult = await updateGenres(Array.from(blockedGenres));
      const mediaTypesResult = await updateMediaTypes(Array.from(blockedMediaTypes));
      const gradeLevelsResult = await updateGradeLevels(Array.from(restrictedGradeLevels));

      if (genresResult.success && mediaTypesResult.success && gradeLevelsResult.success) {
        alert('Settings saved successfully');
      } else {
        alert(genresResult.error || mediaTypesResult.error || gradeLevelsResult.error || 'Save failed, please try again');
      }
    } catch (err) {
      alert('Save failed, please try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="content-blocking-panel">
      <section className="blocking-section">
        <h3>Media Type Management</h3>
        <p className="section-description">Select media types to block (matches Tier 2 navigation)</p>
        
        <div className="media-type-grid">
          {MEDIA_TYPES.map((mediaType) => (
            <label key={mediaType.id} className="blocking-item">
              <input
                type="checkbox"
                checked={blockedMediaTypes.has(mediaType.id)}
                onChange={() => toggleMediaType(mediaType.id)}
              />
              <span className="item-label">{mediaType.name}</span>
              {blockedMediaTypes.has(mediaType.id) && (
                <span className="blocked-indicator">✕</span>
              )}
            </label>
          ))}
        </div>
      </section>

      <section className="blocking-section">
        <h3>Grade Level Management</h3>
        <p className="section-description">Select grade levels to restrict</p>
        
        <div className="media-type-grid">
          {GRADE_LEVELS.map((gradeLevel) => (
            <label key={gradeLevel.value} className="blocking-item">
              <input
                type="checkbox"
                checked={restrictedGradeLevels.has(gradeLevel.value)}
                onChange={() => toggleGradeLevel(gradeLevel.value)}
              />
              <span className="item-label">Grade {gradeLevel.label}</span>
              {restrictedGradeLevels.has(gradeLevel.value) && (
                <span className="blocked-indicator">✕</span>
              )}
            </label>
          ))}
        </div>
      </section>

      <section className="blocking-section">
        <div className="section-header">
          <h3>Genre Management</h3>
          <div className="bulk-actions">
            <button onClick={selectAllGenres} className="bulk-btn">Select All</button>
            <button onClick={deselectAllGenres} className="bulk-btn">Deselect All</button>
          </div>
        </div>
        <p className="section-description">Select genres to block</p>

        <div className="search-box">
          <input
            type="text"
            placeholder="Search genres..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="genre-grid">
          {filteredGenres.map((genre) => (
            <label key={genre} className="blocking-item">
              <input
                type="checkbox"
                checked={blockedGenres.has(genre)}
                onChange={() => toggleGenre(genre)}
              />
              <span className="item-label">{genre}</span>
              {blockedGenres.has(genre) && (
                <span className="blocked-indicator">✕</span>
              )}
            </label>
          ))}
        </div>

        {filteredGenres.length === 0 && (
          <div className="no-results">No matching genres found</div>
        )}
      </section>

      <div className="panel-footer">
        <div className="blocked-summary">
          Blocked: {blockedMediaTypes.size} media types, {restrictedGradeLevels.size} grade levels, {blockedGenres.size} genres
        </div>
        <button
          className="save-btn"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};
