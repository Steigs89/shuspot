import React, { useState } from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import foxImg from '../../assets/Fox.png';
import deerImg from '../../assets/Deer.png';

interface SignupScreenProps {
  onNext: (userData: { fullName: string; email: string; password: string }) => void;
  onSwitchToLogin: () => void;
}

export default function SignupScreen({ onNext, onSwitchToLogin }: SignupScreenProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    onNext({ fullName, email, password });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-cyan-200 to-teal-200 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Left Character - Fox */}
      <div className="absolute left-0 bottom-0 hidden lg:block pointer-events-none">
        <img 
          src={foxImg} 
          alt="Fox" 
          className="h-auto drop-shadow-2xl"
          style={{ 
            width: '450px',
            transform: 'rotate(12deg) translateX(-8%) translateY(-10%)',
            transformOrigin: 'bottom left'
          }}
        />
      </div>

      {/* Right Character - Deer */}
      <div className="absolute right-0 bottom-0 hidden lg:block pointer-events-none">
        <img 
          src={deerImg} 
          alt="Deer" 
          className="h-auto drop-shadow-2xl"
          style={{ 
            width: '450px',
            transform: 'rotate(-12deg) scaleX(-1) translateX(8%) translateY(-10%)',
            transformOrigin: 'bottom right'
          }}
        />
      </div>

      {/* Signup Form */}
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
        <h1 className="text-4xl font-bold text-gray-800 text-center mb-4">Sign up</h1>
        <p className="text-gray-600 text-center mb-6">Join our community and start using Shu Spot!</p>
        <p className="text-gray-800 font-bold text-center mb-8">Step 1 of 4</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Smith"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="johnsmith@gmail.com"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
              required
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
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">Re-enter password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-pink-400 to-pink-500 text-white font-bold py-4 rounded-2xl hover:from-pink-500 hover:to-pink-600 transition-all duration-300 shadow-lg"
          >
            Continue
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