import { AsyncLocalStorage } from 'async_hooks';

const correlationStorage = new AsyncLocalStorage<{ correlationId: string }>();

export function getCorrelationContext() {
  return correlationStorage.getStore();
}

export function runWithCorrelation<T>(correlationId: string, callback: () => T): T {
  return correlationStorage.run({ correlationId }, callback);
}
