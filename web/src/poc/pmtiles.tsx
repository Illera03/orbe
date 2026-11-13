import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { useTranslation } from 'react-i18next'
import '../i18n'

function Poc() {
  const { t } = useTranslation()
  return (
    <main>
      <p>{t('poc.pending')}</p>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Poc />
  </StrictMode>,
)
