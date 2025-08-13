import React, { useState } from 'react';

interface DifficultySelectionScreenProps {
  onComplete: (readingLevelSystem: string) => void;
}

export default function DifficultySelectionScreen({ onComplete }: DifficultySelectionScreenProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);

  const difficulties = [
    'US-RAZ',
    'US-Grades',
    'US-Lexile',
    'US-AR',
    'UK-OTR'
  ];

  const handleSubmit = () => {
    if (selectedDifficulty) {
      onComplete(selectedDifficulty);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-200 via-cyan-200 to-teal-200 flex items-center justify-center p-4">
      {/* Left Character */}
      <div className="absolute left-8 bottom-8 hidden lg:block">
        <div className="w-48 h-48 bg-yellow-400 rounded-full relative">
          <div className="absolute inset-0 flex items-center justify-center text-6xl">
            🦒
          </div>
        </div>
      </div>

      {/* Right Character */}
      <div className="absolute right-8 bottom-8 hidden lg:block">
        <div className="w-48 h-48 bg-orange-300 rounded-full relative">
          <div className="absolute inset-0 flex items-center justify-center text-6xl">
            🐵
          </div>
        </div>
      </div>

      {/* Difficulty Selection */}
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg">
        <h1 className="text-4xl font-bold text-gray-800 text-center mb-4">English Level Difficulty</h1>
        <p className="text-gray-600 text-center mb-8">
          Our materials are correlated with English standard academics, find out more here.
        </p>
        
        <div className="space-y-4 mb-8">
          {difficulties.map((difficulty) => (
            <div
              key={difficulty}
              onClick={() => setSelectedDifficulty(difficulty)}
              className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-300 ${
                selectedDifficulty === difficulty
                  ? 'border-pink-400 bg-pink-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-800">{difficulty}</span>
                <div className="flex items-center space-x-2">
                  <div className={`w-5 h-5 rounded-full border-2 ${
                    selectedDifficulty === difficulty
                      ? 'border-pink-400 bg-pink-400'
                      : 'border-gray-300'
                  }`}>
                    {selectedDifficulty === difficulty && (
                      <div className="w-full h-full rounded-full bg-white scale-50"></div>
                    )}
                  </div>
                  <span className="font-medium text-gray-800">Select</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!selectedDifficulty}
          className={`w-full font-bold py-4 rounded-2xl transition-all duration-300 ${
            selectedDifficulty
              ? 'bg-gradient-to-r from-teal-400 to-cyan-400 text-white hover:from-teal-500 hover:to-cyan-500 shadow-lg'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
      </div>
    </div>
  );
}