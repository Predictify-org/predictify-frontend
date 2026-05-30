export const logger = {
  info: (message: string, context?: Record<string, any>) => {
    console.log(JSON.stringify({ level: 'info', message, ...context, timestamp: new Date().toISOString() }));
  },
  warn: (message: string, context?: Record<string, any>) => {
    console.warn(JSON.stringify({ level: 'warn', message, ...context, timestamp: new Date().toISOString() }));
  },
  error: (message: string, context?: Record<string, any>) => {
    console.error(JSON.stringify({ level: 'error', message, ...context, timestamp: new Date().toISOString() }));
  },
};
