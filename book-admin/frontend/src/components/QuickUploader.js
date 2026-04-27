import React, { useState, useRef } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || '/api';

export default function QuickUploader({ onUploadComplete }) {
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState('');
  const fileRef = useRef(null);

  const handleUpload = async (file) => {
    if (!file || !file.name.endsWith('.zip')) {
      setError('Please upload a .zip file');
      setStatus('error');
      return;
    }
    setStatus('uploading');
    setResult(null);
    setError('');
    setProgress(`Uploading ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)...`);

    try {
      const formData = new FormData();
      formData.append('zip_file', file);

      const resp = await fetch(`${API_BASE}/zip-upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || 'Upload failed');
      setResult(data);
      setStatus('success');
      if (onUploadComplete) onUploadComplete(data);
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  return (
    <div style={{
      background: 'white', borderRadius: 16, padding: 24,
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: 24,
    }}>
      <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>📚 Upload Books</h2>
      <p style={{ color: '#888', fontSize: 13, margin: '0 0 16px' }}>
        ZIP up one or more book folders and drop it here. Each folder needs a <code>resized/</code> folder with <code>crop-*.png</code> files.
      </p>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `3px dashed ${dragOver ? '#d85f9c' : '#e0e0e0'}`,
          borderRadius: 14, padding: 40, textAlign: 'center', cursor: 'pointer',
          background: dragOver ? '#fdf2f8' : '#fafafa',
          transition: 'all 0.2s', marginBottom: 16,
        }}
      >
        <input ref={fileRef} type="file" accept=".zip" hidden onChange={e => e.target.files[0] && handleUpload(e.target.files[0])} />
        <div style={{ fontSize: 40, marginBottom: 8 }}>📦</div>
        <p style={{ fontWeight: 700, color: '#555', fontSize: 15 }}>
          {status === 'uploading' ? progress : 'Drop a ZIP file here or click to browse'}
        </p>
        <p style={{ color: '#aaa', fontSize: 12, marginTop: 4 }}>
          Supports single books, multiple books, or entire genre folders
        </p>
      </div>

      {status === 'uploading' && (
        <div style={{ padding: 16, background: '#f0f7ff', borderRadius: 10, textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '4px solid #d85f9c', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
          <p style={{ fontWeight: 600, color: '#2B6CB0', fontSize: 14 }}>Processing... This may take a few minutes for large uploads.</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {status === 'success' && result && (
        <div style={{ padding: 16, background: '#f0fff4', borderRadius: 10, border: '2px solid #c6f6d5' }}>
          <p style={{ fontWeight: 700, color: '#22543d', fontSize: 16, marginBottom: 8 }}>
            🎉 {result.uploaded} book{result.uploaded !== 1 ? 's' : ''} uploaded successfully!
          </p>
          {result.books?.map(b => (
            <div key={b.id} style={{ fontSize: 13, color: '#2d3748', padding: '4px 0' }}>
              ✅ <strong>{b.title}</strong> — {b.pages} pages ({b.type})
            </div>
          ))}
          {result.errors?.length > 0 && (
            <div style={{ marginTop: 8, padding: 8, background: '#fff5f5', borderRadius: 6 }}>
              <p style={{ fontWeight: 600, color: '#c53030', fontSize: 12 }}>⚠️ {result.failed} failed:</p>
              {result.errors.map((e, i) => <p key={i} style={{ fontSize: 11, color: '#9b2c2c' }}>{e}</p>)}
            </div>
          )}
        </div>
      )}

      {status === 'error' && (
        <div style={{ padding: 16, background: '#fff5f5', borderRadius: 10, border: '2px solid #fed7d7' }}>
          <p style={{ fontWeight: 700, color: '#c53030' }}>❌ Upload failed</p>
          <p style={{ fontSize: 13, color: '#9b2c2c' }}>{error}</p>
        </div>
      )}
    </div>
  );
}
