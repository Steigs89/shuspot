import { X } from 'lucide-react';
import { READING_SYSTEMS, FICTION_TYPES } from '../../constants/library';
import { ReadingSystem } from '../../contexts/NavigationContext';
import { Z_INDEX } from '../../constants/library';
import { useTranslation } from '../../contexts/LanguageContext';

interface ReadingSystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSystem: ReadingSystem;
  onSystemChange: (system: ReadingSystem) => void;
}

export default function ReadingSystemModal({
  isOpen,
  onClose,
  currentSystem,
  onSystemChange
}: ReadingSystemModalProps) {
  const { t } = useTranslation();
  
  if (!isOpen) return null;

  const handleSystemSelect = (systemId: string) => {
    onSystemChange(systemId as ReadingSystem);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        style={{ zIndex: Z_INDEX.MODAL_BACKDROP }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 flex items-center justify-center p-4"
        style={{ zIndex: Z_INDEX.MODAL }}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 id="modal-title" className="text-2xl font-bold text-gray-900">
              {t('navigation.change.reading.system', 'Reading System')}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label={t('common.close', 'Close')}
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <p className="text-gray-600 mb-4">
              {t('modal.reading.system.description', 'Choose how you want books to be leveled:')}
            </p>

            {/* Reading System Options */}
            <div className="space-y-3">
              {READING_SYSTEMS.map((system) => (
                <button
                  key={system.id}
                  onClick={() => handleSystemSelect(system.id)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    currentSystem === system.id
                      ? 'border-brand-pink bg-pink-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-gray-900 mb-1">
                        {system.name}
                      </div>
                      <div className="text-sm text-gray-600">
                        {system.description}
                      </div>
                    </div>
                    {currentSystem === system.id && (
                      <div className="w-5 h-5 bg-brand-pink rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                        <svg
                          className="w-3 h-3 text-white"
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
                </button>
              ))}
            </div>

            {/* Fiction Type Dropdown - Placeholder for future */}
            <div className="pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('modal.fiction.type', 'Fiction Type')}
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-pink"
                defaultValue="all"
              >
                {FICTION_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
