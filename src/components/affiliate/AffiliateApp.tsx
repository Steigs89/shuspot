import { useState } from 'react';
import AffiliateLogin from './AffiliateLogin';
import AffiliateNavbar from './AffiliateNavbar';
import AffiliateSidebar from './AffiliateSidebar';
import AffiliateDashboard from './AffiliateDashboard';
import AffiliateEarnings from './AffiliateEarnings';
import AffiliateContent from './AffiliateContent';
import AffiliateSettings from './AffiliateSettings';
import { AffiliateLanguageProvider } from './AffiliateLanguageContext';
import { MOCK_USER, MOCK_STATS, MOCK_REFERRALS, MOCK_PAYOUTS, MOCK_CONTENT } from './types';

type Page = 'dashboard' | 'earnings' | 'content' | 'settings';

export default function AffiliateApp() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [page, setPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!loggedIn) {
    return <AffiliateLogin onLogin={() => setLoggedIn(true)} />;
  }

  return (
    <AffiliateLanguageProvider>
      <div className="min-h-screen bg-[#f4f6fa]">
        <div className="flex">
          <AffiliateSidebar
            user={MOCK_USER}
            activePage={page}
            onNavigate={setPage}
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
          <div className="flex-1 flex flex-col min-h-screen">
            <AffiliateNavbar
              user={MOCK_USER}
              onToggleSidebar={() => setSidebarOpen(p => !p)}
              onLogout={() => setLoggedIn(false)}
            />
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
              {page === 'dashboard' && <AffiliateDashboard user={MOCK_USER} stats={MOCK_STATS} referrals={MOCK_REFERRALS} />}
              {page === 'earnings' && <AffiliateEarnings stats={MOCK_STATS} payouts={MOCK_PAYOUTS} />}
              {page === 'content' && <AffiliateContent assets={MOCK_CONTENT} />}
              {page === 'settings' && <AffiliateSettings user={MOCK_USER} />}
            </main>
          </div>
        </div>
      </div>
    </AffiliateLanguageProvider>
  );
}
