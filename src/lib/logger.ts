type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getLogLevel(): number {
  const env = process.env.LOG_LEVEL as LogLevel | undefined;
  if (env && env in LOG_LEVELS) return LOG_LEVELS[env];
  return process.env.NODE_ENV === 'production' ? LOG_LEVELS.warn : LOG_LEVELS.debug;
}

const currentLevel = getLogLevel();

export const logger = {
  debug: (...args: unknown[]) => { if (currentLevel <= LOG_LEVELS.debug) console.debug(...args); },
  log: (...args: unknown[]) => { if (currentLevel <= LOG_LEVELS.info) console.log(...args); },
  info: (...args: unknown[]) => { if (currentLevel <= LOG_LEVELS.info) console.info(...args); },
  warn: (...args: unknown[]) => { if (currentLevel <= LOG_LEVELS.warn) console.warn(...args); },
  error: (...args: unknown[]) => console.error(...args), // always log errors
};
