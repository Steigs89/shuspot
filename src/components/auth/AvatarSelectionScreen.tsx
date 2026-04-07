import React, { useState } from 'react';
import giraffeImg from '../../assets/Giraffe.png';
import pandaImg from '../../assets/Panda.png';

interface AvatarSelectionScreenProps {
  onNext: (selectedAvatar: string) => void;
  onBack: () => void;
}

export default function AvatarSelectionScreen({ onNext, onBack }: AvatarSelectionScreenProps) {
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null);

  const avatars = [
    '🐶', '🐱', '🐰', 
    '🦊', '🐻', '🐼',
    '🐸', '🐙', '🦄',
    '🐯', '🦁', '🐨'
  ];

  const handleSubmit = () => {
    if (selectedAvatar !== null) {
      const avatar = avatars[selectedAvatar];
      console.log('🎭 Selected avatar:', avatar);
      onNext(avatar);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-cyan-200 to-teal-200 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="absolute top-8 left-8 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 z-20"
      >
        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Left Character - Giraffe */}
      <div className="absolute left-0 bottom-0 hidden lg:block pointer-events-none">
        <img 
          src={giraffeImg} 
          alt="Giraffe" 
          className="h-auto drop-shadow-2xl"
          style={{ 
            width: '450px',
            transform: 'rotate(12deg) translateX(-8%) translateY(-10%)',
            transformOrigin: 'bottom left'
          }}
        />
      </div>

      {/* Right Character - Panda */}
      <div className="absolute right-0 bottom-0 hidden lg:block pointer-events-none">
        <img 
          src={pandaImg} 
          alt="Panda" 
          className="h-auto drop-shadow-2xl"
          style={{ 
            width: '450px',
            transform: 'rotate(-12deg) scaleX(-1) translateX(88%) translateY(-10%)',
            transformOrigin: 'bottom right'
          }}
        />
      </div>

      {/* Avatar Selection */}
      <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-lg mx-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 text-center mb-6 sm:mb-8">Pick an avatar</h1>
        
        <div className="grid grid-cols-3 gap-6 mb-8 justify-items-center">
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