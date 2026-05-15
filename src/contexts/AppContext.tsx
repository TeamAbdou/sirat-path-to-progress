import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Lang, translations, rtlLangs } from '@/lib/i18n';

type Theme = 'light' | 'dark';

interface AppContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  theme: Theme;
  toggleTheme: () => void;
  t: typeof translations.ar;
  dir: 'ltr' | 'rtl';
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem('sirat-lang') as Lang) || 'en';
  });
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('sirat-theme') as Theme) || 'dark';
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem('sirat-lang', l);
  };

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('sirat-theme', next);
      return next;
    });
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const isRtl = rtlLangs.includes(lang);

  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang, isRtl]);

  const t = translations[lang];
  const dir = isRtl ? 'rtl' : 'ltr';

  return (
    <AppContext.Provider value={{ lang, setLang, theme, toggleTheme, t, dir }}>
      {children}
    </AppContext.Provider>
  );
};
