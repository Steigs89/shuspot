import { AffiliateStats, PayoutRecord } from './types';
import { useAffLang } from './AffiliateLanguageContext';

interface Props {
  stats: AffiliateStats;
  payouts: PayoutRecord[];
}

const PAYOUT_STATUS: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  pending: 'bg-brand-yellow/20 text-yellow-700',
  processing: 'bg-brand-blue/20 text-teal-700',
};

export default function AffiliateEarnings({ stats, payouts }: Props) {
  const { t } = useAffLang();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-gray-800">💰 {t('Earnings & Payouts')}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-brand-pink to-pink-400 rounded-2xl p-5 text-white shadow-lg">
          <p className="text-sm opacity-80 font-semibold">{t('This Month')}</p>
          <p className="text-3xl font-black mt-1">¥{stats.earningsThisMonth.toLocaleString()}</p>
          <p className="text-xs opacity-70 mt-1">↑ +{stats.earningsChange}% {t('vs last month')}</p>
        </div>
        <div className="bg-gradient-to-br from-brand-blue to-teal-400 rounded-2xl p-5 text-white shadow-lg">
          <p className="text-sm opacity-80 font-semibold">{t('Lifetime Earnings')}</p>
          <p className="text-3xl font-black mt-1">¥{stats.lifetimeEarnings.toLocaleString()}</p>
        </div>
        <div className="bg-gradient-to-br from-brand-yellow to-yellow-300 rounded-2xl p-5 text-gray-800 shadow-lg">
          <p className="text-sm opacity-70 font-semibold">{t('Pending Payout')}</p>
          <p className="text-3xl font-black mt-1">¥{stats.pendingPayout.toLocaleString()}</p>
          <button className="mt-2 bg-white/80 text-gray-800 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-white transition-colors">
            {t('Request Payout')}
          </button>
        </div>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-md">
        <h2 className="text-lg font-black text-gray-800 mb-4">📊 {t('Commission Breakdown')}</h2>
        <div className="space-y-3">
          {[
            { plan: t('Free Trial Signup'), rate: t('¥5 per signup'), earned: '¥315', color: 'bg-brand-blue' },
            { plan: t('1-Month Subscription'), rate: t('25% commission'), earned: '¥525', color: 'bg-brand-pink' },
            { plan: t('3-Month Subscription'), rate: t('25% commission'), earned: '¥840', color: 'bg-brand-yellow' },
            { plan: t('Annual Subscription'), rate: t('30% commission'), earned: '¥910', color: 'bg-brand-pink' },
          ].map(c => (
            <div key={c.plan} className="flex items-center gap-4">
              <div className={`w-2 h-10 ${c.color} rounded-full`} />
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-800">{c.plan}</p>
                <p className="text-xs text-gray-400">{c.rate}</p>
              </div>
              <p className="text-sm font-black text-gray-800">{c.earned}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-md overflow-x-auto">
        <h2 className="text-lg font-black text-gray-800 mb-4">🏦 {t('Payout History')}</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-100">
              <th className="text-left py-2 px-3 text-gray-500 font-semibold">{t('Date')}</th>
              <th className="text-left py-2 px-3 text-gray-500 font-semibold">{t('Amount')}</th>
              <th className="text-left py-2 px-3 text-gray-500 font-semibold">{t('Method')}</th>
              <th className="text-left py-2 px-3 text-gray-500 font-semibold">{t('Status')}</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map(p => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="py-3 px-3 text-gray-600">{p.date}</td>
                <td className="py-3 px-3 font-bold text-gray-800">¥{p.amount.toLocaleString()}</td>
                <td className="py-3 px-3 text-gray-600">{t(p.method)}</td>
                <td className="py-3 px-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${PAYOUT_STATUS[p.status]}`}>
                    {t(p.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
