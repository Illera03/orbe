import { create } from 'zustand'
import type { ThemeName } from '../theme/tokens'

export type Language = 'es' | 'en'
export type Projection = 'globe' | 'mercator'

export interface AppState {
  theme: ThemeName
  language: Language
  projection: Projection
  setTheme: (theme: ThemeName) => void
  setLanguage: (language: Language) => void
  setProjection: (projection: Projection) => void
}

export const THEME_KEY = 'orbe.theme'
export const LANGUAGE_KEY = 'orbe.language'

// localStorage puede no existir o lanzar (modo privado, cookies bloqueadas): entonces no se recuerda nada.
function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // sin persistencia; la elección vale para esta sesión
  }
}

function initialTheme(): ThemeName {
  const saved = read(THEME_KEY)
  if (saved === 'dark' || saved === 'light') return saved
  // Oscuro es el predeterminado: solo una preferencia explícita por el claro lo cambia.
  return globalThis.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function initialLanguage(): Language {
  const saved = read(LANGUAGE_KEY)
  if (saved === 'es' || saved === 'en') return saved
  for (const tag of globalThis.navigator?.languages ?? []) {
    const lang = tag.slice(0, 2).toLowerCase()
    if (lang === 'es' || lang === 'en') return lang
  }
  return 'es'
}

// shortcut: proyección solo en memoria; pasará a la URL si se decide que forma parte del estado compartible.
export const useAppStore = create<AppState>()((set) => ({
  theme: initialTheme(),
  language: initialLanguage(),
  projection: 'globe',
  setTheme: (theme) => {
    write(THEME_KEY, theme)
    set({ theme })
  },
  setLanguage: (language) => {
    write(LANGUAGE_KEY, language)
    set({ language })
  },
  setProjection: (projection) => set({ projection }),
}))
