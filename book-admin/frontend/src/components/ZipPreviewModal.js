import React from 'react';

function ZipPreviewModal({ isOpen, onClose, data, onConfirm }) {
  if (!isOpen || !data) return null;

  const { token, sample_books = [], parsing_stats, total_parsed } = data;

  const toCoverUrl = (book) => {
    const p = book._cover_image_path || (book._page_sequence?.[0]?.file_path) || '';
    if (!p) return '';
    const idx = p.lastIndexOf('CROP-ShuSpot');
    if (idx !== -1) {
      const rel = p.substring(idx + 'CROP-ShuSpot'.length).replace(/^\/*/, '');
      return `/CROP-ShuSpot/${rel}`;
    }
    return p;
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 8, width: 'min(900px, 92vw)', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>ZIP Preview</h3>
          <button onClick={onClose} className="btn btn-secondary">Close</button>
        </div>
        <div style={{ padding: 16 }}>
          <p style={{ marginTop: 0 }}>
            Parsed {total_parsed || 0} items. Showing up to 5 sample books below.
          </p>
          {parsing_stats && (
            <pre style={{ background: '#f8f9fa', padding: 12, borderRadius: 6, fontSize: 12, whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(parsing_stats, null, 2)}
            </pre>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {sample_books.map((b, i) => (
              <div key={i} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, background: '#fff' }}>
                <div style={{ width: '100%', aspectRatio: '3/4', background: '#f0f0f0', borderRadius: 6, overflow: 'hidden', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {toCoverUrl(b) ? (
                    <img src={toCoverUrl(b)} alt={b.Name || b.title || 'cover'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ color: '#888' }}>No cover</span>
                  )}
                </div>
                <div style={{ fontWeight: 600 }}>{b.Name || b.title || 'Untitled'}</div>
                <div style={{ color: '#666', fontSize: 12 }}>{b.Author || b.author || 'Unknown'}</div>
                <div style={{ marginTop: 6, fontSize: 12 }}>
                  <div>Media: {b.Media || b.book_type || 'Books'}</div>
                  <div>Pages: {b._total_pages ?? b.total_pages ?? (b._page_sequence?.length || 0)}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button onClick={() => onConfirm(token)} className="btn btn-primary">Import All</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ZipPreviewModal;
