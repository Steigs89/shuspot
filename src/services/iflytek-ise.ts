/**
 * iFlyTek ISE (Pronunciation Assessment) Service
 * wss://ise-api-sg.xf-yun.com/v2/ise
 *
 * Protocol (from official docs):
 * Frame 1: common + business (cmd="ssb") + data(status=0, NO audio)
 * Audio frames: business(cmd="auw", aus=1/2/4) + data(status=1, audio chunk)
 * Last frame: aus=4, data.status=2
 */

export interface WordScore {
  word: string;
  score: number;
  status: 'good' | 'needs-practice' | 'mispronounced' | 'missed';
}

export interface ISEResult {
  overallScore: number;
  accuracy: number;
  fluency: number;
  completeness: number;
  words: WordScore[];
  transcript: string;
}

interface ISEConfig {
  appId: string;
  apiKey: string;
  apiSecret: string;
  language?: string;
  category?: string;
}

async function buildAuthUrl(apiKey: string, apiSecret: string, host: string, path: string): Promise<string> {
  const date = new Date().toUTCString();
  const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(apiSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signatureOrigin));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)));
  const authOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${sigB64}"`;
  const authorization = btoa(authOrigin);
  return `wss://${host}${path}?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=${encodeURIComponent(host)}`;
}

async function blobToPcmChunks(audioBlob: Blob): Promise<string[]> {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioCtx = new AudioContext({ sampleRate: 16000 });
  const decoded = await audioCtx.decodeAudioData(arrayBuffer);
  await audioCtx.close();

  const raw = decoded.getChannelData(0);
  const mono = decoded.numberOfChannels > 1
    ? (() => { const r = decoded.getChannelData(1); return Float32Array.from(raw, (v, i) => (v + r[i]) / 2); })()
    : raw;

  const pcm = new Int16Array(mono.length);
  for (let i = 0; i < mono.length; i++) {
    pcm[i] = Math.max(-32768, Math.min(32767, Math.round(mono[i] * 32767)));
  }

  // Max 1280 bytes per chunk (640 int16 samples) as per docs
  const CHUNK_BYTES = 1280;
  const bytes = new Uint8Array(pcm.buffer);
  const chunks: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK_BYTES) {
    const slice = bytes.slice(i, i + CHUNK_BYTES);
    let bin = '';
    for (let j = 0; j < slice.length; j++) bin += String.fromCharCode(slice[j]);
    chunks.push(btoa(bin));
  }
  return chunks;
}

function parseISEResponse(xmlStr: string): Partial<ISEResult> {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlStr, 'text/xml');

    // The top-level scored element is inside rec_paper
    // querySelectorAll returns in document order — first match is the outer one
    const roots = doc.querySelectorAll('read_sentence, read_chapter, read_word');
    // Pick the one with the highest total_score attribute (the summary node)
    let root: Element | null = null;
    let bestScore = -1;
    roots.forEach(el => {
      const s = parseFloat(el.getAttribute('total_score') || '-1');
      if (s > bestScore) { bestScore = s; root = el; }
    });
    if (!root) return {};

    const overallScore = parseFloat((root as Element).getAttribute('total_score') || '0');
    const accuracy = parseFloat((root as Element).getAttribute('accuracy_score') || '0');
    const fluency = parseFloat((root as Element).getAttribute('fluency_score') || '0');
    const completeness = parseFloat(
      (root as Element).getAttribute('integrity_score') ||
      (root as Element).getAttribute('complete_score') || '0'
    );

    const words: WordScore[] = [];
    doc.querySelectorAll('word').forEach(node => {
      const content = node.getAttribute('content') || '';
      const score = parseFloat(node.getAttribute('total_score') || '0');
      const dp = parseInt(node.getAttribute('dp_message') || '0');
      let status: WordScore['status'] = 'good';
      if (dp === 16) status = 'missed';
      else if (score < 60) status = 'mispronounced';
      else if (score < 80) status = 'needs-practice';
      if (content && content !== 'sil' && content !== 'fil') {
        words.push({ word: content, score: Math.round(score), status });
      }
    });

    console.log('📊 ISE parsed scores:', { overallScore, accuracy, fluency, completeness, wordCount: words.length });
    return { overallScore: Math.round(overallScore), accuracy: Math.round(accuracy), fluency: Math.round(fluency), completeness: Math.round(completeness), words };
  } catch (e) {
    console.error('ISE parse error:', e);
    return {};
  }
}

export async function assessPronunciation(audioBlob: Blob, referenceText: string, config: ISEConfig): Promise<ISEResult> {
  const { appId, apiKey, apiSecret, language = 'en_us', category = 'read_sentence' } = config;
  const host = import.meta.env.VITE_IFLYTEK_ISE_HOST || 'ise-api-sg.xf-yun.com';
  const path = '/v2/ise';

  const [url, audioChunks] = await Promise.all([
    buildAuthUrl(apiKey, apiSecret, host, path),
    blobToPcmChunks(audioBlob),
  ]);

  console.log(`📡 ISE: ${audioChunks.length} chunks → ${host}${path}`);

  // English text must be wrapped in [content] node
  const formattedText = `\uFEFF[content]\n${referenceText.trim()}`;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    let resultXml = '';

    ws.onopen = () => {
      // Frame 1: ssb — business params only, NO audio
      ws.send(JSON.stringify({
        common: { app_id: appId },
        business: {
          cmd: 'ssb',
          sub: 'ise',
          ent: language === 'en_us' ? 'en_vip' : 'cn_vip',
          category,
          aue: 'raw',
          auf: 'audio/L16;rate=16000',
          text: formattedText,
          tte: 'utf-8',
          ttp_skip: true,
          ise_unite: '1',
          rst: 'entirety',
          extra_ability: 'multi_dimension',
        },
        data: { status: 0 },
      }));

      // Audio frames: cmd=auw, aus=1 (first), aus=2 (middle), aus=4 (last)
      // Note: per iFlyTek docs, the audio field inside data is named "data", not "audio"
      for (let i = 0; i < audioChunks.length; i++) {
        const isFirst = i === 0;
        const isLast = i === audioChunks.length - 1;
        const aus = isFirst ? 1 : isLast ? 4 : 2;
        const status = isLast ? 2 : 1;
        ws.send(JSON.stringify({
          business: { cmd: 'auw', aus },
          data: { status, encoding: 'raw', data: audioChunks[i] },
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        console.log('📨 ISE:', msg.code, msg.message || '');
        if (msg.code !== 0) { reject(new Error(`iFlyTek ISE error ${msg.code}: ${msg.message}`)); ws.close(); return; }
        if (msg.data?.data) resultXml += atob(msg.data.data);
        if (msg.data?.status === 2) {
          ws.close();
          const parsed = parseISEResponse(resultXml);
          resolve({
            overallScore: parsed.overallScore ?? 0,
            accuracy: parsed.accuracy ?? 0,
            fluency: parsed.fluency ?? 0,
            completeness: parsed.completeness ?? 0,
            words: parsed.words ?? [],
            transcript: '',
          });
        }
      } catch (e) { reject(e); ws.close(); }
    };

    ws.onerror = () => reject(new Error('ISE WebSocket error'));
    setTimeout(() => { if (ws.readyState !== WebSocket.CLOSED) { ws.close(); reject(new Error('ISE timeout')); } }, 30000);
  });
}
