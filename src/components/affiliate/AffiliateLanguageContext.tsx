import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

interface AffLangContextType {
  lang: 'en' | 'zh';
  t: (text: string) => string;
  switchLanguage: () => void;
  isTranslating: boolean;
}

const AffLangContext = createContext<AffLangContextType>({
  lang: 'en',
  t: (s) => s,
  switchLanguage: () => {},
  isTranslating: false,
});

export const useAffLang = () => useContext(AffLangContext);

// Simple component to wrap translatable text
export function T({ children }: { children: string }) {
  const { t } = useAffLang();
  return <>{t(children)}</>;
}

export function AffiliateLanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<'en' | 'zh'>('en');
  const [cache, setCache] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [pending, setPending] = useState<string[]>([]);

  // Batch translate pending strings
  useEffect(() => {
    if (lang !== 'zh' || pending.length === 0) return;
    const missing = pending.filter(t => !cache[t]);
    if (missing.length === 0) { setPending([]); return; }

    const libreUrl = import.meta.env.VITE_LIBRETRANSLATE_URL;
    if (!libreUrl) return;

    setIsTranslating(true);
    Promise.all(
      missing.map(text =>
        fetch(`${libreUrl}/translate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ q: text, source: 'en', target: 'zh', format: 'text' }),
        })
          .then(r => r.json())
          .then(d => [text, d.translatedText || text] as [string, string])
          .catch(() => [text, text] as [string, string])
      )
    ).then(results => {
      setCache(prev => ({ ...prev, ...Object.fromEntries(results) }));
      setPending([]);
    }).finally(() => setIsTranslating(false));
  }, [pending, lang, cache]);

  const switchLanguage = useCallback(() => {
    setLang(prev => prev === 'en' ? 'zh' : 'en');
  }, []);

  const t = useCallback((text: string) => {
    if (lang === 'en') return text;
    if (cache[text]) return cache[text];
    // Queue for batch translation
    setPending(prev => prev.includes(text) ? prev : [...prev, text]);
    return text; // Return English until translated
  }, [lang, cache]);

  return (
    <AffLangContext.Provider value={{ lang, t, switchLanguage, isTranslating }}>
      {children}
    </AffLangContext.Provider>
  );
}
