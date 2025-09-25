// Alternative: Direct upload to Supabase from frontend
// This bypasses your API for the actual file upload

async function uploadLargeZipDirectly(zipFile) {
  try {
    // 1. Upload directly to Supabase storage
    const fileName = `uploads/${Date.now()}-${zipFile.name}`;
    const { data, error } = await supabaseClient.storage
      .from('books')
      .upload(fileName, zipFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) throw error;

    // 2. Notify your API to process the uploaded file
    const response = await fetch('/api/shuspot-ingestion/process-uploaded-zip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supabase_path: fileName,
        original_filename: zipFile.name
      })
    });

    return await response.json();
  } catch (error) {
    console.error('Direct upload failed:', error);
    throw error;
  }
}