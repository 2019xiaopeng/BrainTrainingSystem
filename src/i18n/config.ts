import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zh from './locales/zh.json';
import en from './locales/en.json';

// Get saved language from localStorage, default to 'zh'
const savedLang = localStorage.getItem('brain-flow-lang') || 'zh';

i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zh },
    en: { translation: en },
  },
  lng: savedLang,
  fallbackLng: 'zh',
  interpolation: {
    escapeValue: false, // React already escapes
  },
});

export default i18n;
