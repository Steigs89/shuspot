import React, { useState } from 'react';
import hippoImg from '../../assets/Hippo.png';
import deerImg from '../../assets/Deer.png';

interface CreateProfileScreenProps {
  onNext: (childName: string, dateOfBirth: string) => void;
  onBack: () => void;
}

export default function CreateProfileScreen({ onNext, onBack }: CreateProfileScreenProps) {
  const [childName, setChildName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (childName && dateOfBirth) {
      onNext(childName, dateOfBirth);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-cyan-200 to-teal-200 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="absolute top-8 left-8 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
      >
        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Logo */}
      <div className="absolute top-8 right-8 text-gray-700 font-bold text-xl">
        ShuSpot<br />Logo
      </div>

      {/* Left Character - Hippo */}
      <div className="absolute left-0 bottom-0 hidden lg:block pointer-events-none">
        <img 
          src={hippoImg} 
          alt="Hippo" 
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
            transform: 'rotate(-12deg) scaleX(-1) translateX(88%) translateY(-10%)',
            transformOrigin: 'bottom right'
          }}
        />
      </div>

      {/* Create Profile Form */}
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md relative z-10">
        <h1 className="text-4xl font-bold text-gray-800 text-center mb-4">Create Profile</h1>
        <p className="text-gray-600 text-center mb-6">
          A confirmation email has been sent,<br />please create the child's profile.
        </p>
        
        {/* Avatar Preview */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center">
              <span className="text-5xl">🐥</span>
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-400 transition-colors">
              <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="text"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              placeholder="Child's Name"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              required
            />
          </div>

          <div>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              placeholder="Date of Birth"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-gray-700"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-400 to-blue-500 text-white font-bold py-4 rounded-2xl hover:from-blue-500 hover:to-blue-600 transition-all duration-300 shadow-lg"
          >
            Continue
          </button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-6">
          By clicking Continue you agree to<br />
          <span className="text-blue-500">ShuSpot Terms Of Service</span> and <span className="text-blue-500">Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}
