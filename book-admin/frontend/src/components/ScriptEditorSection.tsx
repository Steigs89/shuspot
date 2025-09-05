import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../utils/api';
import './ScriptEditorSection.css';

interface ScriptResult {
  success: boolean;
  output: string;
  error: string;
  preview_data: any[];
  processed_count: number;
  sheets_uploaded: boolean;
  database_uploaded: boolean;
}

interface SampleScript {
  name: string;
  description: string;
  script: string;
}

const ScriptEditorSection: React.FC = () => {
  const [script, setScript] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<ScriptResult | null>(null);
  const [previewMode, setPreviewMode] = useState(true);
  const [uploadToSheets, setUploadToSheets] = useState(false);
  const [uploadToDatabase, setUploadToDatabase] = useState(false);
  const [sampleScripts, setSampleScripts] = useState<Record<string, SampleScript>>({});
  const [selectedSample, setSelectedSample] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    fetchSampleScripts();
  }, []);

  const fetchSampleScripts = async () => {
    try {
      const response = await fetch(getApiUrl('txt-ingestion/sample-scripts'));
      const data = await response.json();
      setSampleScripts(data);
    } catch (error) {
      console.error('Error fetching sample scripts:', error);
    }
  };

  const executeScript = async () => {
    if (!script.trim()) {
      alert('Please enter a script to execute');
      return;
    }

    setIsExecuting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('script', script);
      formData.append('preview_mode', previewMode.toString());
      formData.append('upload_to_sheets', uploadToSheets.toString());
      formData.append('upload_to_database', uploadToDatabase.toString());

      const response = await fetch(getApiUrl('txt-ingestion/execute-script'), {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        output: '',
        error: `Network error: ${error}`,
        preview_data: [],
        processed_count: 0,
        sheets_uploaded: false,
        database_uploaded: false
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const loadSampleScript = (key: string) => {
    if (sampleScripts[key]) {
      setScript(sampleScripts[key].script);
      setSelectedSample(key);
    }
  };

  const chatGptInstructions = `
# ChatGPT Instructions for Book Admin Tool

Use these variables in your script:
- \`root_directory\`: Upload directory path
- \`sheets_manager\`: Google Sheets manager (if connected)
- \`results\`: Array to store final book data
- \`preview_data\`: Array to store preview information
- \`os, json, re, glob, pathlib\`: Available Python modules

## Required Output Format:
\`\`\`python
# Add to results array for each book:
book_data = {
    "title": "Book Title",
    "author": "Author Name", 
    "genre": "Fiction/Non-Fiction/etc",
    "reading_level": "Grade K-2/3-5/6-8/9-12",
    "file_name": "book.pdf",
    "file_path": "/full/path/to/book.pdf",
    "description": "Book description",
    "series": "Series name",
    "isbn": "ISBN number",
    "publisher": "Publisher name",
    "notes": "Additional notes"
}
results.append(book_data)

# Add to preview_data for preview table:
preview_data.append({
    "folder": "Folder name",
    "title": book_data["title"],
    "author": book_data["author"],
    "file": book_data["file_name"],
    "status": "Processed/Error/etc"
})
\`\`\`

## Common Patterns:
- Parse metadata.txt files with key:value pairs
- Extract grade levels from folder names
- Handle different file structures dynamically
- Map subjects to genres
- Convert file paths for different upload destinations
`;

  return (
    <div className="script-editor-section">
      <div className="section-header">
        <h3>🐍 Python Script Editor</h3>
        <p>Execute custom Python scripts to parse and process book folders following ChatGPT instruction templates</p>
      </div>

      <div className="script-controls">
        <div className="sample-scripts">
          <h4>🚀 Sample Scripts</h4>
          <div className="sample-buttons">
            {Object.entries(sampleScripts).map(([key, sample]) => (
              <button
                key={key}
                onClick={() => loadSampleScript(key)}
                className={`sample-btn ${selectedSample === key ? 'active' : ''}`}
                title={sample.description}
              >
                {sample.name}
              </button>
            ))}
          </div>
        </div>

        <div className="instructions-toggle">
          <button 
            onClick={() => setShowInstructions(!showInstructions)}
            className="instructions-btn"
          >
            📋 {showInstructions ? 'Hide' : 'Show'} ChatGPT Instructions
          </button>
        </div>

        {showInstructions && (
          <div className="instructions-panel">
            <pre>{chatGptInstructions}</pre>
          </div>
        )}
      </div>

      <div className="script-editor">
        <div className="editor-header">
          <div className="editor-controls">
            <label>
              <input
                type="checkbox"
                checked={previewMode}
                onChange={(e) => setPreviewMode(e.target.checked)}
              />
              Preview Mode (don't upload)
            </label>
            <label>
              <input
                type="checkbox"
                checked={uploadToSheets}
                onChange={(e) => setUploadToSheets(e.target.checked)}
                disabled={previewMode}
              />
              Upload to Google Sheets
            </label>
            <label>
              <input
                type="checkbox"
                checked={uploadToDatabase}
                onChange={(e) => setUploadToDatabase(e.target.checked)}
                disabled={previewMode}
              />
              Upload to Local Database
            </label>
          </div>
        </div>

        <textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="Enter your Python script here... Use the sample scripts as templates or follow the ChatGPT instructions above."
          className="script-textarea"
          rows={15}
        />

        <div className="execute-section">
          <button
            onClick={executeScript}
            disabled={isExecuting || !script.trim()}
            className="execute-btn"
          >
            {isExecuting ? '⏳ Executing...' : '▶️ Execute Script'}
          </button>
          
          {previewMode && (
            <p className="preview-notice">
              🔍 Preview mode is ON - script will run but won't upload data
            </p>
          )}
        </div>
      </div>

      {result && (
        <div className="results-section">
          <div className="results-header">
            <h4>📊 Execution Results</h4>
            <div className="status-badges">
              <span className={`status-badge ${result.success ? 'success' : 'error'}`}>
                {result.success ? '✅ Success' : '❌ Error'}
              </span>
              <span className="count-badge">
                📚 {result.processed_count} books found
              </span>
              {result.sheets_uploaded && <span className="upload-badge">📊 Sheets Updated</span>}
              {result.database_uploaded && <span className="upload-badge">💾 Database Updated</span>}
            </div>
          </div>

          {result.preview_data.length > 0 && (
            <div className="preview-data">
              <h5>🔍 Preview Data</h5>
              <div className="preview-table-container">
                <table className="preview-table">
                  <thead>
                    <tr>
                      {Object.keys(result.preview_data[0]).map(key => (
                        <th key={key}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.preview_data.map((row, index) => (
                      <tr key={index}>
                        {Object.values(row).map((value, cellIndex) => (
                          <td key={cellIndex}>{String(value)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {result.output && (
            <div className="output-section">
              <h5>📝 Script Output</h5>
              <pre className="output-text">{result.output}</pre>
            </div>
          )}

          {result.error && (
            <div className="error-section">
              <h5>⚠️ Errors/Warnings</h5>
              <pre className="error-text">{result.error}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScriptEditorSection;
