import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../i18n'
import { DeckglPoc } from '../map/poc/DeckglPoc'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DeckglPoc />
  </StrictMode>,
)
