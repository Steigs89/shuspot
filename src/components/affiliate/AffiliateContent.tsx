import { useState } from 'react';
import { Download } from 'lucide-react';
import { ContentAsset } from './types';
import { useAffLang } from './AffiliateLanguageContext';

interface Props {
  assets: ContentAsset[];
}

const PLATFORMS = [
  { id: 'all', label: 'All' },
  { id: 'xhs', label: 'XHS' },
  { id: 'douyin', label: 'Douyin' },
  { id: 'wechat', label: 'WeChat' },
  { id: 'bilibili', label: 'Bilibili' },
];

const TYPE_ICONS: Record<string, string> = {
  banner: '🖼️',
  post: '📝',
  video_thumbnail: '🎬',
  story: '📱',
};

export default function AffiliateContent({ assets }: Props) {
  const [platform, setPlatform] = useState('all');
  const { t } = useAffLang();
  const filtered = platform === 'all' ? assets : assets.filter(a => a.platform === platform || a.platform === 'all');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-gray-800">📁 {t('Content Library')}</h1>
      <p className="text-sm text-gray-500">{t('Download ready-made assets to promote ShuSpot on your channels.')}</p>
      <div className="flex flex-wrap gap-2">
        {PLATFORMS.map(p => (
          <button
            key={p.id}
            onClick={() => setPlatform(p.id)}
            className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
              platform === p.id
                ? 'bg-brand-pink text-white shadow-md'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-brand-pink hover:text-brand-pink'
            }`}
          >
            {t(p.label)}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map(asset => (
          <div key={asset.id} className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-lg hover:-translate-y-1 transition-all group">
            <div className="aspect-[4/3] bg-gradient-to-br from-brand-pink/10 to-brand-blue/10 flex items-center justify-center">
              <span className="text-5xl opacity-50">{TYPE_ICONS[asset.type] || '📄'}</span>
            </div>
            <div className="p-3">
              <p className="text-sm font-bold text-gray-800 truncate">{t(asset.title)}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-400 capitalize">{t(asset.type.replace('_', ' '))}</span>
                <button className="bg-brand-blue text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 hover:brightness-110 transition-all opacity-0 group-hover:opacity-100">
                  <Download className="w-3 h-3" /> {t('Get')}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
