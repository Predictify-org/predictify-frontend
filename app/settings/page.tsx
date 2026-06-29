import React from 'react';
import Link from 'next/link';
import { ThemeToggle } from '../components/ThemeToggle';

export default function SettingsPage() {
  return (
    <main className="page-shell">
      <header className="page-hero">
        <div className="page-hero__content">
          <p className="page-hero__eyebrow">User Settings</p>
          <h1 className="page-hero__title">General</h1>
          <p className="page-hero__description">
            Manage your account preferences and appearance settings.
          </p>
        </div>
      </header>

      <div className="settings-layout">
        <section className="settings-group">
          <div className="settings-group__header">
            <h2 className="settings-group__title">Appearance</h2>
            <p className="settings-group__description">Customize how StreamPay looks on your device.</p>
          </div>
          <div className="settings-group__content">
            <ThemeToggle />
          </div>
        </section>

        <section className="settings-group">
          <div className="settings-group__header">
            <h2 className="settings-group__title">Notifications</h2>
            <p className="settings-group__description">Manage your alerts and notification preferences.</p>
          </div>
          <div className="settings-group__content" style={{ marginTop: '1rem' }}>
            <Link href="/settings/notifications" className="button button--secondary">
              Configure Notifications
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
