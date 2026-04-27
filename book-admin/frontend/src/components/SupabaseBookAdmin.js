import React, { useState, useEffect, useCallback } from 'react';
import { Search, Trash2, Eye, EyeOff, ChevronDown } from 'lucide-react';

const SUPABASE_URL = 'https://xzwdtcczndgglqikmlwj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6d2R0Y2N6bmRnZ2xxaWttbHdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyOTkyNzUsImV4cCI6MjA2ODg3NTI3NX0.05oCSZ1d3eJHr79B1UvCoQTIL-UBGAKdRBk4CUwe7wE';

const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

const BOOK_TYPES = [
  { id: 'all', label: 'All Books', color: '#d85f9c' },
  { id: 'book', label: 'Books', color: '#a1cfd2' },
  { id: 'read-to-me', label: 'Read to Me', color: '#d85f9c' },
  { id: 'audiobook', label: 'Audiobooks', color: '#e2d151' },
  { id: 'video', label: 'Videos', color: '#a1cfd2' },
];

function EditableCell({ value, onSave, type = 'text' }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || '');
  const [saved, setSaved] = useState(false);

  useEffect(() => setVal(value || ''), [value]);

  const save = () => {
    setEditing(false);
    if (val !== (value || '')) {
      onSave(val);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={save}
        onKeyDown={e => e.key === 'Enter' && save()}
        style={{
          width: '100%', padding: '4px 6px', border: '2px solid #d85f9c',
          borderRadius: 6, fontSize: 13, outline: 'none', background: '#fff',
        }}
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      style={{
        cursor: 'pointer', padding: '4px 6px', borderRadius: 6, fontSize: 13,
        minHeight: 24, transition: 'background 0.3s',
        background: saved ? '#d4edda' : 'transparent',
        border: '1px solid transparent',
      }}
      onMouseEnter={e => e.target.style.border = '1px solid #ddd'}
      onMouseLeave={e => e.target.style.border = '1px solid transparent'}
      title="Click to edit"
    >
      {value || <span style={{ color: '#ccc' }}>—</span>}
    </div>
  );
}

