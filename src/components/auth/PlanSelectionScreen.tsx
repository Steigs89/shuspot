import { useState } from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import tigerImg from '../../assets/Tiger.png';
import bearImg from '../../assets/Bear.png';

interface PlanSelectionScreenProps {
  onNext: (selectedPlan: string) => void;
  onBack: () => void;
  userData: { fullName: string; email: string; password: string; avatar?: string };
}

export default function PlanSelectionScreen({ onNext, onBack, userData }: PlanSelectionScreenProps) {
  const { pricingTiers, signUp, startFreeTrial } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async () => {
    if (!selectedPlan || isProcessing) return;

    setIsProcessing(true);

    try {
      console.log('🚀 Creating account and redirecting to Stripe...');
      
      // Create the user account with avatar
      console.log('🎭 Creating user account with avatar:', userData.avatar);
      const signUpResult = await signUp(
        userData.email,
        userData.password,
        userData.fullName,
        undefined,
        userData.avatar
      );
      
      if (!signUpResult.success) {
        alert(signUpResult.error || 'Failed to create account');
        setIsProcessing(false);
        return;
      }

      console.log('✅ User account created');
      
      // Wait for auth session to be established
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Start free trial
      console.log('🎯 Starting free trial for plan:', selectedPlan);
      const trialResult = await startFreeTrial(selectedPlan);
      
      if (trialResult.success) {
        console.log('✅ Trial started successfully');
      } else {
        console.log('⚠️ Trial setup pending');
      }
      
      // Redirect to Stripe payment link
      onNext(selectedPlan);
    } catch (error) {
      console.error('Error during signup process:', error);
      alert('An error occurred during signup. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-cyan-200 to-teal-200 flex items-center justify-center p-4 relative">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="absolute top-8 left-8 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 z-20"
      >
        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Left Character - Tiger */}
      <div className="absolute left-0 bottom-0 hidden lg:block">
        <img 
          src={tigerImg} 
          alt="Tiger" 
          className="w-64 h-auto transform -rotate-12 translate-x-[-10%] translate-y-[10%] drop-shadow-2xl"
          style={{ transformOrigin: 'bottom left' }}
        />
      </div>

      {/* Right Character - Bear */}
      <div className="absolute right-0 bottom-0 hidden lg:block">
        <img 
          src={bearImg} 
          alt="Bear" 
          className="w-64 h-auto transform rotate-12 translate-x-[10%] translate-y-[10%] drop-shadow-2xl"
          style={{ transformOrigin: 'bottom right' }}
        />
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
              <span>Creating Account...</span>
            </div>
          ) : (
            'Start 7-Day Free Trial'
          )}
        </button>
      </div>
    </div>
  );
}