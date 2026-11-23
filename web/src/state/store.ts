import { create } from 'zustand'
import type { ThemeName } from '../theme/tokens'
import { loadCatalog, type Catalog } from './data'

export type Language = 'es' | 'en'
export type Projection = 'globe' | 'mercator'

export interface AppState {
  theme: ThemeName
  language: Language
  projection: Projection
  /** Momento (`performance.now()`) de la última interacción del usuario con el mapa o el buscador; `null` si aún no hubo. */
  lastInteraction: number | null
  /** Catálogo de indicadores; `null` hasta que `initIndicator` lo carga. */
  catalog: Catalog | null
  /** Indicador activo (id del catálogo) y su año; `null` sin indicador. */
  indicatorId: string | null
  year: number | null
  /** País bajo el puntero (ISO alfa-3). */
  hoveredCountry: string | null
  setTheme: (theme: ThemeName) => void
  setLanguage: (language: Language) => void
  setProjection: (projection: Projection) => void
  /** La rotación de entrada (MAPA-3) se suscribe a `lastInteraction` para pararse. */
  markInteraction: () => void
  /** Activa un indicador del catálogo y pone su `latestYear`; un id desconocido (o sin catálogo) no cambia nada. */
  setIndicator: (id: string) => void
  setYear: (year: number) => void
  setHoveredCountry: (a3: string | null) => void
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
export const useAppStore = create<AppState>()((set, get) => ({
  theme: initialTheme(),
  language: initialLanguage(),
  projection: 'globe',
  lastInteraction: null,
  catalog: null,
  indicatorId: null,
  year: null,
  hoveredCountry: null,
  setTheme: (theme) => {
    write(THEME_KEY, theme)
    set({ theme })
  },
  setLanguage: (language) => {
    write(LANGUAGE_KEY, language)
    set({ language })
  },
  setProjection: (projection) => set({ projection }),
  markInteraction: () => set({ lastInteraction: performance.now() }),
  setIndicator: (id) => {
    const meta = get().catalog?.indicators.find((i) => i.id === id)
    if (meta) set({ indicatorId: id, year: meta.latestYear })
  },
  setYear: (year) => set({ year }),
  setHoveredCountry: (hoveredCountry) => set({ hoveredCountry }),
}))

let init: Promise<void> | null = null

/**
 * Carga el catálogo y activa `?indicador=<id>` si existe en él; la URL se lee una sola vez (solo lectura hasta M3).
 * Si falla la carga, se puede volver a llamar.
 */
export function initIndicator(): Promise<void> {
  init ??= loadCatalog().then(
    (catalog) => {
      useAppStore.setState({ catalog })
      const id = new URLSearchParams(globalThis.location?.search).get('indicador')
      if (id) useAppStore.getState().setIndicator(id)
    },
    (error: unknown) => {
      init = null
      throw error
    },
  )
  return init
}
