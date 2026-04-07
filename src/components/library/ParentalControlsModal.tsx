import { useState } from 'react';
import { X, Shield, Clock, BookOpen, Eye, EyeOff } from 'lucide-react';
import { ParentalSettings } from '../../types/library';
import { Z_INDEX } from '../../constants/library';
import { useTranslation } from '../../contexts/LanguageContext';
import { ParentalControlsPinModal } from './ParentalControlsPinModal';
import { ParentalControlsSettings } from './ParentalControlsSettings';

interface ParentalControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: ParentalSettings;
  onSave: (settings: ParentalSettings) => void;
}

const DEFAULT_VIDEO_CONTROLS = {
  dailyVideoLimit: false,
  dailyVideoMinutes: 40,
  restrictedHours: false,
  restrictedStartHour: 22,
  restrictedEndHour: 6,
  ageVerification: false,
  antiAddiction: false,
  antiAddictionInterval: 20,
  maxContentRating: 'G' as const,
  requireApproval: false,
  blockedChannels: [],
  allowedChannels: []
};

export default function ParentalControlsModal({
  isOpen,
  onClose,
  currentSettings,
  onSave
}: ParentalControlsModalProps) {
  const [step, setStep] = useState<'pin' | 'settings' | 'enhanced'>('pin');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const [showEnhancedSettings, setShowEnhancedSettings] = useState(false);
  const [settings, setSettings] = useState<ParentalSettings>({
    ...currentSettings,
    videoControls: currentSettings.videoControls || DEFAULT_VIDEO_CONTROLS
  });
  const { t } = useTranslation();

  if (!isOpen) return null;

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // For demo purposes, use a simple PIN check
    // In production, this should verify against a hashed PIN
    if (pin === '1234' || pin === currentSettings.pinProtection.pinHash) {
      setStep('settings');
      setPinError('');
    } else {
      setPinError(t('modal.parental.pin.error', 'Incorrect PIN. Try again.'));
      setPin('');
    }
  };

  const handlePinSuccess = () => {
    setShowEnhancedSettings(true);
  };

  const handleSave = () => {
    onSave(settings);
    onClose();
    setStep('pin');
    setPin('');
  };

  const handleClose = () => {
    onClose();
    setStep('pin');
    setPin('');
    setPinError('');
    setSettings(currentSettings); // Reset to original settings
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Enhanced Settings Modal */}
      {showEnhancedSettings && (
        <ParentalControlsSettings
          onClose={() => {
            setShowEnhancedSettings(false);
            handleClose();
          }}
        />
      )}

      {/* PIN Modal for Enhanced Settings */}
      <ParentalControlsPinModal
        isOpen={isOpen && !showEnhancedSettings && step === 'pin'}
        onClose={handleClose}
        onSuccess={handlePinSuccess}
        mode="verify"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: Z_INDEX.MODAL }}
      >
        <div
          className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto parental-controls-redesign"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {step === 'pin' ? (
            // PIN Entry Step - More Open Design
            <div className="p-12 text-center">
              {/* Header */}
              <div className="mb-12">
                <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: '#4ECDC4' }}>
                  <Shield className="w-10 h-10 text-white" />
                </div>
                <h2 id="modal-title" className="text-3xl font-bold text-gray-900 mb-4">
                  {t('modal.parental.title', 'Parental Controls')}
                </h2>
                <p className="text-lg text-gray-600">{t('modal.parental.pin.subtitle', 'Enter PIN to access settings')}</p>
                <button
                  onClick={handleClose}
                  className="absolute top-6 right-6 p-3 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              {/* PIN Form */}
              <form onSubmit={handlePinSubmit} className="max-w-md mx-auto space-y-8">
                <div>
                  <label htmlFor="pin" className="block text-lg font-medium text-gray-700 mb-4">
                    {t('modal.parental.pin.label', 'Enter PIN')}
                  </label>
                  <div className="relative">
                    <input
                      id="pin"
                      type={showPin ? 'text' : 'password'}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="w-full px-6 py-4 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-0 focus:border-pink-400 text-center text-3xl tracking-widest transition-colors"
                      placeholder="••••"
                      maxLength={4}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-2"
                    >
                      {showPin ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                    </button>
                  </div>
                  {pinError && (
                    <p className="mt-3 text-red-600 font-medium">{pinError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={pin.length < 4}
                  className={`w-full py-4 rounded-2xl font-semibold text-lg transition-all ${
                    pin.length >= 4
                      ? 'text-white hover:opacity-90 shadow-lg'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                  style={pin.length >= 4 ? { backgroundColor: '#d8609c' } : {}}
                >
                  {t('modal.parental.access.settings', 'Access Settings')}
                </button>
              </form>

              {/* Demo Note */}
              <div className="mt-8 p-6 rounded-2xl max-w-md mx-auto" style={{ backgroundColor: '#e2d051', color: '#8B4513' }}>
                <p className="font-medium">
                  <strong>🎯 Demo:</strong> Use PIN "1234" to access settings
                </p>
              </div>
            </div>
          ) : (
            // Settings Step - Open Card Design
            <div className="p-12">
              {/* Header */}
              <div className="text-center mb-12">
                <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ backgroundColor: '#4ECDC4' }}>
                  <Shield className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-4">Parental Controls</h2>
                <p className="text-lg text-gray-600">Manage your child's reading experience</p>
                <button
                  onClick={handleClose}
                  className="absolute top-6 right-6 p-3 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Close"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              {/* Settings Grid - Open Card Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                {/* Content Filtering Card */}
                <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-3xl p-8 border-2 border-teal-200">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#4ECDC4' }}>
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">📚 Content Filtering</h3>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        Maximum Grade Level
                      </label>
                      <select
                        value={settings.contentFiltering.maxGradeLevel}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          contentFiltering: {
                            ...prev.contentFiltering,
                            maxGradeLevel: e.target.value
                          }
                        }))}
                        className="w-full px-4 py-3 border-2 border-teal-200 rounded-xl focus:outline-none focus:border-teal-400 bg-white"
                      >
                        <option value="K">🎈 Kindergarten</option>
                        <option value="1">1️⃣ Grade 1</option>
                        <option value="2">2️⃣ Grade 2</option>
                        <option value="3">3️⃣ Grade 3</option>
                        <option value="4">4️⃣ Grade 4</option>
                        <option value="5">5️⃣ Grade 5</option>
                        <option value="6">6️⃣ Grade 6</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Time Limits Card */}
                <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-3xl p-8 border-2 border-pink-200">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#d8609c' }}>
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">⏰ Time Limits</h3>
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">Enable Time Limits</span>
                      <button
                        onClick={() => setSettings(prev => ({
                          ...prev,
                          timeLimits: {
                            ...prev.timeLimits,
                            enabled: !prev.timeLimits.enabled
                          }
                        }))}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                          settings.timeLimits.enabled ? '' : 'bg-gray-300'
                        }`}
                        style={settings.timeLimits.enabled ? { backgroundColor: '#d8609c' } : {}}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-lg ${
                            settings.timeLimits.enabled ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {settings.timeLimits.enabled && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-3">
                            📅 Daily Limit (minutes)
                          </label>
                          <input
                            type="number"
                            min="15"
                            max="480"
                            step="15"
                            value={settings.timeLimits.dailyMinutes}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              timeLimits: {
                                ...prev.timeLimits,
                                dailyMinutes: parseInt(e.target.value) || 60
                              }
                            }))}
                            className="w-full px-4 py-3 border-2 border-pink-200 rounded-xl focus:outline-none focus:border-pink-400 bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-3">
                            📊 Weekly Limit (minutes)
                          </label>
                          <input
                            type="number"
                            min="60"
                            max="2000"
                            step="30"
                            value={settings.timeLimits.weeklyMinutes}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              timeLimits: {
                                ...prev.timeLimits,
                                weeklyMinutes: parseInt(e.target.value) || 420
                              }
                            }))}
                            className="w-full px-4 py-3 border-2 border-pink-200 rounded-xl focus:outline-none focus:border-pink-400 bg-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reading Level Restrictions Card */}
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-3xl p-8 border-2 border-yellow-200">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#e2d051' }}>
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">🎯 Reading Level Restrictions</h3>
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">Enable Level Restrictions</span>
                      <button
                        onClick={() => setSettings(prev => ({
                          ...prev,
                          readingLevelRestrictions: {
                            ...prev.readingLevelRestrictions,
                            enabled: !prev.readingLevelRestrictions.enabled
                          }
                        }))}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                          settings.readingLevelRestrictions.enabled ? '' : 'bg-gray-300'
                        }`}
                        style={settings.readingLevelRestrictions.enabled ? { backgroundColor: '#e2d051' } : {}}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-lg ${
                            settings.readingLevelRestrictions.enabled ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Video Controls Card - China Compliance */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl p-8 border-2 border-blue-200">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#4ECDC4' }}>
                      <Shield className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">🇨🇳 Video Controls</h3>
                  </div>
                  <div className="space-y-6">
                    {/* Daily Video Time Limit */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-gray-700">📺 Daily Video Limit (40 min)</span>
                        <p className="text-xs text-gray-500 mt-1">China regulations: Max 40 min/day for minors</p>
                      </div>
                      <button
                        onClick={() => setSettings(prev => ({
                          ...prev,
                          videoControls: {
                            ...(prev.videoControls || DEFAULT_VIDEO_CONTROLS),
                            dailyVideoLimit: !(prev.videoControls?.dailyVideoLimit ?? false)
                          }
                        }))}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                          settings.videoControls?.dailyVideoLimit ? '' : 'bg-gray-300'
                        }`}
                        style={settings.videoControls?.dailyVideoLimit ? { backgroundColor: '#4ECDC4' } : {}}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform shadow-lg ${
                            settings.videoControls?.dailyVideoLimit ? 'translate-x-7' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Other video controls with similar styling... */}
                    <div className="text-xs text-blue-600 bg-blue-50 p-3 rounded-xl border border-blue-200">
                      <strong>🇨🇳 China Compliance:</strong> These settings help comply with China's regulations for minors' online content consumption.
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-6 justify-center">
                <button
                  onClick={handleClose}
                  className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-2xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-8 py-4 text-white rounded-2xl font-semibold hover:opacity-90 transition-all shadow-lg"
                  style={{ 
                    background: `linear-gradient(135deg, #d8609c 0%, #4ECDC4 100%)` 
                  }}
                >
                  💾 Save Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
