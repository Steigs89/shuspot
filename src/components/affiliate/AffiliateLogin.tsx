import { useState } from 'react';

interface Props {
  onLogin: () => void;
}

export default function AffiliateLogin({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="min-h-screen bg-[#1a1d2e] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black bg-gradient-to-r from-brand-pink to-brand-blue bg-clip-text text-transparent">ShuSpot</h1>
          <p className="text-white/40 mt-2 font-medium text-sm">Affiliate Partner Portal</p>
        </div>
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          <h2 className="text-xl font-black text-gray-800 mb-1">Welcome back 👋</h2>
          <p className="text-sm text-gray-400 mb-6">Sign in to your affiliate account</p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40 focus:border-brand-pink transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-pink/40 focus:border-brand-pink transition-all"
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-gray-500 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-300 text-brand-pink focus:ring-brand-pink" />
                Remember me
              </label>
              <a href="#" className="text-brand-pink font-bold hover:underline">Forgot password?</a>
            </div>
            <button
              onClick={onLogin}
              className="w-full bg-gradient-to-r from-brand-pink to-brand-blue text-white py-3.5 rounded-xl font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-brand-pink/20"
            >
              Sign In
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-white/30 mt-6">
          Not an affiliate yet? <a href="#" className="text-brand-pink font-bold hover:underline">Apply here</a>
        </p>
      </div>
    </div>
  );
}
