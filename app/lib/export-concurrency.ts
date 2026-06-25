const activeExports = new Map<string, number>();
export const MAX_CONCURRENT_EXPORTS = 2;

export function acquireExportSlot(walletAddress: string): boolean {
  const current = activeExports.get(walletAddress) ?? 0;
  if (current >= MAX_CONCURRENT_EXPORTS) return false;
  activeExports.set(walletAddress, current + 1);
  return true;
}

export function releaseExportSlot(walletAddress: string): void {
  const current = activeExports.get(walletAddress) ?? 0;
  if (current <= 1) {
    activeExports.delete(walletAddress);
  } else {
    activeExports.set(walletAddress, current - 1);
  }
}

export function getActiveExportCount(walletAddress: string): number {
  return activeExports.get(walletAddress) ?? 0;
}

export function resetConcurrency(): void {
  activeExports.clear();
}
