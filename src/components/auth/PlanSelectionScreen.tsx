import React, { useState } from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';

interface PlanSelectionScreenProps {
  onNext: () => void;
  userData: { fullName: string; email: string; password: string };
}

export default function PlanSelectionScreen({ onNext, userData }: PlanSelectionScreenProps) {
  const { pricingTiers, signUp, startFreeTrial, createStripeCheckout, isLoading } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async () => {
    if (!selectedPlan || isProcessing) return;

    setIsProcessing(true);

    try {
      // First, create the user account
      const signUpResult = await signUp(userData.email, userData.password, userData.fullName);
      
      if (!signUpResult.success) {
        alert(signUpResult.error || 'Failed to create account');
        setIsProcessing(false);
        return;
      }

      // Find the selected pricing tier
      const selectedTier = pricingTiers.find(tier => tier.id === selectedPlan);
      if (!selectedTier) {
        alert('Invalid plan selected');
        setIsProcessing(false);
        return;
      }

      // Start free trial first
      const trialResult = await startFreeTrial(selectedPlan);
      
      if (trialResult.success) {
        // Trial started successfully, proceed to next step
        onNext();
      } else {
        // If trial fails (user already used trial), go directly to Stripe checkout
        const checkoutResult = await createStripeCheckout(selectedPlan);
        
        if (checkoutResult.success && checkoutResult.checkoutUrl) {
          // In production, redirect to Stripe checkout
          window.location.href = checkoutResult.checkoutUrl;
        } else {
          alert(checkoutResult.error || 'Failed to create checkout session');
        }
      }
    } catch (error) {
      console.error('Error during signup process:', error);
      alert('An error occurred during signup. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-cyan-200 to-teal-200 flex items-center justify-center p-4">
      {/* Left Character */}
      <div className="absolute left-8 bottom-8 hidden lg:block">
        <div className="w-48 h-48 bg-gray-400 rounded-full relative">
          <div className="absolute inset-0 flex items-center justify-center text-6xl">
            🦏
          </div>
        </div>
      </div>

      {/* Right Character */}
      <div className="absolute right-8 bottom-8 hidden lg:block">
        <div className="w-48 h-48 bg-brown-400 rounded-full relative">
          <div className="absolute inset-0 flex items-center justify-center text-6xl">
            🫏
          </div>
        </div>
      </div>

      {/* Plan Selection */}
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg">
        <h1 className="text-4xl font-bold text-gray-800 text-center mb-4">Choose Plan</h1>
        <p className="text-gray-600 text-center mb-6">Start 7 days free cancel at any time!</p>
        <p className="text-gray-800 font-bold text-center mb-8">Step 3 of 4</p>
        
        <div className="space-y-4 mb-6">
          {pricingTiers.map((tier) => (
            <div
              key={tier.id}
              onClick={() => setSelectedPlan(tier.id)}
              className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-300 relative ${
                selectedPlan === tier.id
                  ? 'border-pink-400 bg-pink-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-pink-400 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    MOST POPULAR
                  </span>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-gray-800 text-lg">{tier.name}</span>
                    <span className="text-pink-500 font-bold text-xl">
                      ${tier.price}/{tier.interval === 'month' ? 'mo' : 'yr'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {tier.trialDays} days free trial • Cancel anytime
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {tier.features.slice(0, 2).join(' • ')}
                    {tier.features.length > 2 && ` • +${tier.features.length - 2} more`}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-5 h-5 rounded-full border-2 ${
                    selectedPlan === tier.id
                      ? 'border-pink-400 bg-pink-400'
                      : 'border-gray-300'
                  }`}>
                    {selectedPlan === tier.id && (
                      <div className="w-full h-full rounded-full bg-white scale-50"></div>
                    )}
                  </div>
                  <span className="font-medium text-gray-800">Select</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-6">
          <input
            type="text"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value)}
            placeholder="Referral Code"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent text-pink-400 placeholder-pink-300"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!selectedPlan || isProcessing}
          className={`w-full font-bold py-4 rounded-2xl transition-all duration-300 ${
            selectedPlan && !isProcessing
              ? 'bg-gradient-to-r from-teal-400 to-cyan-400 text-white hover:from-teal-500 hover:to-cyan-500 shadow-lg'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isProcessing ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Starting Free Trial...</span>
            </div>
          ) : (
            'Start 7-Day Free Trial'
          )}
        </button>
      </div>
    </div>
  );
}