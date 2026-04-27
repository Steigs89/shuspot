import { Menu, LogOut, Bell } from 'lucide-react';
import { AffiliateUser } from './types';
import { useAffLang } from './AffiliateLanguageContext';

interface Props {
  user: AffiliateUser;
  onToggleSidebar: () => void;
  onLogout: () => void;
}

export default function AffiliateNavbar({ user, onToggleSidebar, onLogout }: Props) {
  const { lang, switchLanguage, isTranslating, t } = useAffLang();

  return (
    <nav className="bg-white border-b border-gray-100 px-4 md:px-8 py-3 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="md:hidden p-1 text-gray-500">
          <Menu className="w-6 h-6" />
        </button>
        <p className="text-sm text-gray-400 font-medium hidden md:block">
          {t('Hey')} <span className="text-gray-800 font-bold">{user.name}</span>! {t("We're on a mission to help creators like you grow")} 🚀
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={switchLanguage}
          disabled={isTranslating}
          className="px-3 py-1.5 rounded-full text-xs font-bold border transition-all bg-gray-50 border-gray-200 hover:border-brand-pink hover:text-brand-pink"
        >
          {isTranslating ? '...' : lang === 'en' ? '中文' : 'EN'}
        </button>
        <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-brand-pink rounded-full" />
        </button>
        <div className="flex items-center gap-2.5 pl-4 border-l border-gray-100">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-pink to-brand-blue text-white font-black text-sm flex items-center justify-center shadow-md">
            {user.avatar}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold text-gray-800 leading-tight">{user.name}</p>
            <p className="text-[10px] text-gray-400 capitalize">{user.tier} tier</p>
          </div>
        </div>
        <button onClick={onLogout} className="text-gray-400 hover:text-brand-pink text-sm flex items-center gap-1 transition-colors">
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </nav>
  );
}
