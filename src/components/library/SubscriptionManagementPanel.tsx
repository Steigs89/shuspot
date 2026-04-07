import React, { useState } from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';
import './SubscriptionManagementPanel.css';

export const SubscriptionManagementPanel: React.FC = () => {
  const { subscription } = useSubscription();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const handleCancelSubscription = async () => {
    setCanceling(true);
    try {
      // TODO: Implement subscription cancellation API
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Subscription cancelled');
      setShowCancelConfirm(false);
    } catch (err) {
      alert('Cancellation failed, please try again');
    } finally {
      setCanceling(false);
    }
  };

  const handleChangeSubscription = () => {
    // TODO: Navigate to subscription change flow
    alert('Subscription change feature coming soon');
  };

  return (
    <div className="subscription-management-panel">
      <section className="subscription-info">
        <h3>Current Subscription</h3>
        
        <div className="info-card">
          <div className="info-row">
            <span className="info-label">Status:</span>
            <span className={`info-value status-${subscription?.status || 'inactive'}`}>
              {subscription?.status === 'active' ? 'Active' : 'Inactive'}
            </span>
          </div>
          
          <div className="info-row">
            <span className="info-label">Plan:</span>
            <span className="info-value">
              {subscription?.plan || 'None'}
            </span>
          </div>
          
          {subscription?.nextBillingDate && (
            <div className="info-row">
              <span className="info-label">Next Billing Date:</span>
              <span className="info-value">
                {new Date(subscription.nextBillingDate).toLocaleDateString('en-US')}
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="subscription-actions">
        <h3>Subscription Management</h3>
        
        <div className="action-buttons">
          <button
            className="action-btn change-btn"
            onClick={handleChangeSubscription}
          >
            <span className="btn-icon">🔄</span>
            <div className="btn-content">
              <div className="btn-title">Change Subscription Plan</div>
              <div className="btn-description">Upgrade or downgrade your subscription</div>
            </div>
          </button>

          <button
            className="action-btn cancel-btn"
            onClick={() => setShowCancelConfirm(true)}
          >
            <span className="btn-icon">⚠️</span>
            <div className="btn-content">
              <div className="btn-title">Cancel Subscription</div>
              <div className="btn-description">Stop automatic renewal</div>
            </div>
          </button>
        </div>
      </section>

      {showCancelConfirm && (
        <div className="confirm-overlay" onClick={() => setShowCancelConfirm(false)}>
          <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Cancellation</h3>
            <p>After cancellation, you will lose access at the end of your current billing period.</p>
            <p>Are you sure you want to cancel your subscription?</p>
            
            <div className="confirm-actions">
              <button
                className="confirm-btn cancel"
                onClick={() => setShowCancelConfirm(false)}
                disabled={canceling}
              >
                Go Back
              </button>
              <button
                className="confirm-btn confirm"
                onClick={handleCancelSubscription}
                disabled={canceling}
              >
                {canceling ? 'Processing...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
