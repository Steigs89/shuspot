import ReactPageFlipReader from './ReactPageFlipReader';

const ShuSpotImageReader = ({ book, onBack, onBookmarkPage }) => {
  // Use ReactPageFlipReader as the final book player
  return (
    <ReactPageFlipReader 
      book={book} 
      onBack={onBack} 
      onBookmarkPage={onBookmarkPage} 
    />
  );
};

export default ShuSpotImageReader;