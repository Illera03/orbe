import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import es from './es.json'
import en from './en.json'

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
})

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { es: { translation: es }, en: { translation: en } },
    supportedLngs: ['es', 'en'],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    fallbackLng: 'es',
    // shortcut: solo el idioma del navegador y sin guardar; el selector de idioma añadirá URL/localStorage.
    detection: { order: ['navigator'], caches: [] },
    interpolation: { escapeValue: false },
  })

export default i18n
