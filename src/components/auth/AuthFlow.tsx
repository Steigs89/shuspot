import { useState } from 'react';
import LoginScreen from './LoginScreen';
import SignupScreen from './SignupScreen';
import CreateProfileScreen from './CreateProfileScreen';
import AvatarSelectionScreen from './AvatarSelectionScreen';
import DifficultySelectionScreen from './DifficultySelectionScreen';
import PlanSelectionScreen from './PlanSelectionScreen';

import { SubscriptionProvider } from '../../contexts/SubscriptionContext';

interface AuthFlowProps {
  onAuthComplete: () => void;
}

type AuthStep = 'login' | 'signup' | 'create-profile' | 'avatar' | 'difficulty' | 'plan';

interface UserData {
  fullName: string;
  email: string;
  password: string;
  childName?: string;
  dateOfBirth?: string;
  readingLevelSystem?: string;
  avatar?: string;
  selectedPlan?: string;
}

function AuthFlowContent({ onAuthComplete }: AuthFlowProps) {
  const [currentStep, setCurrentStep] = useState<AuthStep>('login');
  const [userData, setUserData] = useState<UserData | null>(null);

  const handleLogin = () => {
    onAuthComplete();
  };

  const handleSignupNext = (data: UserData) => {
    setUserData(data);
    setCurrentStep('create-profile');
  };

  const handleCreateProfileNext = (childName: string, dateOfBirth: string) => {
    if (userData) {
      setUserData({
        ...userData,
        childName,
        dateOfBirth
      });
    }
    setCurrentStep('avatar');
  };

  const handleAvatarNext = (selectedAvatar: string) => {
    console.log('🎭 Avatar selected in AuthFlow:', selectedAvatar);
    if (userData) {
      setUserData({
        ...userData,
        avatar: selectedAvatar
      });
    }
    setCurrentStep('difficulty');
  };

  const handleDifficultyNext = (readingLevelSystem: string) => {
    if (userData) {
      setUserData({
        ...userData,
        readingLevelSystem
      });
    }
    setCurrentStep('plan');
  };

  const handlePlanNext = async (selectedPlan: string) => {
    if (userData) {
      setUserData({
        ...userData,
        selectedPlan
      });
    }
    
    // Redirect to Stripe payment link
    console.log('💳 Redirecting to Stripe payment...');
    window.location.href = 'https://buy.stripe.com/test_cNi00j5DVfD37Ef9Wc0kE00';
  };

  const handleBackToSignup = () => {
    setCurrentStep('signup');
  };

  const handleBackToCreateProfile = () => {
    setCurrentStep('create-profile');
  };

  const handleBackToAvatar = () => {
    setCurrentStep('avatar');
  };

  const handleBackToDifficulty = () => {
    setCurrentStep('difficulty');
  };



  const handleSwitchToSignup = () => {
    setCurrentStep('signup');
  };

  const handleSwitchToLogin = () => {
    setCurrentStep('login');
  };

  switch (currentStep) {
    case 'login':
      return (
        <LoginScreen
          onLogin={handleLogin}
          onSwitchToSignup={handleSwitchToSignup}
        />
      );
    case 'signup':
      return (
        <SignupScreen
          onNext={handleSignupNext}
          onSwitchToLogin={handleSwitchToLogin}
        />
      );
    case 'create-profile':
      return (
        <CreateProfileScreen
          onNext={handleCreateProfileNext}
          onBack={handleBackToSignup}
        />
      );
    case 'avatar':
      return (
        <AvatarSelectionScreen
          onNext={handleAvatarNext}
          onBack={handleBackToCreateProfile}
        />
      );
    case 'difficulty':
      return (
        <DifficultySelectionScreen
          onNext={handleDifficultyNext}
          onBack={handleBackToAvatar}
        />
      );
    case 'plan':
      return (
        <PlanSelectionScreen
          onNext={handlePlanNext}
          onBack={handleBackToDifficulty}
          userData={userData!}
        />
      );
    default:
      return null;
  }
}

export default function AuthFlow({ onAuthComplete }: AuthFlowProps) {
  return (
    <SubscriptionProvider>
      <AuthFlowContent onAuthComplete={onAuthComplete} />
    </SubscriptionProvider>
  );
}