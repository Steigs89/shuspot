import { useState } from 'react';
import { Copy, Check, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { AffiliateUser, AffiliateStats, Referral, MOCK_CHART_DATA } from './types';
import { useAffLang } from './AffiliateLanguageContext';

interface Props {
  user: AffiliateUser;
  stats: AffiliateStats;
  referrals: Referral[];
}

const STATUS_STYLES: Record<string, string> = {
  active_trial: 'bg-brand-blue/15 text-teal-700',
  confirmed: 'bg-green-50 text-green-700',
  expired: 'bg-gray-100 text-gray-500',
  pending: 'bg-brand-yellow/15 text-yellow-700',
};

export default function AffiliateDashboard({ user, stats, referrals }: Props) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const maxClicks = Math.max(...MOCK_CHART_DATA.map(d => d.clicks));
  const { t } = useAffLang();

  const copy = (text: string, type: 'link' | 'code') => {
    navigator.clipboard.writeText(text);
    if (type === 'link') { setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }
    else { setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t('Clicks This Month'), value: stats.clicksThisMonth.toLocaleString(), change: stats.clicksChange, icon: '🖱️' },
          { label: t('Trial Signups'), value: stats.trialSignups.toString(), change: stats.trialsChange, icon: '🆓' },
          { label: t('Paid Conversions'), value: stats.paidConversions.toString(), change: stats.conversionsChange, icon: '💳' },
          { label: t('Earnings'), value: `¥${stats.earningsThisMonth.toLocaleString()}`, change: stats.earningsChange, icon: '💰' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{s.icon}</span>
              <span className={`flex items-center gap-0.5 text-xs font-bold ${s.change >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                {s.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {s.change >= 0 ? '+' : ''}{s.change}%
              </span>
            </div>
            <p className="text-2xl font-black text-gray-800">{s.value}</p>
            <p className="text-xs text-gray-400 font-medium mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Two column: Chart + Tier Progress */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-black text-gray-800">{t('Visitor Statistics')}</h2>
            <span className="text-xs text-gray-400 font-medium">{t('Last 7 days')}</span>
          </div>
          <div className="flex items-end justify-around h-44 gap-2">
            {MOCK_CHART_DATA.map(d => (
              <div key={d.day} className="flex flex-col items-center gap-2 flex-1">
                <span className="text-[10px] font-bold text-gray-500">{d.clicks}</span>
                <div className="w-full max-w-[36px] rounded-lg hover:brightness-110 transition-all"
                  style={{ height: `${(d.clicks / maxClicks) * 100}%`, background: 'linear-gradient(to top, #d85f9c, #a1cfd2)' }} />
                <span className="text-[10px] text-gray-400 font-semibold">{d.day}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm flex flex-col">
          <h2 className="text-base font-black text-gray-800 mb-4">{t('Tier Progress')}</h2>
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f0f0f0" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#d85f9c" strokeWidth="3"
                  strokeDasharray={`${(user.tierProgress / user.tierTarget) * 100} 100`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-gray-800">{Math.round((user.tierProgress / user.tierTarget) * 100)}%</span>
              </div>
            </div>
            <p className="text-sm font-bold text-gray-600 mt-3">{user.tierProgress} / {user.tierTarget} {t('conversions')}</p>
          </div>
        </div>
      </div>

      {/* Sharing Tools */}
      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
        <h2 className="text-base font-black text-gray-800">{t('My Sharing Tools')}</h2>
        <div className="bg-brand-yellow/10 border border-brand-yellow/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🏷️</span>
            <div>
              <p className="font-bold text-gray-800 text-sm">{t('Discount Code')}</p>
              <p className="text-[10px] text-gray-400">{t('Best for: videos, captions, comments')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white border-2 border-dashed border-brand-yellow rounded-xl px-5 py-2.5 font-mono text-xl font-black text-brand-pink tracking-widest">
              {user.discountCode}
            </div>
            <button onClick={() => copy(user.discountCode, 'code')} className="bg-brand-pink text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:brightness-110 transition-all flex items-center gap-1.5">
              {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedCode ? t('Copied!') : t('Copy')}
            </button>
          </div>
        </div>
        <div className="grid md:grid-cols-[1fr_auto] gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🔗</span>
              <p className="font-bold text-gray-800 text-sm">{t('Referral Link')}</p>
            </div>
            <div className="flex gap-2">
              <input readOnly value={user.referralLink} className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-brand-blue truncate" />
              <button onClick={() => copy(user.referralLink, 'link')} className="bg-brand-blue text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:brightness-110 transition-all flex items-center gap-1.5 whitespace-nowrap">
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copiedLink ? t('Copied!') : t('Copy Link')}
              </button>
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-bold text-gray-800">📱 {t('QR Code')}</p>
            <div className="w-28 h-28 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center text-gray-300 text-xs font-bold">QR</div>
            <button className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg font-bold text-xs hover:bg-gray-200 transition-all flex items-center gap-1">
              <Download className="w-3 h-3" /> {t('Download')}
            </button>
          </div>
        </div>
      </div>

      {/* Recent Referrals */}
      <div className="bg-white rounded-2xl p-6 shadow-sm overflow-x-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-black text-gray-800">{t('Recent Referrals')}</h2>
          <button className="text-xs text-brand-pink font-bold hover:underline">{t('View All')}</button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 px-3 text-xs text-gray-400 font-semibold uppercase tracking-wide">{t('Date')}</th>
              <th className="text-left py-3 px-3 text-xs text-gray-400 font-semibold uppercase tracking-wide">{t('Event')}</th>
              <th className="text-left py-3 px-3 text-xs text-gray-400 font-semibold uppercase tracking-wide">{t('Status')}</th>
              <th className="text-right py-3 px-3 text-xs text-gray-400 font-semibold uppercase tracking-wide">{t('Earnings')}</th>
            </tr>
          </thead>
          <tbody>
            {referrals.map(r => (
              <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="py-3.5 px-3 text-gray-500">{r.date}</td>
                <td className="py-3.5 px-3 text-gray-800 font-medium">{t(r.event)}</td>
                <td className="py-3.5 px-3">
                  <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize ${STATUS_STYLES[r.status]}`}>
                    {t(r.status.replace('_', ' '))}
                  </span>
                </td>
                <td className={`py-3.5 px-3 text-right font-bold ${r.earnings > 0 ? 'text-green-500' : 'text-gray-300'}`}>
                  {r.earnings > 0 ? `+¥${r.earnings}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
