import { AffiliateUser } from './types';
import { useAffLang } from './AffiliateLanguageContext';

type Page = 'dashboard' | 'earnings' | 'content' | 'settings';

interface Props {
  user: AffiliateUser;
  activePage: Page;
  onNavigate: (page: Page) => void;
  open: boolean;
  onClose: () => void;
}

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'earnings', label: 'Earnings & Payouts', icon: '💰' },
  { id: 'content', label: 'Content Library', icon: '📁' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

const TIER_COLORS: Record<string, string> = {
  bronze: 'from-amber-500 to-amber-300',
  silver: 'from-gray-300 to-gray-100',
  gold: 'from-yellow-400 to-yellow-200',
};

export default function AffiliateSidebar({ user, activePage, onNavigate, open, onClose }: Props) {
  const { t } = useAffLang();

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />}
      <aside className={`
        fixed md:sticky top-0 left-0 z-40 md:z-auto
        w-64 h-screen bg-[#353a52] text-white
        flex flex-col transition-transform duration-300
        ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="px-6 py-5 border-b border-white/10">
          <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-brand-pink to-brand-blue bg-clip-text text-transparent">ShuSpot</span>
          <p className="text-[10px] text-white/40 font-semibold uppercase tracking-widest mt-0.5">{t('Affiliate Portal')}</p>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-3">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => { onNavigate(item.id); onClose(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all ${
                activePage === item.id
                  ? 'bg-brand-pink/20 text-brand-pink font-black'
                  : 'text-white/80 hover:bg-white/10 hover:text-white font-bold'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {t(item.label)}
            </button>
          ))}
        </nav>
        <div className="px-4 pb-5">
          <div className={`bg-gradient-to-br ${TIER_COLORS[user.tier]} rounded-2xl p-4 text-center`}>
            <p className="text-[10px] font-bold text-gray-800/60 uppercase tracking-widest">{t('Current Tier')}</p>
            <p className="text-xl font-black text-gray-800 capitalize mt-0.5">{t(user.tier)}</p>
            <div className="mt-2 h-2 bg-black/10 rounded-full overflow-hidden">
              <div className="h-full bg-white/80 rounded-full" style={{ width: `${(user.tierProgress / user.tierTarget) * 100}%` }} />
            </div>
            <p className="text-[10px] text-gray-800/50 mt-1 font-semibold">{user.tierProgress} / {user.tierTarget} {t('conversions')}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
