import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText } from 'lucide-react';

const FileUpload = ({ onUpload, isUploading }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Filter for supported file types
    const supportedTypes = ['.pdf', '.docx', '.doc', '.epub', '.txt', '.rtf', '.mp3', '.m4a', '.wav', '.mp4', '.mov', '.avi'];
    const validFiles = acceptedFiles.filter(file => {
      const extension = '.' + file.name.split('.').pop().toLowerCase();
      return supportedTypes.includes(extension);
    });

    setSelectedFiles(validFiles);

    if (rejectedFiles.length > 0) {
      alert(`${rejectedFiles.length} files were rejected. Supported types: PDF, DOCX, DOC, EPUB, TXT, RTF, MP3, M4A, WAV, MP4, MOV, AVI`);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'application/epub+zip': ['.epub'],
      'text/plain': ['.txt'],
      'application/rtf': ['.rtf'],
      'audio/mpeg': ['.mp3'],
      'audio/mp4': ['.m4a'],
      'audio/wav': ['.wav'],
      'video/mp4': ['.mp4'],
      'video/quicktime': ['.mov'],
      'video/x-msvideo': ['.avi']
    },
    multiple: true,
    maxFiles: 500
  });

  const handleUpload = () => {
    if (selectedFiles.length > 0) {
      onUpload(selectedFiles);
      setSelectedFiles([]);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div>
      <div
        {...getRootProps()}
        className={`upload-area ${isDragActive ? 'active' : ''}`}
      >
        <input {...getInputProps()} />
        <Upload size={48} style={{ color: '#007bff', marginBottom: '16px' }} />
        {isDragActive ? (
          <p>Drop the files here...</p>
        ) : (
          <div>
            <p><strong>Click to select files or drag and drop</strong></p>
            <p>Supports: PDF, DOCX, DOC, EPUB, TXT, RTF, MP3, M4A, WAV, MP4, MOV, AVI (max 500 files)</p>
            <p style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
              📁 You can also drop entire folders with books and cover images!
            </p>
          </div>
        )}
      </div>

      {selectedFiles.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>Selected Files ({selectedFiles.length})</h3>
          <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
            {selectedFiles.map((file, index) => (
              <div key={index} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '8px 12px',
                borderBottom: '1px solid #eee'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={16} />
                  <span>{file.name}</span>
                  <span style={{ color: '#666', fontSize: '12px' }}>
                    ({formatFileSize(file.size)})
                  </span>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#dc3545',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          
          <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="btn btn-primary"
            >
              {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length} Files`}
            </button>
            <button
              onClick={() => setSelectedFiles([])}
              className="btn btn-secondary"
              disabled={isUploading}
            >
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;