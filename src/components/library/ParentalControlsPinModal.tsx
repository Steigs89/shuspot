import React, { useState } from 'react';
import { useParentalControlsContext } from '../../contexts/ParentalControlsContext';
import { validatePinFormat, checkPinStrength } from '../../api/pinService';
import './ParentalControlsPinModal.css';

interface ParentalControlsPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'verify' | 'create' | 'reset';
}

export const ParentalControlsPinModal: React.FC<ParentalControlsPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  mode
}) => {
  const { setupParentalControls, verifyPinCode } = useParentalControlsContext();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pinStrength, setPinStrength] = useState<string>('');

  if (!isOpen) return null;

  const handlePinInput = (digit: string) => {
    if (mode === 'create' && pin.length === 4 && confirmPin.length < 4) {
      // Entering confirmation PIN
      const newConfirmPin = confirmPin + digit;
      setConfirmPin(newConfirmPin);
      setError('');
    } else if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError('');
      
      // Check PIN strength for create mode
      if (mode === 'create' && newPin.length === 4) {
        const strength = checkPinStrength(newPin);
        setPinStrength(strength.message);
      }
    }
  };

  const handleDelete = () => {
    if (mode === 'create' && pin.length === 4 && confirmPin.length > 0) {
      // Deleting from confirmation PIN
      setConfirmPin(confirmPin.slice(0, -1));
    } else {
      setPin(pin.slice(0, -1));
      setPinStrength('');
    }
    setError('');
  };

  const handleSubmit = async () => {
    // Validate PIN format
    const validation = validatePinFormat(pin);
    if (!validation.valid) {
      setError(validation.error || 'Invalid PIN format');
      return;
    }

    if (mode === 'create') {
      if (confirmPin.length !== 4) {
        setError('Please confirm your PIN');
        return;
      }

      if (pin !== confirmPin) {
        setError('PINs do not match');
        setConfirmPin('');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'verify') {
        const isValid = await verifyPinCode(pin);
        if (isValid) {
          onSuccess();
        } else {
          setError('Incorrect PIN, please try again');
          setPin('');
        }
      } else if (mode === 'create') {
        const result = await setupParentalControls(pin);
        if (result.success) {
          onSuccess();
        } else {
          setError(result.error || 'Setup failed, please try again');
        }
      }
    } catch (err) {
      setError('Operation failed, please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleWeChatReset = () => {
    // TODO: Implement WeChat reset flow
    alert('WeChat reset feature coming soon');
  };

  return (
    <div className="pin-modal-overlay" onClick={onClose}>
      <div className="pin-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="pin-modal-close" onClick={onClose}>×</button>
        
        <h2 className="pin-modal-title">
          {mode === 'verify' && 'Enter Parental PIN'}
          {mode === 'create' && 'Set Parental PIN'}
          {mode === 'reset' && 'Reset Parental PIN'}
        </h2>

        <div className="pin-display">
          {[0, 1, 2, 3].map((i) => {
            const isConfirmMode = mode === 'create' && pin.length === 4;
            const currentPin = isConfirmMode ? confirmPin : pin;
            return (
              <div key={i} className={`pin-dot ${currentPin.length > i ? 'filled' : ''}`} />
            );
          })}
        </div>

        {error && <div className="pin-error">{error}</div>}
        
        {pinStrength && !error && mode === 'create' && pin.length === 4 && confirmPin.length === 0 && (
          <div className="pin-strength">{pinStrength}</div>
        )}

        {mode === 'create' && pin.length === 4 && confirmPin.length < 4 && (
          <div className="pin-confirm-prompt">Please enter PIN again to confirm</div>
        )}

        <div className="pin-keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              className="pin-key"
              onClick={() => handlePinInput(num.toString())}
              disabled={loading}
            >
              {num}
            </button>
          ))}
          <button className="pin-key pin-key-empty" disabled />
          <button
            className="pin-key"
            onClick={() => handlePinInput('0')}
            disabled={loading}
          >
            0
          </button>
          <button
            className="pin-key pin-key-delete"
            onClick={handleDelete}
            disabled={loading}
          >
            ⌫
          </button>
        </div>

        <div className="pin-actions">
          {mode === 'verify' && (
            <button className="pin-reset-link" onClick={handleWeChatReset}>
              Forgot PIN? Reset via WeChat
            </button>
          )}
          
          <button
            className="pin-submit-btn"
            onClick={handleSubmit}
            disabled={loading || pin.length !== 4}
          >
            {loading ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};
