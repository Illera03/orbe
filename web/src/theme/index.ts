// Punto de entrada del tema: fuentes autoalojadas (solo latín y los pesos usados) y variables CSS.
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/space-grotesk/latin-600.css'
import { themeCss, type ThemeName } from './tokens'

export * from './tokens'
export * from './map'

const style = document.createElement('style')
style.dataset.orbeTheme = ''
style.textContent = themeCss()
document.head.prepend(style)

/** Activa un tema en `<html data-theme>`; la elección y su persistencia son del estado (interfaz). */
export function applyTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme
}
