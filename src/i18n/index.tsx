import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { APP_CONFIG, type Locale } from '../config/app.config';
import { storage } from '../services/storage';
import { en, type Messages } from './en';
import { es } from './es';

type Paths<T> = { [K in keyof T & string]: T[K] extends string ? K : `${K}.${Paths<T[K]>}` }[keyof T & string];
export type MessageKey = Paths<Messages>;
export type TParams = Record<string, string | number>;
export type TFunction = (key: MessageKey, params?: TParams) => string;

const dictionaries: Record<Locale, Messages> = { en, es };
export const localeNames: Record<Locale, string> = { en: 'English', es: 'Español' };

function lookup(dict: Messages, key: string): string | undefined {
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

export function translate(locale: Locale, key: MessageKey, params: TParams = {}): string {
  const template = lookup(dictionaries[locale], key) ?? lookup(en, key) ?? key;
  const values: TParams = {
    brand: APP_CONFIG.brand.name,
    country: APP_CONFIG.brand.country,
    challenge: APP_CONFIG.brand.challenge,
    ...params,
  };
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}

function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (APP_CONFIG.locales as readonly string[]).includes(value);
}

function initialLocale(): Locale {
  const fromQuery = new URLSearchParams(window.location.search).get('lang');
  if (isLocale(fromQuery)) return fromQuery;
  const stored = storage.get('locale');
  return isLocale(stored) ? stored : APP_CONFIG.defaultLocale;
}

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TFunction;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    storage.set('locale', next);
  }, []);

  const t = useCallback<TFunction>((key, params) => translate(locale, key, params), [locale]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