function EditableSelect({ value, options, onSave }) {
  const [saved, setSaved] = useState(false);
  const handleChange = (e) => {
    onSave(e.target.value);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };
  return (
    <select
      value={value || ''}
      onChange={handleChange}
      style={{
        padding: '4px 6px', borderRadius: 6, fontSize: 13, border: '1px solid #ddd',
        background: saved ? '#d4edda' : '#fff', cursor: 'pointer', width: '100%',
      }}
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export default function SupabaseBookAdmin() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({});

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${SUPABASE_URL}/rest/v1/books?select=*&order=created_at.desc&limit=500`;
      if (filter !== 'all') url += `&content_type=eq.${filter}`;
      const res = await fetch(url, { headers: HEADERS });
      const data = await res.json();
      setBooks(data || []);
      // Compute stats
      const s = { total: data.length };
      BOOK_TYPES.forEach(t => {
        if (t.id !== 'all') s[t.id] = data.filter(b => b.content_type === t.id).length;
      });
      setStats(s);
    } catch (err) {
      console.error('Failed to fetch books:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  const updateBook = async (id, field, value) => {
    try {
      // Handle metadata sub-fields
      if (['ar_level', 'lexile', 'genre_1', 'genre_2', 'fiction_type', 'isbn'].includes(field)) {
        const book = books.find(b => b.id === id);
        const meta = { ...(book?.metadata || {}), [field]: value };
        await fetch(`${SUPABASE_URL}/rest/v1/books?id=eq.${id}`, {
          method: 'PATCH', headers: HEADERS, body: JSON.stringify({ metadata: meta }),
        });
        setBooks(prev => prev.map(b => b.id === id ? { ...b, metadata: meta } : b));
      } else {
        await fetch(`${SUPABASE_URL}/rest/v1/books?id=eq.${id}`, {
          method: 'PATCH', headers: HEADERS, body: JSON.stringify({ [field]: value }),
        });
        setBooks(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
      }
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  const deleteBook = async (id, title) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/books?id=eq.${id}`, { method: 'DELETE', headers: HEADERS });
      setBooks(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const toggleActive = async (id, current) => {
    await updateBook(id, 'is_active', !current);
  };

  const filtered = books.filter(b => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (b.title || '').toLowerCase().includes(s) || (b.author || '').toLowerCase().includes(s);
  });

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>📚 ShuSpot Book Admin</h1>
      <p style={{ color: '#888', marginBottom: 24, fontSize: 14 }}>
        Manage books directly in Supabase. Click any field to edit.
      </p>

      {/* Book Type Filter Buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {BOOK_TYPES.map(t => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            style={{
              padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 14, transition: 'all 0.2s',
              background: filter === t.id ? t.color : '#f0f0f0',
              color: filter === t.id ? '#fff' : '#555',
              boxShadow: filter === t.id ? `0 4px 12px ${t.color}40` : 'none',
            }}
          >
            {t.label}
            {stats[t.id] !== undefined && <span style={{ marginLeft: 6, opacity: 0.8 }}>({stats[t.id]})</span>}
            {t.id === 'all' && stats.total !== undefined && <span style={{ marginLeft: 6, opacity: 0.8 }}>({stats.total})</span>}
          </button>
        ))}
      </div>

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <Search size={18} color="#999" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by title or author..."
          style={{
            flex: 1, maxWidth: 400, padding: '10px 14px', border: '2px solid #e0e0e0',
            borderRadius: 10, fontSize: 14, outline: 'none',
          }}
        />
        <span style={{ color: '#999', fontSize: 13 }}>{filtered.length} books</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📖</div>
          <p style={{ color: '#888' }}>Loading books from Supabase...</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={thStyle}>Cover</th>
                <th style={thStyle}>Title</th>
                <th style={thStyle}>Author</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Reading Level</th>
                <th style={thStyle}>AR Level</th>
                <th style={thStyle}>Lexile</th>
                <th style={thStyle}>Genre 1</th>
                <th style={thStyle}>Genre 2</th>
                <th style={thStyle}>Fiction</th>
                <th style={thStyle}>Pages</th>
                <th style={thStyle}>Active</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(book => (
                <tr key={book.id} style={{ borderBottom: '1px solid #f0f0f0' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={tdStyle}>
                    {book.cover_image_url ? (
                      <img src={book.cover_image_url} alt="" style={{ width: 40, height: 54, objectFit: 'cover', borderRadius: 4 }} />
                    ) : <div style={{ width: 40, height: 54, background: '#f0f0f0', borderRadius: 4 }} />}
                  </td>
                  <td style={{ ...tdStyle, maxWidth: 200 }}>
                    <EditableCell value={book.title} onSave={v => updateBook(book.id, 'title', v)} />
                  </td>
                  <td style={tdStyle}>
                    <EditableCell value={book.author} onSave={v => updateBook(book.id, 'author', v)} />
                  </td>
                  <td style={tdStyle}>
                    <EditableSelect
                      value={book.content_type}
                      options={['book', 'read-to-me', 'audiobook', 'video']}
                      onSave={v => updateBook(book.id, 'content_type', v)}
                    />
                  </td>
                  <td style={tdStyle}>
                    <EditableCell value={book.reading_level} onSave={v => updateBook(book.id, 'reading_level', v)} />
                  </td>
                  <td style={tdStyle}>
                    <EditableCell value={book.metadata?.ar_level} onSave={v => updateBook(book.id, 'ar_level', v)} />
                  </td>
                  <td style={tdStyle}>
                    <EditableCell value={book.metadata?.lexile} onSave={v => updateBook(book.id, 'lexile', v)} />
                  </td>
                  <td style={tdStyle}>
                    <EditableCell value={book.metadata?.genre_1} onSave={v => updateBook(book.id, 'genre_1', v)} />
                  </td>
                  <td style={tdStyle}>
                    <EditableCell value={book.metadata?.genre_2} onSave={v => updateBook(book.id, 'genre_2', v)} />
                  </td>
                  <td style={tdStyle}>
                    <EditableSelect
                      value={book.metadata?.fiction_type || 'Fiction'}
                      options={['Fiction', 'Non-Fiction', 'Unknown']}
                      onSave={v => updateBook(book.id, 'fiction_type', v)}
                    />
                  </td>
                  <td style={tdStyle}>{book.page_count || book.metadata?.total_pages || '—'}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => toggleActive(book.id, book.is_active)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: book.is_active ? '#22c55e' : '#ccc',
                      }}
                      title={book.is_active ? 'Active — click to deactivate' : 'Inactive — click to activate'}
                    >
                      {book.is_active ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => deleteBook(book.id, book.title)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                      title="Delete book"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle = {
  padding: '10px 8px', textAlign: 'left', fontSize: 11, fontWeight: 700,
  color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '8px', verticalAlign: 'middle',
};
