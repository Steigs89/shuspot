import React, { useState } from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';

interface LoginScreenProps {
  onLogin: () => void;
  onSwitchToSignup: () => void;
}

export default function LoginScreen({ onLogin, onSwitchToSignup }: LoginScreenProps) {
  const { signIn, resetPassword, isLoading } = useSubscription();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      const result = await signIn(email, password);
      
      if (result.success) {
        onLogin(); // Only call onLogin if authentication succeeds
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (error) {
      setError('An error occurred during login');
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first');
      return;
    }

    setIsResettingPassword(true);
    setError('');

    try {
      const result = await resetPassword(email);
      
      if (result.success) {
        setResetEmailSent(true);
      } else {
        setError(result.error || 'Failed to send reset email');
      }
    } catch (error) {
      setError('An error occurred while sending reset email');
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-cyan-200 to-teal-200 flex items-center justify-center p-4">
      {/* Left Character */}
      <div className="absolute left-8 bottom-8 hidden lg:block">
        <div className="w-48 h-48 bg-orange-400 rounded-full relative">
          {/* Fox character placeholder */}
          <div className="absolute inset-0 flex items-center justify-center text-6xl">
            🦊
          </div>
        </div>
      </div>

      {/* Right Character */}
      <div className="absolute right-3 bottom-3 hidden lg:block">
        <div className="w-48 h-48 bg-gray-500 rounded-full relative">
          {/* Rabbit character placeholder */}
          <div className="absolute inset-0 flex items-center justify-center text-6xl">
         <img src="src/assets/image-from-rawpixel-id-6484055-png.png" alt="Login illustration" width="1200" />
          </div>
        </div>
      </div>

      {/* Login Form */}
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-4xl font-bold text-gray-800 text-center mb-8">Log In</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Success Message for Password Reset */}
          {resetEmailSent && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl">
              <div className="flex items-center space-x-2">
                <span>✅</span>
                <div>
                  <p className="font-medium">Password reset email sent!</p>
                  <p className="text-sm">Check your inbox and follow the instructions to reset your password.</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-gray-700 font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="johnsmith@gmail.com"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
              required
              disabled={isLoading}
            />
          </div>

          <div className="text-center space-y-2">
            <div>
              <span className="text-gray-600">Don't have an account? </span>
              <button
                type="button"
                onClick={onSwitchToSignup}
                className="text-pink-500 font-medium hover:text-pink-600 transition-colors"
              >
                Register
              </button>
            </div>
            <div>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isResettingPassword}
                className="text-blue-500 font-medium hover:text-blue-600 transition-colors disabled:opacity-50"
              >
                {isResettingPassword ? 'Sending...' : 'Forgot Password?'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full font-bold py-4 rounded-2xl transition-all duration-300 shadow-lg ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-pink-400 to-pink-500 text-white hover:from-pink-500 hover:to-pink-600'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Signing In...</span>
              </div>
            ) : (
              'Continue'
            )}
          </button>

          <div className="text-center text-gray-500 font-medium">or</div>

          <button
            type="button"
            className="w-full bg-black text-white font-bold py-4 rounded-2xl hover:bg-gray-800 transition-colors"
          >
            WeChat
          </button>
        </form>
      </div>
    </div>
  );
}