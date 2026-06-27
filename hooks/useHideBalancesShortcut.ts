import { useEffect } from 'react';
import { usePrivacy } from '@/context/PrivacyContext';

export function useHideBalancesShortcut() {
  const { hideBalances, setHideBalances } = usePrivacy();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const metaKey = isMac ? e.metaKey : e.ctrlKey;
      if (metaKey && e.shiftKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setHideBalances(!hideBalances);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hideBalances, setHideBalances]);
}
