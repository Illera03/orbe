import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import { applyTheme } from './theme'
import { useAppStore } from './state/store'
import { App } from './ui/App'

// Antes del primer render para que no parpadee el tema equivocado.
applyTheme(useAppStore.getState().theme)
useAppStore.subscribe((state, prev) => {
  if (state.theme !== prev.theme) applyTheme(state.theme)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
