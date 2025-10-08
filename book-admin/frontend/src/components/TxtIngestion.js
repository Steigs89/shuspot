import React, { useState } from 'react';
import { toast } from 'react-toastify';
import axios from 'axios';
import { getApiUrl } from '../utils/api';

const TxtIngestion = () => {
  const [pyRootDir, setPyRootDir] = useState('');
  const [pyCode, setPyCode] = useState('');
  const [pyPreview, setPyPreview] = useState([]);
  const [pyRunning, setPyRunning] = useState(false);
  const aiPromptDefault = `Generate Python code only (no markdown). Environment variables you MUST use:
- existing_books: list[dict] — snapshot of the local database
- results: list[dict] — records to upsert when Import runs (non-preview)
- preview_data: list[dict] — items to show in Plan (Preview)
Contract:
1) Read/modify records via existing_books (safe checks).
2) For preview: put changed items into preview_data.
3) For import: put items to upsert into results (or leave results empty and update existing_books in-place — backend will use it on Import).

Task: `;
  const [aiPrompt, setAiPrompt] = useState(aiPromptDefault);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [helperAuthor, setHelperAuthor] = useState('');
  const [helperField, setHelperField] = useState('');
  const [helperFrom, setHelperFrom] = useState('');
  const [helperTo, setHelperTo] = useState('');

  // Quick prompt suggestions
  const suggestions = [
    'Update every book\'s author to Jane Doe and put changed items in preview_data and results.',
    'Replace the word "kids" with "children" in description for all books; preview changed and upsert on import.',
    'Set genre to "Educational" when missing; preview changes and prepare results for import.',
  ];

  const aiPromptPlaceholder = '';

  // Extract Python code if the text contains Markdown fences or leading prose
  const extractPythonCode = (text) => {
    if (!text) return '';
    let t = String(text);
    // Prefer fenced code blocks
    const fenced = t.match(/```(?:python|py)?\n([\s\S]*?)```/i);
    if (fenced && fenced[1]) {
      return fenced[1].trim();
    }
    // Remove any stray triple backticks if present
    t = t.replace(/```/g, '').trim();
    // If there is leading explanation, drop lines until a pythonic line
    const lines = t.split(/\r?\n/);
    const looksPython = (l) => /^(\s*(import |from |def |class |for |while |if |elif |else:|try:|except |with |@|#|print\(|[A-Za-z_][A-Za-z0-9_]*\s*=|\"\"\"|\'\'\'))/.test(l);
    const startIdx = lines.findIndex(looksPython);
    if (startIdx > 0) {
      return lines.slice(startIdx).join('\n').trim();
    }
    return t;
  };

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
    // Sanitize any prose or markdown fences before sending to server
    const cleaned = extractPythonCode(pyCode);
    if (cleaned !== pyCode) {
      setPyCode(cleaned);
    }
    setPyRunning(true);
    try {
      const fd = new FormData();
      fd.append('script', cleaned);
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

  const generateFromPrompt = async (prompt) => {
    const promptText = (prompt || '').trim();
    if (!promptText) {
      toast.error('Please enter a prompt for the AI.');
      return;
    }
    setIsGeneratingScript(true);
    try {
      const pathsToTry = ['admin/generate-script', 'index/admin/generate-script'];
      let lastError = null;
      for (const p of pathsToTry) {
        try {
          const response = await axios.post(getApiUrl(p), { prompt: promptText });
          const data = response?.data;
          if (data && typeof data === 'object' && typeof data.script === 'string' && data.script.trim().length > 0) {
            if (data.script.startsWith('# An error occurred')) {
              toast.error(data.script);
              return;
            }
            const cleaned = extractPythonCode(data.script);
            setPyCode(cleaned);
            toast.success('Python script generated successfully!');
            return;
          } else {
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

  const handleGenerateScript = () => generateFromPrompt(aiPrompt);

  const makeHeader = () => (
    'Generate Python code only (no markdown). Environment variables you MUST use:\n' +
    '- existing_books: list[dict] — snapshot of the local database\n' +
    '- results: list[dict] — records to upsert when Import runs (non-preview)\n' +
    '- preview_data: list[dict] — items to show in Plan (Preview)\n' +
    'Contract:\n' +
    '1) Read/modify records via existing_books (safe checks).\n' +
    '2) For preview: put changed items into preview_data.\n' +
    '3) For import: put items to upsert into results (or leave results empty and update existing_books in-place — backend will use it on Import).'
  );

  const makeAuthorPrompt = (author) => (
    `${makeHeader()}\n\nTask: Set author for every book to "${author}".\nRequirements:\n` +
    `- Update existing_books in-place (b['author'] = '${author}')\n` +
    `- preview_data.extend(existing_books)\n` +
    `- results.extend(existing_books)`
  );

  const makeReplacePrompt = (field, fromVal, toVal) => (
    `${makeHeader()}\n\nTask: Replace all occurrences of "${fromVal}" with "${toVal}" in field "${field}" for every book (if field exists and is a string).\nRequirements:\n` +
    `- Safely check field existence and type\n` +
    `- Collect changed items into preview_data\n` +
    `- results.extend(changed_items)`
  );

  // Removed safe-template code paths to keep the UI focused on AI + core actions

  return (
    <div className="shuspot-ingestion">
      <div className="ingestion-header">
        <h3>TXT Ingestion — AI</h3>
      </div>
      <div className="parse-results ai-card">
        <div className="ai-hero">
          <div className="ai-icon">🤖</div>
          <h2 className="ai-title">Generate Python Script with AI</h2>
          <div className="ai-subtitle">Describe what you want to change or parse — the AI will craft Python tailored to your library.</div>
          <div className="badge">Beta</div>
        </div>
        <div className="tip" style={{ textAlign: 'center' }}>Tip: Be specific. Include goals, constraints, and an example.</div>
        <div className="chips">
          {suggestions.map((s,i)=> (
            <button key={i} className="chip" onClick={()=> setAiPrompt(s)}>{s}</button>
          ))}
        </div>
        <div className="db-helper">
          <div className="helper-title">DB Prompt Helper</div>
          <div className="helper-row">
            <label>Set all authors to</label>
            <input className="input" placeholder="e.g., Jane" value={helperAuthor} onChange={(e)=>setHelperAuthor(e.target.value)} />
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-outline" onClick={()=> setAiPrompt(makeAuthorPrompt(helperAuthor || 'Jane'))}>Fill Prompt</button>
              <button className="btn btn-primary" disabled={isGeneratingScript} onClick={()=> generateFromPrompt(makeAuthorPrompt(helperAuthor || 'Jane'))}>Fill + Generate</button>
            </div>
          </div>
          <div className="helper-row">
            <label>Replace in field</label>
            <input className="input" placeholder="field (e.g., description)" style={{ minWidth: 180 }} value={helperField} onChange={(e)=>setHelperField(e.target.value)} />
            <input className="input" placeholder="from" value={helperFrom} onChange={(e)=>setHelperFrom(e.target.value)} />
            <input className="input" placeholder="to" value={helperTo} onChange={(e)=>setHelperTo(e.target.value)} />
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-outline" onClick={()=> setAiPrompt(makeReplacePrompt(helperField || 'description', helperFrom || 'foo', helperTo || 'bar'))}>Fill Prompt</button>
              <button className="btn btn-primary" disabled={isGeneratingScript} onClick={()=> generateFromPrompt(makeReplacePrompt(helperField || 'description', helperFrom || 'foo', helperTo || 'bar'))}>Fill + Generate</button>
            </div>
          </div>
        </div>
        <div className="task-hint"><strong>Task:</strong> Describe the change you want after the contract starter below.</div>
        <textarea
          className="textarea"
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder={aiPromptPlaceholder}
        />
        <div className="ai-actions">
          <button className={`btn btn-primary btn-large ${isGeneratingScript ? 'loading' : ''}`} disabled={isGeneratingScript} onClick={handleGenerateScript}>
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
          placeholder="# Paste Python here. For DB edits, use: existing_books (read/modify), preview_data (preview), results (import)."
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button className="btn btn-outline" disabled={pyRunning} onClick={() => runPastedPython({})}>Plan (Preview)</button>
          <button className="btn btn-primary" disabled={pyRunning} onClick={() => runPastedPython({ toDb: true })}>Import (Upsert)</button>
        </div>
        {/* Simplified UI: keep core Plan/Import; optional helpers remain above */}
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
        .shuspot-ingestion { padding: 20px; background: #f8f9fa; border-radius: 8px; }
        .ingestion-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
        .title { display: flex; align-items: center; gap: 8px; margin: 0; }
        .badge { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; background: linear-gradient(135deg, #fde68a, #fca5a5); color: #6b4423; padding: 4px 8px; border-radius: 999px; border: 1px solid rgba(0,0,0,0.06); }
        .gradient-text { background: linear-gradient(135deg, #0ea5e9, #6366f1); -webkit-background-clip: text; background-clip: text; color: transparent; }
        .btn { display: flex; align-items: center; padding: 8px 16px; border: none; border-radius: 4px; font-size: 14px; cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease, color 0.15s ease; }
        .btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .btn-primary { background-color: #007bff; color: white; }
        .btn-primary:hover:not(:disabled) { background-color: #0069d9; transform: translateY(-1px); box-shadow: 0 6px 14px rgba(0, 123, 255, 0.22); }
        .btn-large { padding: 12px 22px; font-size: 16px; border-radius: 8px; }
        .btn-outline { background-color: white; color: #007bff; border: 1px solid #007bff; }
        .btn-outline:hover:not(:disabled) { background-color: #f0f7ff; border-color: #0069d9; }
        .btn-success { background-color: #28a745; color: white; }
        .btn-secondary { background-color: #6c757d; color: white; }
        .parse-results { background: #ffffff; padding: 16px 16px 20px; border-radius: 10px; margin: 16px 0; border: 1px solid #e9ecef; box-shadow: 0 8px 24px rgba(16, 24, 40, 0.06); }
        .ai-card { position: relative; overflow: hidden; }
        .ai-card::before { content: ""; position: absolute; inset: -40% -10% auto -10%; height: 220px; background: radial-gradient(60% 60% at 50% 50%, rgba(99,102,241,0.18), rgba(14,165,233,0.12), transparent 70%); pointer-events: none; }
        .ai-hero { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 8px 0 12px; }
        .ai-icon { font-size: 28px; }
        .ai-title { margin: 0; font-size: 24px; line-height: 1.2; background: linear-gradient(135deg, #0ea5e9, #6366f1); -webkit-background-clip: text; background-clip: text; color: transparent; font-weight: 800; letter-spacing: -0.01em; }
        .ai-subtitle { color: #475569; font-size: 13px; max-width: 720px; }
        .chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin: 8px 0 12px; }
        .chip { border: 1px dashed #94a3b8; color: #334155; background: #f8fafc; border-radius: 999px; padding: 6px 10px; font-size: 12px; cursor: pointer; }
        .chip:hover { background: #eef2ff; border-style: solid; }
        .ai-actions { display: flex; justify-content: center; margin-top: 8px; }
        .textarea { width: 100%; min-height: 96px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 13px; padding: 10px 12px; border-radius: 8px; border: 1px solid #d0d5dd; background: #f8fafc; color: #0f172a; outline: none; transition: box-shadow 0.15s ease, border-color 0.15s ease; }
        .textarea:focus { border-color: #93c5fd; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25); background: #ffffff; }
        .code-editor { width: 100%; min-height: 200px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; font-size: 13px; padding: 12px 14px; border-radius: 8px; border: 1px solid #d0d5dd; background: #f8fafc; color: #0f172a; outline: none; transition: box-shadow 0.15s ease, border-color 0.15s ease; }
        .code-editor:focus { border-color: #a78bfa; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25); background: #ffffff; }
        .tip { background: #f1f5f9; border-left: 3px solid #0ea5e9; color: #334155; font-size: 12px; padding: 8px 10px; border-radius: 6px; margin: 8px 0 12px; }
        .help-text { color: #6c757d; font-size: 12px; margin-top: 4px; }
        .db-helper { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; margin: 10px 0 12px; }
        .helper-title { font-size: 12px; color: #334155; letter-spacing: .04em; text-transform: uppercase; margin-bottom: 8px; }
        .helper-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
        .input { height: 32px; padding: 6px 10px; border-radius: 6px; border: 1px solid #cbd5e1; background: #ffffff; font-size: 13px; outline: none; }
        .input:focus { border-color: #93c5fd; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.18); }
        .task-hint { font-size: 12px; color: #475569; margin: 6px 2px 0; }
      `}</style>
    </div>
  );
};

export default TxtIngestion;