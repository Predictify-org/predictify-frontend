'use client';

import React, { useState } from 'react';
import { PushOptIn } from '../PushOptIn';
import { NotificationGroup } from './NotificationGroup';
import { SettingItem } from './SettingItem';

interface NotificationPreferences {
  streamStarted: { inApp: boolean; email: boolean };
  streamPaused: { inApp: boolean; email: boolean };
  fundingLow: { inApp: boolean; email: boolean };
  settlementFailed: { inApp: boolean; email: boolean };
  productUpdates: { inApp: boolean; email: boolean };
  communityNews: { inApp: boolean; email: boolean };
  pushFallback: boolean;
}

interface NotificationSettingsProps {
  onSave?: () => void;
  showSaveButton?: boolean;
}

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  onSave,
  showSaveButton = false,
}) => {
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    streamStarted: { inApp: true, email: true },
    streamPaused: { inApp: true, email: true },
    fundingLow: { inApp: true, email: false },
    settlementFailed: { inApp: true, email: true },
    productUpdates: { inApp: false, email: false },
    communityNews: { inApp: false, email: false },
    pushFallback: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = (
    key: keyof Omit<typeof prefs, 'pushFallback'>,
    channel: 'inApp' | 'email',
    value: boolean
  ) => {
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

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onSave?.();
    } catch {
      setError('Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}

      <PushOptIn
        emailFallbackEnabled={prefs.pushFallback}
        onEmailFallbackChange={(nextValue) =>
          setPrefs((prev) => ({
            ...prev,
            pushFallback: nextValue,
          }))
        }
      />

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
          onInAppChange={(value) => handleToggle('streamStarted', 'inApp', value)}
          onEmailChange={(value) => handleToggle('streamStarted', 'email', value)}
        />
        <SettingItem
          id="stream-paused"
          label="Stream Paused"
          description="When a stream is paused by you or the recipient."
          inApp={prefs.streamPaused.inApp}
          email={prefs.streamPaused.email}
          onInAppChange={(value) => handleToggle('streamPaused', 'inApp', value)}
          onEmailChange={(value) => handleToggle('streamPaused', 'email', value)}
        />
        <SettingItem
          id="funding-low"
          label="Funding Low"
          description="Warning when your source balance is insufficient for future payments."
          inApp={prefs.fundingLow.inApp}
          email={prefs.fundingLow.email}
          onInAppChange={(value) => handleToggle('fundingLow', 'inApp', value)}
          onEmailChange={(value) => handleToggle('fundingLow', 'email', value)}
        />
        <SettingItem
          id="settlement-failed"
          label="Settlement Failed"
          description="Immediate alert if an on-chain transaction fails."
          inApp={prefs.settlementFailed.inApp}
          email={prefs.settlementFailed.email}
          onInAppChange={(value) => handleToggle('settlementFailed', 'inApp', value)}
          onEmailChange={(value) => handleToggle('settlementFailed', 'email', value)}
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
          onInAppChange={(value) => handleToggle('productUpdates', 'inApp', value)}
          onEmailChange={(value) => handleToggle('productUpdates', 'email', value)}
        />
        <SettingItem
          id="community-news"
          label="Community News"
          description="Updates from the StreamPay DAO and ecosystem."
          inApp={prefs.communityNews.inApp}
          email={prefs.communityNews.email}
          onInAppChange={(value) => handleToggle('communityNews', 'inApp', value)}
          onEmailChange={(value) => handleToggle('communityNews', 'email', value)}
        />
      </NotificationGroup>

      {showSaveButton && (
        <div className="settings-actions">
          <button
            className="button button--primary"
            disabled={isSaving}
            onClick={handleSave}
            type="button"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </>
  );
};
