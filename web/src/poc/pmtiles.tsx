import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../i18n'
import { PmtilesPoc } from '../map/poc/PmtilesPoc'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PmtilesPoc />
  </StrictMode>,
)
