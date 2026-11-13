import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useTranslation } from 'react-i18next'
import './i18n'
import './theme'

function App() {
  const { t } = useTranslation()
  return (
    <main>
      <h1>{t('app.title')}</h1>
      <p>{t('app.tagline')}</p>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
