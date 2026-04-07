import React, { useState } from 'react';
import { ContentBlockingPanel } from './ContentBlockingPanel';
import { SubscriptionManagementPanel } from './SubscriptionManagementPanel';
import { ParentalControlsPinModal } from './ParentalControlsPinModal';
import { useParentalControlsContext } from '../../contexts/ParentalControlsContext';
import './ParentalControlsSettings.css';

interface ParentalControlsSettingsProps {
  onClose: () => void;
}

export const ParentalControlsSettings: React.FC<ParentalControlsSettingsProps> = ({ onClose }) => {
  const { isEnabled } = useParentalControlsContext();
  const [activeTab, setActiveTab] = useState<'content' | 'subscription'>('content');
  const [showPinModal, setShowPinModal] = useState(true);
  const [pinVerified, setPinVerified] = useState(false);

  const handlePinSuccess = () => {
    setShowPinModal(false);
    setPinVerified(true);
  };

  const handleClose = () => {
    setShowPinModal(false);
    setPinVerified(false);
    onClose();
  };

  return (
    <>
      <ParentalControlsPinModal
        isOpen={showPinModal}
        onClose={handleClose}
        onSuccess={handlePinSuccess}
        mode={isEnabled ? 'verify' : 'create'}
      />

      {pinVerified && (
        <div className="parental-settings-overlay" onClick={handleClose}>
          <div className="parental-settings-content" onClick={(e) => e.stopPropagation()}>
            <div className="parental-settings-header">
              <h2>Parental Controls</h2>
              <button className="parental-settings-close" onClick={handleClose}>×</button>
            </div>

            <div className="parental-settings-tabs">
              <button
                className={`tab-btn ${activeTab === 'content' ? 'active' : ''}`}
                onClick={() => setActiveTab('content')}
              >
                Content Management
              </button>
              <button
                className={`tab-btn ${activeTab === 'subscription' ? 'active' : ''}`}
                onClick={() => setActiveTab('subscription')}
              >
                Subscription Management
              </button>
            </div>

            <div className="parental-settings-body">
              {activeTab === 'content' && <ContentBlockingPanel />}
              {activeTab === 'subscription' && <SubscriptionManagementPanel />}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
