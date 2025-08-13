import React from 'react';
import { Clock, Crown, CreditCard } from 'lucide-react';
import { useSubscription } from '../contexts/SubscriptionContext';

export default function TrialStatusBanner() {
  const { subscription, isInTrial, getTrialDaysRemaining, createStripeCheckout, pricingTiers } = useSubscription();

  if (!subscription) return null;

  const trialDaysLeft = getTrialDaysRemaining();
  const currentTier = pricingTiers.find(tier => tier.id === subscription.tierId);

  if (!isInTrial()) return null;

  const handleUpgradeNow = async () => {
    if (!subscription) return;
    
    const result = await createStripeCheckout(subscription.tierId);
    if (result.success && result.checkoutUrl) {
      window.location.href = result.checkoutUrl;
    } else {
      alert(result.error || 'Failed to start checkout process');
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white p-4 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Crown className="w-6 h-6 text-yellow-300" />
            <span className="font-bold text-lg">Free Trial Active</span>
          </div>
          
          <div className="flex items-center space-x-2 bg-white/20 rounded-full px-3 py-1">
            <Clock className="w-4 h-4" />
            <span className="font-medium">
              {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} remaining
            </span>
          </div>
          
          {currentTier && (
            <div className="hidden md:block text-sm opacity-90">
              Enjoying {currentTier.name}? Upgrade to continue after your trial ends.
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3">
          {trialDaysLeft <= 2 && (
            <div className="text-sm font-medium bg-red-500/30 px-3 py-1 rounded-full">
              Trial ending soon!
            </div>
          )}
          
          <button
            onClick={handleUpgradeNow}
            className="flex items-center space-x-2 bg-white text-purple-600 font-bold px-4 py-2 rounded-full hover:bg-gray-100 transition-colors shadow-lg"
          >
            <CreditCard className="w-4 h-4" />
            <span>Upgrade Now</span>
          </button>
        </div>
      </div>
    </div>
  );
}