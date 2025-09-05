import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import ShuSpotBookOverview from './ShuSpotBookOverview';
import ShuSpotImageReader from './ShuSpotImageReader';

const ShuSpotBookLauncher = ({ book, onBack }) => {
  const [currentView, setCurrentView] = useState('overview'); // 'overview', 'reading'

  if (!book) {
    return (
      <div className="book-launcher-error">
        <h3>No book selected</h3>
        <button onClick={onBack} className="btn btn-secondary">
          <ArrowLeft size={16} style={{ marginRight: '8px' }} />
          Back to Books
        </button>
      </div>
    );
  }

  // Check if this is a ShuSpot book with image sequence
  console.log('ShuSpotBookLauncher received book:', book);
  console.log('Book page sequence:', book._page_sequence);
  console.log('Book notes:', book.notes);

  // Try to parse notes if they exist (they might contain page sequence)
  let parsedNotes = {};
  try {
    if (book.notes) {
      parsedNotes = JSON.parse(book.notes);
      console.log('Parsed notes:', parsedNotes);

      // If we have files list but no page sequence, let's build it
      if (parsedNotes.files?.images && (!parsedNotes.page_sequence || parsedNotes.page_sequence.length === 0)) {
        console.log('Building page sequence from files list');
        
        // Filter and sort screenshot files
        const screenshots = parsedNotes.files.images
          .filter(file => file.startsWith('screenshot '))
          .map(file => {
            const match = file.match(/screenshot (\d+)\.png/);
            if (match) {
              return {
                file,
                number: parseInt(match[1])
              };
            }
            return null;
          })
          .filter(x => x !== null)  // Remove any non-matching files
          .sort((a, b) => a.number - b.number);

        console.log('Sorted screenshots:', screenshots);

        // Create page sequence entries
        parsedNotes.page_sequence = screenshots.map(screenshot => {
          // Check which type of path we have
          const materialMatch = parsedNotes.folder_path.match(/MaterialsShuspotI\/([^/]+.*)$/);
          const cropMatch = parsedNotes.folder_path.match(/WEEK 70 CROP-SHuSpot\/([^/]+.*)$/);
          
          let folderPath = parsedNotes.folder_path;
          if (materialMatch) {
            folderPath = `/Users/ethan.steigerwald/Downloads/MaterialsShuspotI/${materialMatch[1]}`;
          } else if (cropMatch) {
            folderPath = `/Users/ethan.steigerwald/Downloads/WEEK 70 CROP-SHuSpot/${cropMatch[1]}`;
          }

          return {
            file_path: `${folderPath}/${screenshot.file}`,
            display_name: `Page ${screenshot.number}`,
            page_number: screenshot.number
          };
        });

        parsedNotes.total_pages = screenshots.length;
        
        // Add these properties to the book object
        book._page_sequence = parsedNotes.page_sequence;
        book._total_pages = parsedNotes.total_pages;
        book._folder_path = parsedNotes.folder_path;
        
        console.log('Constructed page sequence:', book._page_sequence);
      }
    }
  } catch (e) {
    console.log('Notes is not JSON:', e);
  }

  // Check for page sequence in either direct property or notes
  const pageSequence = book._page_sequence || parsedNotes.page_sequence;
  const isShuSpotBook = pageSequence && pageSequence.length > 0;
  
  if (isShuSpotBook) {
    // If page sequence was in notes, add it to book object
    if (!book._page_sequence && parsedNotes.page_sequence) {
      book._page_sequence = parsedNotes.page_sequence;
      book._total_pages = parsedNotes.total_pages;
      book._folder_path = parsedNotes.folder_path;
    }
  }

  if (currentView === 'reading' && isShuSpotBook) {
    return (
      <ShuSpotImageReader
        book={book}
        onBack={() => setCurrentView('overview')}
      />
    );
  }

  if (currentView === 'overview') {
    return (
      <ShuSpotBookOverview
        book={book}
        onBack={onBack}
        onStartReading={() => setCurrentView('reading')}
        isShuSpotBook={isShuSpotBook}
      />
    );
  }

  return null;
};

export default ShuSpotBookLauncher;