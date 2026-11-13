# CLAUDE.md · Reglas permanentes de Orbe

La especificación completa está en `docs/SPEC.md` y prevalece sobre cualquier suposición.
Las decisiones tomadas se anotan en `docs/DECISIONS.md`. Este fichero solo recoge las reglas
que todo agente cumple siempre.

## Ante cualquier duda de alcance: parar y preguntar

Si una tarea cambia el alcance, añade un coste, toca una licencia dudosa o contradice SPEC.md,
no la resuelvas por tu cuenta: para y pregunta al coordinador (y este a Jorge). Lo que no sea
de alcance lo decides tú y lo anotas en `docs/DECISIONS.md`.

## Git: sin rastro de Claude (obligatorio)

- Ningún commit, mensaje, PR, rama, issue ni ajuste del repo menciona a Claude ni a Anthropic.
- Prohibido en mensajes y descripciones: `Co-Authored-By`, `Generated with`, `Claude Code`,
  `anthropic.com`. El hook `.githooks/commit-msg` lo bloquea y la CI (`attribution`) lo repite
  sobre commits y descripción del PR. Nunca uses `--no-verify`.
- Activa el hook una vez por clon: `git config core.hooksPath .githooks`. Los worktrees lo heredan; no lo ejecutes desde uno.
- Autoría: la configuración de git de Jorge. Los PR se abren con su sesión de `gh`.
- Conventional Commits en español: `feat(mapa): transición animada de globo a plano`.
- Ramas: `feat/mN-…`, `data/mN-…`, `ci/mN-…`, `docs/mN-…`. `main` está protegida: todo entra
  por PR con la CI en verde. Nada de `push --force` ni `reset --hard`.

## Presupuestos de rendimiento (bloquean el merge)

- JavaScript inicial ≤ 500 KB comprimido. deck.gl y los modos secundarios, con `import()` bajo demanda.
- LCP < 2,5 s y CLS < 0,1 en escritorio. Lighthouse de rendimiento ≥ 85 en escritorio y ≥ 70 en móvil.
- Globo a 60 fps en un portátil medio y ≥ 30 fps en un móvil de gama media con la coropleta activa.
- Ningún fichero de datos > 2 MB; un indicador carga en < 300 ms con caché.
- Si un efecto no cabe en el presupuesto, se degrada o se quita.

## Textos e idiomas

- Ningún texto visible fijo en el código: todo pasa por i18next (`web/src/i18n/`, `es` y `en`).
- Español por defecto. Un test falla si falta una clave en alguno de los dos idiomas.
- Nombres de países con `Intl.DisplayNames` y números con `Intl.NumberFormat`. Nada de tablas a mano.
- Colores solo desde los tokens de `web/src/theme/`. Ninguna pantalla define colores propios.

## Datos y licencias

- Identificador de país: ISO 3166-1 alfa-3.
- Cada indicador lleva fuente, URL, año y licencia en sus metadatos; sin licencia no se publica.
- Nada CC BY-NC sin marcar y sin consultar (la OMS/GHO se evita).

## Estructura

```text
CLAUDE.md                 este fichero
.claude/settings.json     atribución desactivada y permisos
.claude/agents/           mapa, interfaz, datos, diseno, qa
docs/SPEC.md              especificación
docs/DECISIONS.md         registro de decisiones
web/                      app Vite + React + TypeScript
  src/map/                motor de mapa y capas            (agente mapa)
  src/ui/                 componentes                      (agente interfaz)
  src/state/              estado y sincronización con URL  (agente interfaz)
  src/i18n/               textos es/en                     (agente interfaz)
  src/theme/              tokens y estilos de mapa         (agente diseno)
  src/config/             tarjetas destacadas y ajustes
  tests/                  Vitest y Playwright              (agente qa)
pipeline/                 Python 3.12 + uv                 (agente datos)
  sources/                un módulo por fuente
  catalog.yaml            definición de indicadores
  tests/                  pytest                           (agente qa)
data/                     salida del pipeline, servida tal cual (agente datos)
.githooks/                commit-msg y patrones prohibidos
.github/workflows/        CI, despliegue y datos mensuales (agente qa)
```

Cada agente toca solo sus carpetas. Si necesita cambiar otra, lo pide al coordinador.

## Comandos

Web (Node 22, npm):

```bash
npm --prefix web ci            # instalar
npm --prefix web run dev       # servidor de desarrollo
npm --prefix web run build     # build de producción (incluye tsc)
npm --prefix web run lint      # ESLint
npm --prefix web test          # Vitest
npm --prefix web run e2e       # Playwright (cuando exista)
```

Pipeline (Python 3.12, uv):

```bash
uv sync --directory pipeline           # instalar
uv run --directory pipeline pytest     # tests
```

Antes de abrir un PR: build, lint y tests en verde en local.

## Pull requests

- Uno por tarea, pequeño, con criterios de aceptación en la descripción.
- Si el cambio es visual, adjunta capturas en ambos temas y en móvil.
- QA revisa todos y Diseño los visuales. No se integra con la CI en rojo ni con comentarios abiertos.
