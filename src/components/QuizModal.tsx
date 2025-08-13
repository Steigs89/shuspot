import React, { useState, useEffect } from 'react';
import { X, Award, RotateCcw } from 'lucide-react';
import Lottie from 'lottie-react';
import happyDogAnimation from '../assets/HappyDog.json';
import { useUserStats } from '../contexts/UserStatsContext';

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface QuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookTitle: string;
  bookCover: string;
  bookAuthor: string;
  questions: QuizQuestion[];
  onQuizComplete: (score: number, passed: boolean, badge?: string) => void;
  startDirectly?: boolean; // Skip intro and start quiz immediately
}

export default function QuizModal({
  isOpen,
  onClose,
  bookTitle,
  bookCover,
  bookAuthor,
  questions,
  onQuizComplete,
  startDirectly = false
}: QuizModalProps) {
  const [currentStep, setCurrentStep] = useState<'intro' | 'quiz' | 'results'>('intro');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [quizResults, setQuizResults] = useState<{
    score: number;
    passed: boolean;
    badge?: string;
  } | null>(null);

  // Reset quiz when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(startDirectly ? 'quiz' : 'intro');
      setCurrentQuestion(0);
      setSelectedAnswers([]);
      setQuizResults(null);
      setShowExitConfirm(false);
    }
  }, [isOpen, startDirectly]);

  const handleStartQuiz = () => {
    setCurrentStep('quiz');
  };

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate results
      const correctAnswers = selectedAnswers.reduce((count, answer, index) => {
        return answer === questions[index].correctAnswer ? count + 1 : count;
      }, 0);
      
      const score = Math.round((correctAnswers / questions.length) * 100);
      const passed = correctAnswers >= 3; // Need 3 out of 5 to pass
      const badge = passed ? 'Reading Champion' : undefined;
      
      const results = { score: correctAnswers, passed, badge };
      setQuizResults(results);
      setCurrentStep('results');
      onQuizComplete(correctAnswers, passed, badge);
    }
  };

  const handleRetakeQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswers([]);
    setQuizResults(null);
    setCurrentStep('quiz');
  };

  const handleClose = () => {
    if (currentStep === 'quiz' && selectedAnswers.length > 0) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  };

  const confirmExit = () => {
    setShowExitConfirm(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">
            {currentStep === 'intro' ? 'Quiz Time!' : 
             currentStep === 'quiz' ? `Question ${currentQuestion + 1} of ${questions.length}` :
             'Quiz Results'}
          </h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 'intro' && (
            <div className="text-center">
              {/* Book Cover */}
              <div className="w-32 aspect-[3/4] mx-auto rounded-lg overflow-hidden shadow-lg mb-4">
                <img
                  src={bookCover}
                  alt={bookTitle}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* Book Info */}
              <h3 className="text-2xl font-bold text-blue-600 mb-2">{bookTitle}</h3>
              <p className="text-gray-600 mb-1">Created by: {bookAuthor}</p>
              <p className="text-sm text-gray-500 mb-8">2nd Grade Teacher</p>
              
              {/* Start Quiz Button */}
              <button
                onClick={handleStartQuiz}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-6 rounded-full transition-colors flex items-center justify-center space-x-3 shadow-lg"
              >
                <Award className="w-6 h-6" />
                <span className="text-lg">Start Quiz</span>
              </button>
            </div>
          )}

          {currentStep === 'quiz' && (
            <div>
              {/* Progress Dots */}
              <div className="flex justify-center space-x-2 mb-8">
                {questions.map((_, index) => (
                  <div
                    key={index}
                    className={`w-3 h-3 rounded-full ${
                      index === currentQuestion
                        ? 'bg-blue-500'
                        : index < currentQuestion
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>

              {/* Question */}
              <div className="mb-8">
                <div className="text-center mb-6">
                  <div className="text-4xl mb-4">❓</div>
                  <h3 className="text-xl font-bold text-blue-600 mb-4">
                    {questions[currentQuestion].question}
                  </h3>
                </div>

                {/* Answer Options */}
                <div className="space-y-3">
                  {questions[currentQuestion].options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswerSelect(index)}
                      className={`w-full p-4 text-left rounded-xl border-2 transition-colors ${
                        selectedAnswers[currentQuestion] === index
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleNextQuestion}
                disabled={selectedAnswers[currentQuestion] === undefined}
                className={`w-full py-3 px-6 rounded-full font-bold transition-colors ${
                  selectedAnswers[currentQuestion] !== undefined
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {currentQuestion === questions.length - 1 ? 'Submit' : 'Next Question'}
              </button>
            </div>
          )}

          {currentStep === 'results' && quizResults && (
            <div className="text-center">
              {/* Results Icon - Happy Dog Animation for passing, emoji for not passing */}
              <div className="mb-4 flex justify-center">
                {quizResults.passed ? (
                  <div className="w-24 h-24">
                    <Lottie 
                      animationData={happyDogAnimation} 
                      loop={true}
                      autoplay={true}
                      className="w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="text-6xl">😊</div>
                )}
              </div>
              
              {/* Results Title */}
              <h3 className="text-2xl font-bold mb-2">
                {quizResults.passed ? 'Congratulations!' : 'Good Try!'}
              </h3>
              
              {/* Score */}
              <p className="text-lg text-gray-600 mb-6">
                You got {quizResults.score} out of {questions.length} questions correct!
              </p>
              
              {/* Badge or Encouragement */}
              {quizResults.passed ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                  <div className="text-2xl mb-2">🏆</div>
                  <p className="font-bold text-yellow-800">You earned the "{quizResults.badge}" badge!</p>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                  <p className="text-blue-800">You need 3 correct answers to earn a badge. Try again!</p>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="space-y-3">
                {!quizResults.passed && (
                  <button
                    onClick={handleRetakeQuiz}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-full transition-colors flex items-center justify-center space-x-2"
                  >
                    <RotateCcw className="w-5 h-5" />
                    <span>Try Again</span>
                  </button>
                )}
                
                <button
                  onClick={onClose}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-full transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
            <h3 className="text-xl font-bold text-blue-600 mb-4">Exit Quiz</h3>
            <p className="text-gray-600 mb-6">
              If you exit before finishing, your answers won't be saved!
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 bg-white hover:bg-gray-50 text-blue-500 font-bold py-3 px-4 rounded-full border-2 border-blue-500 transition-colors"
              >
                Never Mind
              </button>
              <button
                onClick={confirmExit}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-full transition-colors"
              >
                Exit Quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}