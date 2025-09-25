// CHUNKED UPLOAD SOLUTION
// This approach uploads the file in smaller chunks to avoid timeouts

class ChunkedUploader {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.chunkSize = 50 * 1024 * 1024; // 50MB chunks
  }

  async uploadLargeZip(file, onProgress = () => {}) {
    const totalChunks = Math.ceil(file.size / this.chunkSize);
    const uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`📦 Starting chunked upload: ${totalChunks} chunks of ${this.chunkSize / 1024 / 1024}MB each`);

    try {
      // Upload each chunk to Supabase storage
      const chunks = [];
      for (let i = 0; i < totalChunks; i++) {
        const start = i * this.chunkSize;
        const end = Math.min(start + this.chunkSize, file.size);
        const chunk = file.slice(start, end);
        
        const chunkName = `temp-chunks/${uploadId}/chunk-${i.toString().padStart(4, '0')}`;
        
        console.log(`📤 Uploading chunk ${i + 1}/${totalChunks} (${chunk.size} bytes)`);
        
        const { data, error } = await this.supabase.storage
          .from('books')
          .upload(chunkName, chunk, { upsert: true });
          
        if (error) throw error;
        
        chunks.push(chunkName);
        onProgress({ chunk: i + 1, total: totalChunks, percent: ((i + 1) / totalChunks) * 100 });
      }

      // Notify API to reassemble and process the chunks
      const response = await fetch('/api/shuspot-ingestion/process-chunked-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upload_id: uploadId,
          chunks: chunks,
          original_filename: file.name,
          total_size: file.size
        })
      });

      if (!response.ok) {
        throw new Error(`Processing failed: ${response.statusText}`);
      }

      return await response.json();
      
    } catch (error) {
      // Clean up chunks on error
      console.error('Upload failed, cleaning up chunks...');
      // Note: Add cleanup logic here
      throw error;
    }
  }
}

// Usage in your component:
async function handleChunkedUpload(zipFile) {
  const uploader = new ChunkedUploader(supabaseClient);
  
  try {
    setUploadStatus('Starting chunked upload...');
    
    const result = await uploader.uploadLargeZip(zipFile, (progress) => {
      setUploadProgress(progress.percent);
      setUploadStatus(`Uploading chunk ${progress.chunk}/${progress.total}...`);
    });
    
    setUploadStatus('Upload complete! Processing in background...');
    console.log('Upload result:', result);
    
  } catch (error) {
    console.error('Chunked upload failed:', error);
    setUploadStatus('Upload failed');
  }
}