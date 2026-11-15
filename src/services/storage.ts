import { APP_CONFIG } from '../config/app.config';

// Safe localStorage adapter: a denied or full storage never throws into the UI.
const prefix = APP_CONFIG.storageNamespace;

export const storage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(`${prefix}:${key}`);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): boolean {
    try {
      window.localStorage.setItem(`${prefix}:${key}`, value);
      return true;
    } catch {
      return false;
    }
  },
  remove(key: string): void {
    try {
      window.localStorage.removeItem(`${prefix}:${key}`);
    } catch {
      /* storage unavailable */
    }
  },
};

export function storageKey(key: string): string {
  return `${prefix}:${key}`;
}
