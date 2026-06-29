'use client';

import React, { useState } from 'react';
import { ThemeToggle } from '../components/ThemeToggle';
import { Tabs, TabDefinition } from '../components/Tabs';
import { NotificationSettings } from '../components/settings/NotificationSettings';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<string>('appearance');

  const settingsTabs: TabDefinition[] = [
    {
      id: 'appearance',
      label: 'Appearance',
      content: (
        <section className="settings-group">
          <div className="settings-group__header">
            <h2 className="settings-group__title">Appearance</h2>
            <p className="settings-group__description">Customize how StreamPay looks on your device.</p>
          </div>
          <div className="settings-group__content">
            <ThemeToggle />
          </div>
        </section>
      ),
    },
    {
      id: 'notifications',
      label: 'Notifications',
      content: (
        <section className="settings-group">
          <div className="settings-group__header">
            <h2 className="settings-group__title">Notifications</h2>
            <p className="settings-group__description">
              Manage instant push prompts for GrantFox and keep email fallback ready for critical stream alerts.
            </p>
          </div>
          <div className="settings-group__content" style={{ marginTop: '1rem' }}>
            <NotificationSettings />
          </div>
        </section>
      ),
    },
  ];

  return (
    <main className="page-shell">
      <header className="page-hero">
        <div className="page-hero__content">
          <p className="page-hero__eyebrow">User Settings</p>
          <h1 className="page-hero__title">Preferences</h1>
          <p className="page-hero__description">
            Manage your account preferences and appearance settings.
          </p>
        </div>
      </header>

      <div className="settings-layout">
        <Tabs tabs={settingsTabs} defaultTabId={activeTab} onChange={setActiveTab} />
      </div>
    </main>
  );
}
