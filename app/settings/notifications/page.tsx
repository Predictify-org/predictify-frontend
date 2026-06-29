'use client';

import React from 'react';
import { NotificationSettings } from '../../components/settings/NotificationSettings';
import { useToast } from '../../hooks/useToast';

export default function NotificationsPage() {
  const { success } = useToast();

  const handleSave = () => {
    success('Notification preferences saved successfully.');
  };

  return (
    <main className="page-shell">
      <header className="page-hero">
        <div className="page-hero__content">
          <p className="page-hero__eyebrow">User Settings</p>
          <h1 className="page-hero__title">Notifications</h1>
          <p className="page-hero__description">
            Manage instant push prompts for GrantFox and keep email fallback ready for critical stream alerts.
          </p>
        </div>
      </header>

      <div className="settings-layout">
        <NotificationSettings showSaveButton onSave={handleSave} />
      </div>
    </main>
  );
}
