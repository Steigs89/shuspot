import React, { useState } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { getApiUrl } from '../utils/api';

const TxtIngestion = () => {
  const [pyRootDir, setPyRootDir] = useState('');
  const [pyCode, setPyCode] = useState('');
  const [pyPreview, setPyPreview] = useState([]);
  const [pyRunning, setPyRunning] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  const uploadScriptZip = async (file) => {
    try {
      const fd = new FormData();
      fd.append('zip_file', file);
      const res = await fetch(getApiUrl('txt-ingestion/upload-zip'), { method: 'POST', body: fd });
      const data = await res.json();
      if (data.ok) {
        setPyRootDir(data.root_directory);
        toast.success('ZIP uploaded. Root set for script running.');
      } else {
        toast.error(data.detail || 'ZIP upload failed');
      }
    } catch (e) {
      toast.error(`ZIP upload error: ${e.message || e}`);
    }
  };

  const runPastedPython = async ({ toDb = false, replace = false } = {}) => {
    if (!pyCode.trim()) {
      toast.error('Paste a Python script first');
      return;
    }
    setPyRunning(true);
    try {
      const fd = new FormData();
      fd.append('script', pyCode);
      fd.append('preview_mode', (!toDb && !replace).toString());
      fd.append('upload_to_database', (!!toDb).toString());
      fd.append('root_directory', pyRootDir || '');

      const res = await fetch(getApiUrl('txt-ingestion/execute-script'), { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        setPyPreview(data.preview_data || []);
        toast.success(`Script ran. ${data.processed_count} items processed.`);
        if (toDb || replace) {
          // If replace desired, we can provide a separate server flag later; for now upsert path
          // Trigger a grid refresh via a custom event if available
          // window.dispatchEvent(new CustomEvent('refreshBooks'));
        }
      } else {
        toast.error(data.error || 'Script failed');
      }
    } catch (e) {
      toast.error(`Run error: ${e.message || e}`);
    } finally {
      setPyRunning(false);
    }
  };

  const handleGenerateScript = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please enter a prompt for the AI.');
      return;
    }
    setIsGeneratingScript(true);
    try {
      const pathsToTry = ['admin/generate-script', 'index/admin/generate-script'];
      let lastError = null;
      for (const p of pathsToTry) {
        try {
          const response = await axios.post(getApiUrl(p), { prompt: aiPrompt });
          const data = response?.data;
          if (data && typeof data === 'object' && typeof data.script === 'string' && data.script.trim().length > 0) {
            if (data.script.startsWith('# An error occurred')) {
              toast.error(data.script);
              return;
            }
            setPyCode(data.script);
            toast.success('Python script generated successfully!');
            return;
          } else {
            // Not a valid payload; log and continue to next path
            console.warn('AI generate-script unexpected response:', data);
            lastError = new Error('Unexpected response payload (no script field).');
          }
        } catch (e) {
          lastError = e;
        }
      }
      const msg = lastError?.response?.data?.detail || lastError?.message || 'Failed to generate script (no valid response).';
      toast.error(msg);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  return (
    <div className="shuspot-ingestion">
      <div className="ingestion-header">
        <h3>TXT Ingestion — AI</h3>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6c757d' }} title="Build identifier">
          Build: {process.env.REACT_APP_BUILD_ID || 'dev'}
        </span>
      </div>
      <div className="parse-results">
        <div className="section-header">
          <h4 className="title"><span>🤖</span><span className="gradient-text">Generate Python Script with AI</span></h4>
          <span className="badge">Beta</span>
        </div>
        <p className="help-text" style={{ marginBottom: '12px' }}>
          Describe the script you want to generate. The AI will create Python code tailored to your library and show it below.
        </p>
        <div className="tip">Tip: Be specific. Include goals, constraints, and example folder names.</div>
        <textarea
          className="textarea"
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="e.g., Rename all 'cover.jpg' to 'front-cover.jpg' within each book folder under 'Books/'. Skip folders without images."
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className={`btn btn-primary ${isGeneratingScript ? 'loading' : ''}`} disabled={isGeneratingScript} onClick={handleGenerateScript}>
            {isGeneratingScript ? 'Generating…' : '✨ Generate with AI'}
          </button>
        </div>
      </div>

      <div className="parse-results">
        <div className="section-header">
          <h4 className="title">Advanced Tools</h4>
        </div>
        <h5 style={{ marginTop: 8, marginBottom: 8 }}>Run Python on Uploaded ZIP (TXT Ingestion)</h5>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
          <input type="file" accept=".zip" onChange={(e) => e.target.files?.[0] && uploadScriptZip(e.target.files[0])} />
          {pyRootDir && <span style={{ fontSize: 12, color: '#555' }}>Root: {pyRootDir}</span>}
        </div>
        <textarea
          className="code-editor"
          value={pyCode}
          onChange={(e) => setPyCode(e.target.value)}
          placeholder="# Paste your GPT-generated Python here. Use variables: root_directory, results, preview_data."
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="btn btn-outline" disabled={pyRunning} onClick={() => runPastedPython({})}>Plan (Preview)</button>
          <button className="btn btn-primary" disabled={pyRunning} onClick={() => runPastedPython({ toDb: true })}>Import (Upsert)</button>
        </div>
        {pyPreview?.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <strong>Preview (first {pyPreview.length} rows)</strong>
            <ul>
              {pyPreview.map((p, i) => (
                <li key={i}>{p.folder} — {p.title} — {p.author} — {p.file} — {p.status}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <style jsx>{`
        .shuspot-ingestion {
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .ingestion-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0;
        }

        .badge {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          background: linear-gradient(135deg, #fde68a, #fca5a5);
          color: #6b4423;
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid rgba(0,0,0,0.06);
        }

        .gradient-text {
          background: linear-gradient(135deg, #0ea5e9, #6366f1);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .btn {
          display: flex;
          align-items: center;
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease, color 0.15s ease;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background-color: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background-color: #0069d9;
          transform: translateY(-1px);
          box-shadow: 0 6px 14px rgba(0, 123, 255, 0.22);
        }

        .btn-outline:hover:not(:disabled) {
          background-color: #f0f7ff;
          border-color: #0069d9;
        }

        .btn-success {
          background-color: #28a745;
          color: white;
        }

        .btn-outline {
          background-color: white;
          color: #007bff;
          border: 1px solid #007bff;
        }

        .btn-secondary {
          background-color: #6c757d;
          color: white;
        }

        .parse-results {
          background: #ffffff;
          padding: 16px 16px 20px;
          border-radius: 10px;
          margin: 16px 0;
          border: 1px solid #e9ecef;
          box-shadow: 0 8px 24px rgba(16, 24, 40, 0.06);
        }

        .textarea {
          width: 100%;
          min-height: 96px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 13px;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #d0d5dd;
          background: #f8fafc;
          color: #0f172a;
          outline: none;
          transition: box-shadow 0.15s ease, border-color 0.15s ease;
        }

        .textarea:focus {
          border-color: #93c5fd;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
          background: #ffffff;
        }

        .code-editor {
          width: 100%;
          min-height: 200px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 13px;
          padding: 12px 14px;
          border-radius: 8px;
          border: 1px solid #d0d5dd;
          background: #f8fafc;
          color: #0f172a;
          outline: none;
          transition: box-shadow 0.15s ease, border-color 0.15s ease;
        }

        .code-editor:focus {
          border-color: #a78bfa;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
          background: #ffffff;
        }

        .tip {
          background: #f1f5f9;
          border-left: 3px solid #0ea5e9;
          color: #334155;
          font-size: 12px;
          padding: 8px 10px;
          border-radius: 6px;
          margin: 8px 0 12px;
        }

        .help-text {
          color: #6c757d;
          font-size: 12px;
          margin-top: 4px;
        }

      `}</style>
    </div>
  );
};

export default TxtIngestion;