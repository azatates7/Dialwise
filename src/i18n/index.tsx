import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import en from './en.json';
import tr from './tr.json';
import { Lang, langFromLocale } from './format';

export * from './format';

type Dict = typeof en;
export type TKey = keyof Dict;

// tr.json'da en.json'daki bir anahtar eksikse burada derleme hatası alınır.
const dicts: Record<Lang, Dict> = { en, tr };

/** Sistem dilini okur. Okunamazsa İngilizce. */
export function detectLang(): Lang {
  try {
    return langFromLocale(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    return 'en';
  }
}

export function translate(lang: Lang, key: TKey, params?: Record<string, string | number>): string {
  let text: string = dicts[lang][key] ?? dicts.en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.split(`{${k}}`).join(String(v));
    }
  }
  return text;
}

const LangContext = createContext<Lang>('en');

/** Dili sağlar; uygulama öne geldiğinde sistem dilini yeniden okur. */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(detectLang);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        setLang(detectLang());
      }
    });
    return () => sub.remove();
  }, []);

  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useI18n() {
  const lang = useContext(LangContext);
  return useMemo(
    () => ({
      lang,
      t: (key: TKey, params?: Record<string, string | number>) => translate(lang, key, params),
    }),
    [lang],
  );
}