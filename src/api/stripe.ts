// This file contains the API functions for Stripe integration
// These would typically call your backend API endpoints

export interface CreateCheckoutSessionRequest {
  priceId: string;
  userId: string;
  email: string;
  trialDays: number;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CreateCheckoutSessionResponse {
  checkoutUrl: string;
  sessionId: string;
}

export interface CancelSubscriptionRequest {
  subscriptionId: string;
}

export interface WebhookEvent {
  type: string;
  data: {
    object: any;
  };
}

// API Base URL - replace with your actual backend URL
const API_BASE_URL = 'http://localhost:3001/api';

export const stripeAPI = {
  // Create Stripe Checkout Session
  createCheckoutSession: async (request: CreateCheckoutSessionRequest): Promise<CreateCheckoutSessionResponse> => {
    const response = await fetch(`${API_BASE_URL}/stripe/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...request,
        successUrl: request.successUrl || `${window.location.origin}/auth/success`,
        cancelUrl: request.cancelUrl || `${window.location.origin}/auth/cancel`,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create checkout session');
    }

    return response.json();
  },

  // Cancel Subscription
  cancelSubscription: async (request: CancelSubscriptionRequest): Promise<{ success: boolean }> => {
    const response = await fetch(`${API_BASE_URL}/stripe/cancel-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to cancel subscription');
    }

    return response.json();
  },

  // Get Customer Portal URL
  createCustomerPortal: async (customerId: string): Promise<{ url: string }> => {
    const response = await fetch(`${API_BASE_URL}/stripe/create-customer-portal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ customerId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create customer portal');
    }

    return response.json();
  },

  // Verify subscription status
  verifySubscription: async (subscriptionId: string): Promise<any> => {
    const response = await fetch(`${API_BASE_URL}/stripe/verify-subscription/${subscriptionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to verify subscription');
    }

    return response.json();
  }
};