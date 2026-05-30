/**
 * Network Badge Component
 * 
 * Displays the current Stellar network with safety labels to prevent
 * users from confusing testnet funds with real mainnet assets.
 * 
 * SECURITY: This is a critical financial safety feature.
 */

import { getConfig } from '../lib/config';

interface NetworkBadgeProps {
  className?: string;
  showLabel?: boolean;
}

export function NetworkBadge({ className = '', showLabel = true }: NetworkBadgeProps) {
  try {
    const config = getConfig();
    const isTestnet = config.network.name === 'testnet';
    const isProduction = config.network.isProduction;

    if (!showLabel) {
      return null;
    }

    return (
      <div
        className={`network-badge ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.25rem 0.75rem',
          borderRadius: '999px',
          fontSize: '0.75rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          backgroundColor: isTestnet ? '#fef3c7' : '#dcfce7',
          color: isTestnet ? '#92400e' : '#166534',
          border: `1px solid ${isTestnet ? '#fcd34d' : '#86efac'}`,
        }}
      >
        {isTestnet && (
          <>
            <span style={{ fontSize: '1rem' }}>⚠️</span>
            <span>TESTNET ONLY</span>
          </>
        )}
        {!isTestnet && isProduction && (
          <>
            <span style={{ fontSize: '1rem' }}>🔒</span>
            <span>Mainnet</span>
          </>
        )}
      </div>
    );
  } catch (error) {
    // If config is not initialized, don't show the badge
    // This can happen during initial load or in error states
    return null;
  }
}

/**
 * Asset Label Component
 * 
 * Adds network-specific labels to asset displays to prevent
 * confusion between testnet and mainnet assets.
 */
interface AssetLabelProps {
  assetCode: string;
  className?: string;
}

export function AssetLabel({ assetCode, className = '' }: AssetLabelProps) {
  try {
    const config = getConfig();
    const isTestnet = config.network.name === 'testnet';
    const label = config.network.assetLabel;

    if (!label) {
      return <span className={className}>{assetCode}</span>;
    }

    return (
      <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
        {assetCode}
        <span
          style={{
            fontSize: '0.7em',
            fontWeight: 600,
            color: '#92400e',
            backgroundColor: '#fef3c7',
            padding: '0.1rem 0.4rem',
            borderRadius: '4px',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </span>
      </span>
    );
  } catch (error) {
    return <span className={className}>{assetCode}</span>;
  }
}
