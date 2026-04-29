'use client';

import React, { useState } from 'react';
import { NotificationGroup } from '../components/settings/NotificationGroup';
import { SettingItem } from '../components/settings/SettingItem';

export default function SettingsPage() {
  // State for Money Movement
  const [prefs, setPrefs] = useState({
    streamStarted: { inApp: true, email: true },
    streamPaused: { inApp: true, email: true },
    fundingLow: { inApp: true, email: false },
    settlementFailed: { inApp: true, email: true },
    productUpdates: { inApp: false, email: false },
    communityNews: { inApp: false, email: false },
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = (key: keyof typeof prefs, channel: 'inApp' | 'email', value: boolean) => {
    setPrefs((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [channel]: value,
      },
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    
    // Simulate API call
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      setError('Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="page-shell">
      <header className="page-hero">
        <div className="page-hero__content">
          <p className="page-hero__eyebrow">User Settings</p>
          <h1 className="page-hero__title">Notifications</h1>
          <p className="page-hero__description">
            Manage how you receive alerts for your payment streams and account activity.
          </p>
        </div>
      </header>

      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}

      <div className="settings-layout">
        <NotificationGroup 
          title="Money Movement" 
          description="Critical alerts regarding your payment streams and Stellar network status."
        >
          <SettingItem
            id="stream-started"
            label="Stream Started"
            description="When a new payment stream is successfully initiated."
            inApp={prefs.streamStarted.inApp}
            email={prefs.streamStarted.email}
            onInAppChange={(v) => handleToggle('streamStarted', 'inApp', v)}
            onEmailChange={(v) => handleToggle('streamStarted', 'email', v)}
          />
          <SettingItem
            id="stream-paused"
            label="Stream Paused"
            description="When a stream is paused by you or the recipient."
            inApp={prefs.streamPaused.inApp}
            email={prefs.streamPaused.email}
            onInAppChange={(v) => handleToggle('streamPaused', 'inApp', v)}
            onEmailChange={(v) => handleToggle('streamPaused', 'email', v)}
          />
          <SettingItem
            id="funding-low"
            label="Funding Low"
            description="Warning when your source balance is insufficient for future payments."
            inApp={prefs.fundingLow.inApp}
            email={prefs.fundingLow.email}
            onInAppChange={(v) => handleToggle('fundingLow', 'inApp', v)}
            onEmailChange={(v) => handleToggle('fundingLow', 'email', v)}
          />
          <SettingItem
            id="settlement-failed"
            label="Settlement Failed"
            description="Immediate alert if an on-chain transaction fails."
            inApp={prefs.settlementFailed.inApp}
            email={prefs.settlementFailed.email}
            onInAppChange={(v) => handleToggle('settlementFailed', 'inApp', v)}
            onEmailChange={(v) => handleToggle('settlementFailed', 'email', v)}
          />
        </NotificationGroup>

        <NotificationGroup 
          title="Product Information" 
          description="Stay updated with the latest from StreamPay."
        >
          <SettingItem
            id="product-updates"
            label="Product Updates"
            description="New features, enhancements, and technical updates."
            inApp={prefs.productUpdates.inApp}
            email={prefs.productUpdates.email}
            onInAppChange={(v) => handleToggle('productUpdates', 'inApp', v)}
            onEmailChange={(v) => handleToggle('productUpdates', 'email', v)}
          />
          <SettingItem
            id="community-news"
            label="Community News"
            description="Updates from the StreamPay DAO and ecosystem."
            inApp={prefs.communityNews.inApp}
            email={prefs.communityNews.email}
            onInAppChange={(v) => handleToggle('communityNews', 'inApp', v)}
            onEmailChange={(v) => handleToggle('communityNews', 'email', v)}
          />
        </NotificationGroup>

        <div className="settings-actions">
          <button 
            className="button button--primary" 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {showToast && (
        <div className="toast" role="status">
          Notification preferences saved successfully.
        </div>
      )}
    </main>
  );
}
