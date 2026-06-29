'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { GasOnRecipientToggle } from '../../components/GasOnRecipientToggle';
import { RecentRecipients } from './components/RecentRecipients';
import { addRecentRecipient } from '../../state/recentRecipients';

/**
 * New Stream page (single-recipient).
 *
 * Includes the gas-on-recipient toggle so the creator can explicitly
 * decide who bears the Stellar transaction fee, with the cost surfaced
 * inline before submission (#528).
 */
export default function NewStreamPage() {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState<'XLM' | 'USDC'>('XLM');
  const [gasOnRecipient, setGasOnRecipient] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // TODO: call stream creation API with { recipient, amount, token, gasOnRecipient }
    await new Promise((resolve) => setTimeout(resolve, 800));
    addRecentRecipient(recipient);
    setIsSubmitting(false);
    setSuccess(true);
  };

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--panel)',
    border: '1px solid var(--border)',
    color: 'var(--foreground)',
    padding: '0.75rem',
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--text-base)',
  };

  if (success) {
    return (
      <main className="page-shell">
        <section className="page-hero">
          <div>
            <p className="page-hero__eyebrow">Success</p>
            <h1 className="page-hero__title">Stream Created</h1>
            <p className="page-hero__description">Your stream is live.</p>
          </div>
          <Link href="/streams" className="button button--primary">View Streams</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="page-hero">
        <div>
          <p className="page-hero__eyebrow">New Stream</p>
          <h1 className="page-hero__title">Create Stream</h1>
          <p className="page-hero__description">
            Set up a continuous payment stream to a Stellar address.
          </p>
        </div>
      </section>

      <section style={{ maxWidth: '560px', margin: '0 auto', padding: '0 1.5rem' }}>
        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
        >
          {/* Recipient */}
          <div>
            <label
              htmlFor="recipient"
              style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: '0.5rem', color: 'var(--muted-light)' }}
            >
              Recipient address
            </label>
            <RecentRecipients
              onSelect={setRecipient}
              className="recent-recipients--inline"
            />
            <input
              id="recipient"
              type="text"
              required
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="GABC..."
              style={{ ...fieldStyle, marginTop: '0.5rem' }}
            />
          </div>

          {/* Amount + token */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <div>
              <label
                htmlFor="amount"
                style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: '0.5rem', color: 'var(--muted-light)' }}
              >
                Amount
              </label>
              <input
                id="amount"
                type="number"
                required
                min="0.0000001"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="100"
                style={fieldStyle}
              />
            </div>
            <div>
              <label
                htmlFor="token"
                style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: '0.5rem', color: 'var(--muted-light)' }}
              >
                Token
              </label>
              <select
                id="token"
                value={token}
                onChange={(e) => setToken(e.target.value as 'XLM' | 'USDC')}
                style={fieldStyle}
              >
                <option value="XLM">XLM</option>
                <option value="USDC">USDC</option>
              </select>
            </div>
          </div>

          {/* Gas-on-recipient toggle — #528 */}
          <GasOnRecipientToggle
            enabled={gasOnRecipient}
            onChange={setGasOnRecipient}
            token={token}
          />

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => window.history.back()}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`button button--primary${isSubmitting ? ' button--busy' : ''}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating…' : 'Create Stream'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
