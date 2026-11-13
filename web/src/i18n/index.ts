import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { useAppStore } from '../state/store'
import es from './es.json'
import en from './en.json'

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng
})

// El idioma lo decide y lo recuerda el estado (guardado o del navegador); i18next solo lo sigue.
void i18n.use(initReactI18next).init({
  resources: { es: { translation: es }, en: { translation: en } },
  lng: useAppStore.getState().language,
  supportedLngs: ['es', 'en'],
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
})

useAppStore.subscribe((state, prev) => {
  if (state.language !== prev.language) void i18n.changeLanguage(state.language)
})

export default i18n
