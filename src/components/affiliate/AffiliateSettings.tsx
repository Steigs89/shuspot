import { AffiliateUser } from './types';
import { useAffLang } from './AffiliateLanguageContext';

interface Props {
  user: AffiliateUser;
}

export default function AffiliateSettings({ user }: Props) {
  const { t } = useAffLang();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-gray-800">⚙️ {t('Settings')}</h1>
      <div className="bg-white rounded-2xl p-6 shadow-md space-y-4">
        <h2 className="text-lg font-black text-gray-800">👤 {t('Profile')}</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">{t('Full Name')}</label>
            <input defaultValue={user.name} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/50" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">{t('Email')}</label>
            <input defaultValue={user.email} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/50" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">{t('Payment Method')}</label>
            <select className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/50 bg-white">
              <option>{t('WeChat Pay')}</option>
              <option>{t('Alipay')}</option>
              <option>{t('Bank Transfer')}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">{t('Payment Account')}</label>
            <input placeholder={t('Account number or ID')} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/50" />
          </div>
        </div>
        <button className="bg-brand-pink text-white px-6 py-2 rounded-lg font-bold text-sm hover:brightness-110 transition-all">
          {t('Save Changes')}
        </button>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-md space-y-4">
        <h2 className="text-lg font-black text-gray-800">🔔 {t('Notifications')}</h2>
        {[
          { label: t('New conversion alerts'), desc: t('Get notified when someone converts') },
          { label: t('Weekly summary email'), desc: t('Performance recap every Monday') },
          { label: t('Payout notifications'), desc: t('When payouts are processed') },
        ].map(n => (
          <div key={n.label} className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-bold text-gray-800">{n.label}</p>
              <p className="text-xs text-gray-400">{n.desc}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-10 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-brand-pink/50 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-pink" />
            </label>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-md space-y-4">
        <h2 className="text-lg font-black text-gray-800">🔒 {t('Change Password')}</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">{t('Current Password')}</label>
            <input type="password" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/50" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">{t('New Password')}</label>
            <input type="password" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/50" />
          </div>
        </div>
        <button className="bg-gray-800 text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-gray-700 transition-colors">
          {t('Update Password')}
        </button>
      </div>
      <div className="bg-brand-blue/10 border-2 border-brand-blue/30 rounded-2xl p-6">
        <h2 className="text-lg font-black text-gray-800 mb-3">📋 {t('Compliance Guide')}</h2>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex items-start gap-2"><span>✅</span> {t('Always disclose your affiliate relationship')}</li>
          <li className="flex items-start gap-2"><span>✅</span> {t('Use only approved marketing materials')}</li>
          <li className="flex items-start gap-2"><span>✅</span> {t('Do not make false claims about ShuSpot')}</li>
          <li className="flex items-start gap-2"><span>✅</span> {t('Follow platform-specific advertising rules')}</li>
          <li className="flex items-start gap-2"><span>✅</span> {t('Report any issues to support immediately')}</li>
        </ul>
      </div>
    </div>
  );
}
