import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { stripeAPI } from '../api/stripe';
import { supabase } from '../lib/supabase';

export interface PricingTier {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  stripePriceId: string;
  features: string[];
  popular?: boolean;
  trialDays: number;
}

export interface Subscription {
  id: string;
  userId: string;
  tierId: string;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialStart?: string;
  trialEnd?: string;
  cancelAtPeriodEnd: boolean;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  subscription?: Subscription;
  hasCompletedTrial: boolean;
  createdAt: string;
}

interface SubscriptionContextType {
  user: User | null;
  subscription: Subscription | null;
  pricingTiers: PricingTier[];
  isLoading: boolean;
  
  // Auth functions
  signUp: (email: string, password: string, name: string, readingLevelSystem?: string, avatar?: string) => Promise<{ success: boolean; error?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updateReadingLevelSystem: (readingLevelSystem: string) => Promise<{ success: boolean; error?: string }>;
  
  // Subscription functions
  startFreeTrial: (tierId: string) => Promise<{ success: boolean; error?: string }>;
  createStripeCheckout: (tierId: string) => Promise<{ success: boolean; checkoutUrl?: string; error?: string }>;
  cancelSubscription: () => Promise<{ success: boolean; error?: string }>;
  
  // Trial functions
  isInTrial: () => boolean;
  getTrialDaysRemaining: () => number;
  canAccessFeature: (feature: string) => boolean;
}

const defaultPricingTiers: PricingTier[] = [
  {
    id: 'basic-monthly',
    name: 'Basic Monthly',
    price: 9.99,
    interval: 'month',
    stripePriceId: 'price_basic_monthly', // Replace with actual Stripe price ID
    trialDays: 7,
    features: [
      'Access to all books',
      'Read to Me feature',
      'Basic progress tracking',
      'Mobile app access'
    ]
  },
  {
    id: 'premium-monthly',
    name: 'Premium Monthly',
    price: 19.99,
    interval: 'month',
    stripePriceId: 'price_premium_monthly', // Replace with actual Stripe price ID
    trialDays: 7,
    popular: true,
    features: [
      'Everything in Basic',
      'Voice Coach feature',
      'Advanced analytics',
      'Offline reading',
      'Priority support',
      'Quiz & assessments'
    ]
  },
  {
    id: 'family-monthly',
    name: 'Family Monthly',
    price: 29.99,
    interval: 'month',
    stripePriceId: 'price_family_monthly', // Replace with actual Stripe price ID
    trialDays: 7,
    features: [
      'Everything in Premium',
      'Up to 6 family members',
      'Parental controls',
      'Individual progress tracking',
      'Family reading challenges'
    ]
  },
  {
    id: 'premium-yearly',
    name: 'Premium Yearly',
    price: 199.99,
    interval: 'year',
    stripePriceId: 'price_premium_yearly', // Replace with actual Stripe price ID
    trialDays: 7,
    features: [
      'Everything in Premium Monthly',
      '2 months free (save 17%)',
      'Annual progress reports',
      'Exclusive yearly content'
    ]
  }
];

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

interface SubscriptionProviderProps {
  children: ReactNode;
}

export const SubscriptionProvider: React.FC<SubscriptionProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pricingTiers] = useState<PricingTier[]>(defaultPricingTiers);

  // Load user data from Supabase on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Check if user is already authenticated with Supabase
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          // Get user profile from database
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();

          // Get user subscription if exists
          const { data: userSubscription } = await supabase
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', authUser.id)
            .single();

          const user: User = {
            id: authUser.id,
            email: authUser.email || '',
            name: profile?.full_name || authUser.user_metadata?.full_name || 'User',
            hasCompletedTrial: userSubscription?.trial_end ? new Date(userSubscription.trial_end) < new Date() : false,
            createdAt: authUser.created_at
          };

          setUser(user);

          if (userSubscription) {
            const subscription: Subscription = {
              id: userSubscription.id,
              userId: userSubscription.user_id,
              tierId: userSubscription.plan_id || '',
              status: userSubscription.status as any,
              currentPeriodStart: userSubscription.current_period_start || '',
              currentPeriodEnd: userSubscription.current_period_end || '',
              trialStart: userSubscription.trial_start,
              trialEnd: userSubscription.trial_end,
              cancelAtPeriodEnd: userSubscription.cancel_at_period_end,
              stripeSubscriptionId: userSubscription.stripe_subscription_id,
              stripeCustomerId: userSubscription.stripe_customer_id
            };
            setSubscription(subscription);
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();

    // Listen for auth state changes
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setSubscription(null);
      }
    });

    return () => authSubscription.unsubscribe();
  }, []);

  // Save user data to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  useEffect(() => {
    if (subscription) {
      localStorage.setItem('subscription', JSON.stringify(subscription));
    } else {
      localStorage.removeItem('subscription');
    }
  }, [subscription]);

  const signUp = async (email: string, password: string, name: string, readingLevelSystem?: string, avatar?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      console.log('🔐 Starting signup process for:', email);
      console.log('🎭 Avatar to save:', avatar);
      
      // Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            reading_level_system: readingLevelSystem || 'US-RAZ',
            name: name, // Also save as 'name' for compatibility
            avatar: avatar || '🐶' // Save the selected avatar
          }
        }
      });

      console.log('🔐 Supabase auth response:', { authData, authError });

      if (authError) {
        console.error('❌ Auth error:', authError.message);
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        console.error('❌ No user returned from auth');
        return { success: false, error: 'Failed to create user account' };
      }

      console.log('✅ User created successfully:', authData.user.id);

      // Try to create user profile in our database (optional - don't fail if it doesn't work)
      try {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: authData.user.id,
            email: email,
            full_name: name,
            onboarding_completed: false
          });

        if (profileError) {
          console.warn('⚠️ Could not create user profile (table may not exist yet):', profileError.message);
          // This is OK - we can create the profile later or use auth metadata
        } else {
          console.log('✅ User profile created successfully');
        }
      } catch (profileError) {
        console.warn('⚠️ Profile creation failed (continuing anyway):', profileError);
      }

      const newUser: User = {
        id: authData.user.id,
        email,
        name,
        hasCompletedTrial: false,
        createdAt: authData.user.created_at || new Date().toISOString()
      };
      
      console.log('✅ Setting user state:', newUser);
      setUser(newUser);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Signup error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create account' };
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      console.log('Starting sign in process...');
      
      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      console.log('Auth response:', { authData, authError });

      if (authError) {
        setIsLoading(false); // Reset loading state on auth error
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        setIsLoading(false); // Reset loading state if no user
        return { success: false, error: 'Failed to sign in' };
      }

      console.log('Auth successful, loading profile...');

      // Get user profile from database (with fallback if table doesn't exist)
      let profile = null;
      let userSubscription = null;
      
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          // PGRST116 = no rows returned, which is fine
          console.error('Error loading user profile:', profileError);
          console.log('Profile error details:', profileError.message, profileError.code);
        } else {
          profile = profileData;
        }
      } catch (error) {
        console.log('User profile table may not exist yet - using auth data as fallback');
      }

      // Get user subscription if exists (with fallback if table doesn't exist)
      try {
        const { data: subscriptionData } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', authData.user.id)
          .single();
        
        userSubscription = subscriptionData;
      } catch (error) {
        console.log('User subscription table may not exist yet - continuing without subscription data');
      }

      console.log('Creating user object...');
      
      const user: User = {
        id: authData.user.id,
        email: authData.user.email || email,
        name: profile?.full_name || authData.user.user_metadata?.full_name || authData.user.user_metadata?.name || 'User',
        hasCompletedTrial: userSubscription?.trial_end ? new Date(userSubscription.trial_end) < new Date() : false,
        createdAt: authData.user.created_at
      };

      console.log('👤 User metadata:', authData.user.user_metadata);
      console.log('📝 Final user object:', user);

      console.log('Setting user:', user);
      setUser(user);

      if (userSubscription) {
        console.log('Setting subscription:', userSubscription);
        const subscription: Subscription = {
          id: userSubscription.id,
          userId: userSubscription.user_id,
          tierId: userSubscription.plan_id || '',
          status: userSubscription.status as any,
          currentPeriodStart: userSubscription.current_period_start || '',
          currentPeriodEnd: userSubscription.current_period_end || '',
          trialStart: userSubscription.trial_start,
          trialEnd: userSubscription.trial_end,
          cancelAtPeriodEnd: userSubscription.cancel_at_period_end,
          stripeSubscriptionId: userSubscription.stripe_subscription_id,
          stripeCustomerId: userSubscription.stripe_customer_id
        };
        setSubscription(subscription);
      }
      
      console.log('Sign in completed successfully');
      setIsLoading(false); // Set loading to false BEFORE returning success
      return { success: true };
    } catch (error) {
      console.error('Sign in error:', error);
      setIsLoading(false); // Also set loading to false on error
      return { success: false, error: 'Failed to sign in' };
    }
  };

  const signOut = async (): Promise<void> => {
    // Sign out from Supabase Auth
    await supabase.auth.signOut();
    
    setUser(null);
    setSubscription(null);
    localStorage.removeItem('user');
    localStorage.removeItem('subscription');
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: 'Failed to send password reset email' };
    }
  };

  const updateReadingLevelSystem = async (readingLevelSystem: string): Promise<{ success: boolean; error?: string }> => {
    console.log('🎯 Updating reading level system to:', readingLevelSystem);
    
    // Try to get current user from auth if not in state
    let currentUser = user;
    if (!currentUser) {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          currentUser = {
            id: authUser.id,
            email: authUser.email || '',
            name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'User',
            hasCompletedTrial: false,
            createdAt: authUser.created_at
          };
          setUser(currentUser);
        }
      } catch (error) {
        console.log('Could not get user from auth:', error);
      }
    }

    if (!currentUser) {
      console.log('⚠️ No user found, but continuing with reading level update');
      // Don't fail - just continue without updating
      return { success: true };
    }

    try {
      setIsLoading(true);
      console.log('📝 Updating user metadata for user:', currentUser.id);
      
      // Update user metadata in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          reading_level_system: readingLevelSystem,
          reading_level: readingLevelSystem // Also save as reading_level for compatibility
        }
      });

      if (updateError) {
        console.error('❌ Error updating user metadata:', updateError);
        return { success: false, error: updateError.message };
      }

      console.log('✅ Successfully updated reading level system');
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating reading level system:', error);
      return { success: false, error: 'Failed to update reading level system' };
    } finally {
      setIsLoading(false);
    }
  };

  const startFreeTrial = async (tierId: string): Promise<{ success: boolean; error?: string }> => {
    console.log('🎯 startFreeTrial called with tierId:', tierId);
    console.log('🔍 Current user state:', user);
    
    // Use the user from React state if available, otherwise create a basic trial
    let currentUser = user;
    
    if (!currentUser) {
      console.log('🔄 No user in state, trying to get from Supabase auth...');
      
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        
        if (authUser) {
          currentUser = {
            id: authUser.id,
            email: authUser.email || '',
            name: authUser.user_metadata?.full_name || 'User',
            hasCompletedTrial: false,
            createdAt: authUser.created_at
          };
          setUser(currentUser);
          console.log('✅ Retrieved user from Supabase auth:', currentUser);
        } else {
          console.log('⚠️ No auth user found, but continuing with trial creation');
          // For now, just create a basic trial without user authentication
          // This allows the signup flow to complete even if auth session isn't ready
        }
      } catch (error) {
        console.log('⚠️ Auth check failed, but continuing with trial creation:', error);
      }
    }

    // If we still don't have a user, create a temporary one for the trial
    if (!currentUser) {
      console.log('⚠️ Creating temporary user for trial');
      currentUser = {
        id: 'temp-' + Date.now(),
        email: 'temp@example.com',
        name: 'Temporary User',
        hasCompletedTrial: false,
        createdAt: new Date().toISOString()
      };
    }

    if (currentUser.hasCompletedTrial) {
      return { success: false, error: 'Free trial already used' };
    }

    try {
      setIsLoading(true);
      console.log('🎯 Starting free trial for user:', currentUser.id, 'with tier:', tierId);
      
      const tier = pricingTiers.find(t => t.id === tierId);
      if (!tier) {
        return { success: false, error: 'Invalid pricing tier' };
      }

      const trialStart = new Date();
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + tier.trialDays);

      const newSubscription: Subscription = {
        id: Date.now().toString(),
        userId: currentUser.id,
        tierId: tierId,
        status: 'trialing',
        currentPeriodStart: trialStart.toISOString(),
        currentPeriodEnd: trialEnd.toISOString(),
        trialStart: trialStart.toISOString(),
        trialEnd: trialEnd.toISOString(),
        cancelAtPeriodEnd: false
      };

      console.log('✅ Created subscription:', newSubscription);
      setSubscription(newSubscription);
      
      // Update user to mark trial as used
      const updatedUser = { ...currentUser, hasCompletedTrial: true };
      setUser(updatedUser);
      console.log('✅ Updated user with trial completion:', updatedUser);
      
      // Save to localStorage
      localStorage.setItem(`subscription_${currentUser.id}`, JSON.stringify(newSubscription));
      
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to start free trial' };
    } finally {
      setIsLoading(false);
    }
  };

  const createStripeCheckout = async (tierId: string): Promise<{ success: boolean; checkoutUrl?: string; error?: string }> => {
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    try {
      setIsLoading(true);
      
      const tier = pricingTiers.find(t => t.id === tierId);
      if (!tier) {
        return { success: false, error: 'Invalid pricing tier' };
      }

      // Call the Stripe API to create a checkout session
      const checkoutSession = await stripeAPI.createCheckoutSession({
        priceId: tier.stripePriceId,
        userId: user.id,
        email: user.email,
        trialDays: !user.hasCompletedTrial ? tier.trialDays : 0
      });
      
      return { success: true, checkoutUrl: checkoutSession.checkoutUrl };
    } catch (error) {
      console.error('Error creating Stripe checkout:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to create checkout session' };
    } finally {
      setIsLoading(false);
    }
  };

  const cancelSubscription = async (): Promise<{ success: boolean; error?: string }> => {
    if (!subscription) {
      return { success: false, error: 'No active subscription' };
    }

    try {
      setIsLoading(true);
      
      // In a real app, this would call your backend API to cancel the Stripe subscription
      const response = await fetch('/api/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: subscription.stripeSubscriptionId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      // Update subscription to cancel at period end
      const updatedSubscription = {
        ...subscription,
        cancelAtPeriodEnd: true
      };
      
      setSubscription(updatedSubscription);
      localStorage.setItem(`subscription_${user?.id}`, JSON.stringify(updatedSubscription));
      
      return { success: true };
    } catch (error) {
      // For demo purposes, still update locally
      const updatedSubscription = {
        ...subscription,
        cancelAtPeriodEnd: true
      };
      
      setSubscription(updatedSubscription);
      localStorage.setItem(`subscription_${user?.id}`, JSON.stringify(updatedSubscription));
      
      return { success: true };
    } finally {
      setIsLoading(false);
    }
  };

  const isInTrial = (): boolean => {
    if (!subscription) return false;
    return subscription.status === 'trialing' && 
           subscription.trialEnd && 
           new Date(subscription.trialEnd) > new Date();
  };

  const getTrialDaysRemaining = (): number => {
    if (!subscription || !subscription.trialEnd) return 0;
    
    const trialEnd = new Date(subscription.trialEnd);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };

  const canAccessFeature = (feature: string): boolean => {
    if (!subscription) return false;
    
    const tier = pricingTiers.find(t => t.id === subscription.tierId);
    if (!tier) return false;
    
    // During trial or active subscription, user has access to all tier features
    if (subscription.status === 'trialing' || subscription.status === 'active') {
      return tier.features.some(f => f.toLowerCase().includes(feature.toLowerCase()));
    }
    
    return false;
  };

  const contextValue: SubscriptionContextType = {
    user,
    subscription,
    pricingTiers,
    isLoading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateReadingLevelSystem,
    startFreeTrial,
    createStripeCheckout,
    cancelSubscription,
    isInTrial,
    getTrialDaysRemaining,
    canAccessFeature
  };

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
};