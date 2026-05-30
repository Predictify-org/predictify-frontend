export function redact(data: any): any {
  if (typeof data !== 'object' || data === null) return data;
  const redacted = { ...data };
  const keysToRedact = ['signature', 'publicKey', 'secret', 'password', 'token', 'email'];
  for (const key in redacted) {
    if (keysToRedact.includes(key.toLowerCase())) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redact(redacted[key]);
    }
  }
  return redacted;
}
