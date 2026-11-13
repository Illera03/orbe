# Registro de decisiones

Las decisiones D1 a D12 salen de la entrevista inicial (SPEC.md). Las nuevas se añaden al final con el
siguiente id libre. Una decisión que se sustituye no se borra: se marca como "Sustituida por Dn".

| Id | Fecha | Decisión | Motivo | Estado |
| --- | --- | --- | --- | --- |
| D1 | 2026-11-13 | MapLibre GL v5 + deck.gl; vista plana en Mercator, Equal Earth con D3 en v2 | Globo con transición a plano, zoom profundo y capas densas sin coste | Vigente |
| D2 | 2026-11-13 | Atlas de indicadores como núcleo; sin juegos | Coherencia multipropósito con un único motor | Vigente |
| D3 | 2026-11-13 | Países y provincias en todo el mundo, datos subnacionales solo en Europa, EE. UU. y España, ciudades como puntos | Mejor relación coste/aporte | Vigente |
| D4 | 2026-11-13 | Datos abiertos estáticos con pipeline mensual y terremotos en tiempo real | Funciona en hosting estático y gratuito | Vigente |
| D5 | 2026-11-13 | Escritorio primero, responsive completo, sin app nativa | Público y coste | Vigente |
| D6 | 2026-11-13 | Bilingüe español/inglés desde el inicio, español por defecto | Añadir idiomas después cuesta más | Vigente |
| D7 | 2026-11-13 | GitHub Pages, repositorio público, licencia MIT, coste cero | Portfolio y sin gasto | Vigente |
| D8 | 2026-11-13 | Tema oscuro espacial por defecto y claro editorial; paletas aptas para daltonismo | Atractivo y legible | Vigente |
| D9 | 2026-11-13 | Analítica sin cookies (GoatCounter), sin anuncios ni cuentas en v1 | Privacidad y simplicidad | Vigente |
| D10 | 2026-11-13 | Claude Code con cinco subagentes, trabajo por hitos con PR y validación de Jorge al cerrar cada hito | Autonomía con control | Vigente |
| D11 | 2026-11-13 | Ningún rastro de Claude en commits, PR ni colaboradores | Requisito de Jorge | Vigente |
| D12 | 2026-11-13 | Nombre provisional: Orbe | Corto y válido en español e inglés | Vigente |
| D13 | 2026-11-13 | Sobre el globo, los arcos de deck.gl se dibujan con PathLayer y un círculo máximo precalculado (`web/src/map/greatCircle.ts`); ArcLayer solo en Mercator | En deck.gl 9.4.1 con `MapboxOverlay` intercalado, ArcLayer sale mal proyectado sobre el globo de MapLibre 5 | Vigente |
| D14 | 2026-11-13 | `web/public/data` es un symlink relativo a `../../data` y `data/.gitkeep` garantiza que exista | Vite sirve y copia los datos del pipeline sin duplicarlos; con el symlink colgando, `vite build` falla | Vigente |
| D15 | 2026-11-13 | React 19.3.1 en lugar de 18; versiones exactas fijadas en M0: vite 8.3.8, typescript 6.0.3 (typescript-eslint 8.72 exige <6.1), i18next 27.1.1, vitest 5.1.0, maplibre-gl 5.24.1, deck.gl 9.4.1, pmtiles 4.5.0; Node ≥22.13 | Última estable, sin problemas con deck.gl; react-map-gl no hace falta | Vigente |
| D16 | 2026-11-13 | Patrimonio UNESCO desde Wikidata (CC0) y no desde whc.unesco.org; volcanes del Smithsonian GVP con cita formal y DOI, y confirmación escrita del GVP antes de cualquier uso comercial (ver `docs/licencias-m0.md`) | UNESCO exige autorización previa y uso no comercial; los términos del GVP son ambiguos para uso comercial | Sustituida por D19 |
| D17 | 2026-11-13 | PoC resueltas: deck.gl con `MapboxOverlay` intercalado funciona sobre el globo (curvatura y cara oculta; burbujas a 2 km de altitud y arcos según D13; resincronización en `projectiontransition` al pasar a plano), 60 fps en el Mac de desarrollo. PMTiles se sirve desde Pages con respuestas 206 y CORS abierto. No hace falta ninguno de los dos planes B | Comprobado en https://illera03.github.io/orbe/poc/ | Vigente |
| D18 | 2026-11-13 | `main` protegida: PR obligatorio con los checks `attribution` y `ci` en verde, sin aprobaciones, también para administradores | Un único desarrollador; la CI es la puerta | Vigente |
| D19 | 2026-11-13 | Aprobada por Jorge. Patrimonio UNESCO desde Wikidata (CC0). Volcanes: NOAA NCEI descartado (es una copia de 2013 del propio GVP, con una licencia contradictoria entre CC0 y "otherRestrictions" y sin años de erupción); se usa el Smithsonian GVP con su cita formal y DOI, y el indicador se marca en el catálogo como no apto para uso comercial. Jorge revisó en vivo las páginas de términos (resultado pendiente de confirmar) | Instrucción de Jorge; detalle en `docs/licencias-m0.md` | Vigente |
| D20 | 2026-11-13 | M0 validado por Jorge y cerrado (etiqueta `m0`). Los pendientes van al principio del backlog de M1: #7 (carga lenta del PMTiles), #8 (overlay de deck.gl sobre un mapa destruido), #9 (npm audit) y #10 (fps en móvil) | Ciclo de hito de SPEC.md | Vigente |
