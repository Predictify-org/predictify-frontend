'use client';

import React from 'react';
import { ToggleSwitch } from './settings/ToggleSwitch';

// XLM gas cost charged to the recipient when gas-on-recipient is enabled.
// Sourced from preflight-estimate: BASE_FEE_STROOPS (100) / STROOPS_SCALE = 0.00001 XLM
export const GAS_ON_RECIPIENT_FEE_XLM = '0.00001';

interface GasOnRecipientToggleProps {
  /** Whether the toggle is on (recipient pays gas). */
  enabled: boolean;
  /** Called when the toggle changes. */
  onChange: (enabled: boolean) => void;
  /** Token for the stream — used to contextualise the cost copy. */
  token?: string;
  disabled?: boolean;
}

/**
 * GasOnRecipientToggle
 *
 * Lets the stream creator opt into having the recipient pay the
 * Stellar transaction fee (base fee = 0.00001 XLM per operation).
 * Surfaces the exact cost so the creator can make an informed choice.
 *
 * UI pattern: labelled toggle + inline cost callout.
 * Accessibility: role="switch", aria-describedby links toggle to cost note.
 */
export function GasOnRecipientToggle({
  enabled,
  onChange,
  token = 'XLM',
  disabled = false,
}: GasOnRecipientToggleProps) {
  const descId = 'gas-on-recipient-desc';

  return (
    <div
      className="gas-toggle"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        padding: '1rem',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        background: enabled ? 'var(--panel-accent, var(--panel))' : 'var(--panel)',
        transition: 'background 200ms',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <label
            htmlFor="gas-on-recipient-toggle"
            style={{
              display: 'block',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              color: 'var(--foreground)',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            Recipient pays gas
          </label>
          <p
            id={descId}
            style={{
              margin: 0,
              fontSize: 'var(--text-xs, 0.75rem)',
              color: 'var(--muted-light)',
              lineHeight: 1.4,
            }}
          >
            Deduct the Stellar transaction fee from each payout to the recipient.
          </p>
        </div>

        <ToggleSwitch
          id="gas-on-recipient-toggle"
          label="Recipient pays gas"
          checked={enabled}
          onChange={onChange}
          disabled={disabled}
        />
      </div>

      {/* Cost impact callout — always visible so contrast is clear */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          borderRadius: 'var(--radius-sm, 6px)',
          background: enabled
            ? 'rgba(251, 191, 36, 0.12)'   /* amber-tinted warning */
            : 'var(--surface, rgba(255,255,255,0.04))',
          border: `1px solid ${enabled ? 'rgba(251, 191, 36, 0.3)' : 'var(--border)'}`,
          fontSize: 'var(--text-xs, 0.75rem)',
          color: enabled ? '#fbbf24' : 'var(--muted-light)',
          transition: 'all 200ms',
        }}
      >
        <span aria-hidden="true">{enabled ? '⚠️' : 'ℹ️'}</span>
        {enabled ? (
          <span>
            <strong>{GAS_ON_RECIPIENT_FEE_XLM} XLM</strong> per payout will be deducted from the
            recipient&apos;s share to cover the Stellar base fee.
            {token !== 'XLM' && (
              <> The deduction is always in XLM regardless of the stream token ({token}).</>
            )}
          </span>
        ) : (
          <span>
            You (the sender) will cover all Stellar transaction fees.{' '}
            <strong>~{GAS_ON_RECIPIENT_FEE_XLM} XLM</strong> per payout.
          </span>
        )}
      </div>
    </div>
  );
}
