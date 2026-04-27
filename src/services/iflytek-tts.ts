/**
 * iFlyTek Online TTS Service
 * wss://tts-api-sg.xf-yun.com/v2/tts
 */

async function buildTtsUrl(apiKey: string, apiSecret: string): Promise<string> {
  const host = import.meta.env.VITE_IFLYTEK_TTS_HOST || 'tts-api-sg.xf-yun.com';
  const path = '/v2/tts';
  // Use the exact same date string in both signature and URL param
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

export interface TTSOptions {
  appId: string;
  apiKey: string;
  apiSecret: string;
  voice?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
}

export async function speakWithIFlyTek(text: string, opts: TTSOptions, signal?: AbortSignal): Promise<void> {
  const { appId, apiKey, apiSecret, voice = 'en_us_henry', speed = 45, pitch = 50, volume = 80 } = opts;
  const url = await buildTtsUrl(apiKey, apiSecret);
  console.log('🔊 TTS connecting...');

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const pcmChunks: Uint8Array[] = [];

    if (signal) signal.addEventListener('abort', () => { ws.close(); resolve(); });

    ws.onopen = () => {
      const textB64 = btoa(unescape(encodeURIComponent(text)));
      ws.send(JSON.stringify({
        common: { app_id: appId },
        business: { aue: 'raw', auf: 'audio/L16;rate=16000', vcn: voice, speed, pitch, volume, tte: 'UTF8' },
        data: { status: 2, text: textB64 },
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.code !== 0) {
          console.error('TTS error:', msg.code, msg.message);
          reject(new Error(`iFlyTek TTS error ${msg.code}: ${msg.message}`));
          ws.close();
          return;
        }
        if (msg.data?.audio) {
          const raw = atob(msg.data.audio);
          const bytes = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
          pcmChunks.push(bytes);
        }
        if (msg.data?.status === 2) {
          ws.close();
          playPcm(pcmChunks, signal).then(resolve).catch(reject);
        }
      } catch (e) { reject(e); ws.close(); }
    };

    ws.onerror = () => reject(new Error('TTS WebSocket error'));
    setTimeout(() => { if (ws.readyState !== WebSocket.CLOSED) { ws.close(); reject(new Error('TTS timeout')); } }, 20000);
  });
}

async function playPcm(chunks: Uint8Array[], signal?: AbortSignal): Promise<void> {
  if (!chunks.length) return;
  const total = chunks.reduce((s, c) => s + c.length, 0);
  const merged = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { merged.set(c, off); off += c.length; }

  const samples = merged.length / 2;
  const float32 = new Float32Array(samples);
  const view = new DataView(merged.buffer);
  for (let i = 0; i < samples; i++) float32[i] = view.getInt16(i * 2, true) / 32768;

  const ctx = new AudioContext({ sampleRate: 16000 });
  const buf = ctx.createBuffer(1, samples, 16000);
  buf.copyToChannel(float32, 0);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  return new Promise(res => {
    src.onended = () => { ctx.close(); res(); };
    if (signal) signal.addEventListener('abort', () => { src.stop(); ctx.close(); res(); });
    src.start();
  });
}
