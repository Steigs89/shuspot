import { useState } from 'react';
import { BookOpen, Star, Target } from 'lucide-react';
import { READING_SYSTEMS, Z_INDEX } from '../../constants/library';
import { ReadingSystem } from '../../contexts/NavigationContext';
import { useTranslation } from '../../contexts/LanguageContext';

interface FirstLoginModalProps {
  isOpen: boolean;
  onComplete: (readingSystem: ReadingSystem) => void;
}

export default function FirstLoginModal({
  isOpen,
  onComplete
}: FirstLoginModalProps) {
  const [selectedSystem, setSelectedSystem] = useState<ReadingSystem | null>(null);
  const [step, setStep] = useState<'welcome' | 'selection'>('welcome');
  const { t } = useTranslation();

  if (!isOpen) return null;

  const handleSystemSelect = (systemId: ReadingSystem) => {
    setSelectedSystem(systemId);
  };

  const handleContinue = () => {
    if (selectedSystem) {
      onComplete(selectedSystem);
    }
  };

  const getSystemIcon = (systemId: string) => {
    switch (systemId) {
      case 'Grade':
        return <BookOpen className="w-8 h-8 text-blue-500" />;
      case 'RAZ':
        return <Star className="w-8 h-8 text-yellow-500" />;
      case 'Lexile':
        return <Target className="w-8 h-8 text-green-500" />;
      default:
        return <BookOpen className="w-8 h-8 text-gray-500" />;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 backdrop-blur-sm"
        style={{ 
          background: 'linear-gradient(135deg, rgba(161, 206, 211, 0.8), rgba(216, 96, 156, 0.8), rgba(226, 208, 81, 0.8))',
          zIndex: Z_INDEX.MODAL_BACKDROP 
        }}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: Z_INDEX.MODAL }}
      >
        <div
          className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {step === 'welcome' ? (
            // Welcome Step
            <div className="p-8 text-center">
              {/* Header */}
              <div className="mb-8">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: '#d8609c' }}>
                  <BookOpen className="w-10 h-10 text-white" />
                </div>
                <h1 id="modal-title" className="text-3xl font-black mb-4" style={{ color: '#a1ced3' }}>
                  {t('modal.welcome.title', 'Welcome to ShuSpot!')}
                </h1>
                <p className="text-lg text-gray-600 max-w-md mx-auto">
                  {t('modal.welcome.subtitle', "Let's personalize your reading experience to help you find the perfect books.")}
                </p>
              </div>

              {/* Features */}
              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#a1ced3' }}>
                    <BookOpen className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold mb-2" style={{ color: '#a1ced3' }}>{t('modal.welcome.personalized.title', 'Personalized Books')}</h3>
                  <p className="text-sm text-gray-600">{t('modal.welcome.personalized.description', 'Books matched to your reading level')}</p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#d8609c' }}>
                    <Star className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="font-bold mb-2" style={{ color: '#a1ced3' }}>{t('modal.welcome.progress.title', 'Track Progress')}</h3>
                  <p className="text-sm text-gray-600">{t('modal.welcome.progress.description', "See how much you've read and learned")}</p>
                </div>

                <div className="text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#e2d051' }}>
                    <Target className="w-8 h-8 text-gray-900" />
                  </div>
                  <h3 className="font-bold mb-2" style={{ color: '#a1ced3' }}>{t('modal.welcome.discover.title', 'Discover New Stories')}</h3>
                  <p className="text-sm text-gray-600">{t('modal.welcome.discover.description', 'Explore thousands of amazing books')}</p>
                </div>
              </div>

              {/* Continue Button */}
              <button
                onClick={() => setStep('selection')}
                className="text-white px-8 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-lg"
                style={{ backgroundColor: '#d8609c' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#c54d89'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#d8609c'}
              >
                {t('modal.welcome.get.started', "Let's Get Started!")}
              </button>
            </div>
          ) : (
            // Reading System Selection Step
            <div className="p-8">
              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-black mb-4" style={{ color: '#a1ced3' }}>
                  {t('modal.reading.system.title', 'Choose Your Reading System')}
                </h2>
                <p className="text-gray-600 max-w-lg mx-auto">
                  {t('modal.reading.system.subtitle', "This helps us show you books at the right level. Don't worry, you can change this later!")}
                </p>
              </div>

              {/* Reading System Options */}
              <div className="space-y-4 mb-8">
                {READING_SYSTEMS.map((system) => (
                  <button
                    key={system.id}
                    onClick={() => handleSystemSelect(system.id as ReadingSystem)}
                    className={`w-full text-left p-6 rounded-2xl border-2 transition-all hover:shadow-lg ${
                      selectedSystem === system.id
                        ? 'shadow-lg'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={selectedSystem === system.id ? { borderColor: '#d8609c', backgroundColor: '#fdf2f8' } : {}}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        {getSystemIcon(system.id)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-bold" style={{ color: '#a1ced3' }}>
                            {system.name}
                          </h3>
                          {selectedSystem === system.id && (
                            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: '#d8609c' }}>
                              <svg
                                className="w-4 h-4 text-white"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path d="M5 13l4 4L19 7"></path>
                              </svg>
                            </div>
                          )}
                        </div>
                        <p className="text-gray-600">{system.description}</p>

                        {/* Additional info for each system */}
                        {system.id === 'Grade' && (
                          <div className="mt-3 text-sm text-gray-500">
                            {t('modal.reading.system.grade.description', 'Perfect for: Students following standard grade levels (K-6)')}
                          </div>
                        )}
                        {system.id === 'RAZ' && (
                          <div className="mt-3 text-sm text-gray-500">
                            {t('modal.reading.system.raz.description', 'Perfect for: Guided reading programs and detailed leveling')}
                          </div>
                        )}
                        {system.id === 'Lexile' && (
                          <div className="mt-3 text-sm text-gray-500">
                            {t('modal.reading.system.lexile.description', 'Perfect for: Precise reading ability measurement')}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={() => setStep('welcome')}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  {t('common.back', 'Back')}
                </button>
                <button
                  onClick={handleContinue}
                  disabled={!selectedSystem}
                  className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all ${
                    selectedSystem
                      ? 'text-white shadow-lg'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  style={selectedSystem ? { backgroundColor: '#d8609c' } : {}}
                  onMouseEnter={(e) => selectedSystem && (e.currentTarget.style.backgroundColor = '#c54d89')}
                  onMouseLeave={(e) => selectedSystem && (e.currentTarget.style.backgroundColor = '#d8609c')}
                >
                  {t('modal.reading.system.start.reading', 'Start Reading!')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
