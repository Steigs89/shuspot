import React, { useState } from 'react';
import LoginScreen from './LoginScreen';
import SignupScreen from './SignupScreen';
import AvatarSelectionScreen from './AvatarSelectionScreen';
import PlanSelectionScreen from './PlanSelectionScreen';
import DifficultySelectionScreen from './DifficultySelectionScreen';
import { SubscriptionProvider, useSubscription } from '../../contexts/SubscriptionContext';

interface AuthFlowProps {
  onAuthComplete: () => void;
}

type AuthStep = 'login' | 'signup' | 'avatar' | 'plan' | 'difficulty';

interface UserData {
  fullName: string;
  email: string;
  password: string;
  readingLevelSystem?: string;
}

function AuthFlowContent({ onAuthComplete }: AuthFlowProps) {
  const [currentStep, setCurrentStep] = useState<AuthStep>('login');
  const [userData, setUserData] = useState<UserData | null>(null);
  const { updateReadingLevelSystem } = useSubscription();

  const handleLogin = () => {
    onAuthComplete();
  };

  const handleSignupNext = (data: UserData) => {
    setUserData(data);
    setCurrentStep('avatar');
  };

  const handleAvatarNext = () => {
    setCurrentStep('plan');
  };

  const handlePlanNext = () => {
    setCurrentStep('difficulty');
  };

  const handleDifficultyComplete = async (readingLevelSystem: string) => {
    try {
      // Update the user's reading level system in Supabase
      const result = await updateReadingLevelSystem(readingLevelSystem);
      
      if (result.success) {
        // Update userData with the selected reading level system
        if (userData) {
          setUserData({
            ...userData,
            readingLevelSystem
          });
        }
        onAuthComplete();
      } else {
        console.error('Failed to update reading level system:', result.error);
        // Still complete auth flow even if reading level system update fails
        onAuthComplete();
      }
    } catch (error) {
      console.error('Error updating reading level system:', error);
      // Still complete auth flow even if there's an error
      onAuthComplete();
    }
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
    case 'avatar':
      return (
        <AvatarSelectionScreen
          onNext={handleAvatarNext}
        />
      );
    case 'plan':
      return (
        <PlanSelectionScreen
          onNext={handlePlanNext}
          userData={userData!}
        />
      );
    case 'difficulty':
      return (
        <DifficultySelectionScreen
          onComplete={handleDifficultyComplete}
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