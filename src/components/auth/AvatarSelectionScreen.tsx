import React, { useState } from 'react';

interface AvatarSelectionScreenProps {
  onNext: () => void;
}

export default function AvatarSelectionScreen({ onNext }: AvatarSelectionScreenProps) {
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null);

  const avatars = [
    '🐱', '🐱', '🐱',
    '🐱', '🐱', '🐱',
    '🐱', '🐱', '🐱'
  ];

  const handleSubmit = () => {
    if (selectedAvatar !== null) {
      onNext();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-cyan-200 to-teal-200 flex items-center justify-center p-4">
      {/* Left Character */}
      <div className="absolute left-8 bottom-8 hidden lg:block">
        <div className="w-48 h-48 bg-blue-400 rounded-full relative">
          <div className="absolute inset-0 flex items-center justify-center text-6xl">
            🐦
          </div>
        </div>
      </div>

      {/* Right Character */}
      <div className="absolute right-8 bottom-8 hidden lg:block">
        <div className="w-48 h-48 bg-purple-400 rounded-full relative">
          <div className="absolute inset-0 flex items-center justify-center text-6xl">
            🦛
          </div>
        </div>
      </div>

      {/* Avatar Selection */}
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg">
        <h1 className="text-4xl font-bold text-gray-800 text-center mb-8">Pick an avatar</h1>
        
        <div className="grid grid-cols-3 gap-4 mb-8">
          {avatars.map((avatar, index) => (
            <button
              key={index}
              onClick={() => setSelectedAvatar(index)}
              className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all duration-300 ${
                selectedAvatar === index
                  ? 'bg-pink-100 ring-4 ring-pink-400 scale-110'
                  : 'bg-gray-100 hover:bg-gray-200 hover:scale-105'
              }`}
            >
              {avatar}
            </button>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={selectedAvatar === null}
          className={`w-full font-bold py-4 rounded-2xl transition-all duration-300 ${
            selectedAvatar !== null
              ? 'bg-gradient-to-r from-pink-400 to-pink-500 text-white hover:from-pink-500 hover:to-pink-600 shadow-lg'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}