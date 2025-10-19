/**
 * Logger Utility
 *
 * @description Conditional logger that only logs in development environment
 * to prevent console.log pollution and security risks in production.
 */

const isDevelopment = import.meta.env.DEV || process.env.NODE_ENV === 'development';

/**
 * Logger with conditional output based on environment
 */
export const logger = {
  /**
   * Debug-level logging (only in development)
   */
  debug: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Info-level logging (only in development)
   */
  log: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Info-level logging (only in development)
   */
  info: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  /**
   * Warning-level logging (always shows)
   */
  warn: (...args: unknown[]): void => {
    console.warn(...args);
  },

  /**
   * Error-level logging (always shows)
   */
  error: (...args: unknown[]): void => {
    console.error(...args);
  },

  /**
   * Group start (only in development)
   */
  group: (label: string): void => {
    if (isDevelopment) {
      console.group(label);
    }
  },

  /**
   * Group end (only in development)
   */
  groupEnd: (): void => {
    if (isDevelopment) {
      console.groupEnd();
    }
  },

  /**
   * Table display (only in development)
   */
  table: (data: unknown): void => {
    if (isDevelopment) {
      console.table(data);
    }
  },
};

export default logger;
