/**
 * Safe environment variable retrieval compatible with both Vite client runtime
 * and Node.js CommonJS / ESBuild server runtime.
 */
export function getEnvVar(key: string): string | undefined {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta && import.meta.env) {
      // @ts-ignore
      return import.meta.env[key];
    }
  } catch {
    // ignore
  }
  try {
    if (typeof process !== 'undefined' && process && process.env) {
      return process.env[key];
    }
  } catch {
    // ignore
  }
  return undefined;
}

export function isDevEnv(): boolean {
  try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta && import.meta.env) {
      // @ts-ignore
      return Boolean(import.meta.env.DEV);
    }
  } catch {
    // ignore
  }
  try {
    if (typeof process !== 'undefined' && process && process.env) {
      return process.env.NODE_ENV !== 'production';
    }
  } catch {
    // ignore
  }
  return false;
}
