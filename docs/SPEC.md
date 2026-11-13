# Orbe: especificaciones del proyecto

Nov 13, 2026 · @Jorge

## Visión y objetivos

Orbe es un atlas de datos del mundo: eliges cualquier indicador y el planeta lo muestra, ya sea coloreando países, colocando puntos y burbujas, trazando flujos o elevando el relieve. Arranca en un globo 3D que se puede girar y pasa con una transición animada a un mapa plano. El objetivo es que dé gusto usarlo y que cada dato sea fiable y tenga su fuente a la vista.

El proyecto tiene una doble función. Es un portfolio personal de Jorge, así que el código, el diseño y el proceso con agentes tienen que poder enseñarse. Y aspira a ser un producto público real: desplegado, rápido, bilingüe y con una URL estable, preparado para crecer (dominio propio, más datos, quizá ingresos) sin rehacerlo.

Objetivos de la primera versión (v1):

- Una experiencia de entrada que enganche en menos de diez segundos: globo en rotación, buscador y mapas destacados.
- Al menos 50 indicadores en ocho categorías, cada uno con fuente, año y licencia visibles.
- Capas geográficas reales, no solo coropletas: ciudades, puntos de interés, flujos y un dato en tiempo real (terremotos).
- Ficha completa de cada país.
- Coste de infraestructura cero: GitHub Pages y servicios gratuitos.

**Qué no es Orbe.** No tiene juegos ni quizzes. No es un SIG profesional ni una herramienta de análisis con consultas libres. No tiene cuentas de usuario, comentarios ni contenido generado por usuarios. No muestra noticias ni opinión: solo datos con fuente.

## Público y principios de producto

El usuario tipo es una persona curiosa sin formación en estadística que llega por un enlace compartido o una búsqueda y quiere entender algo del mundo en pocos clics. El segundo público son estudiantes y docentes, que necesitan rigor: fuente citada, año del dato y posibilidad de descargarlo.

Principios que guían cualquier decisión de diseño o desarrollo:

1. **El mapa es el protagonista.** La interfaz ocupa lo mínimo y se aparta cuando no hace falta; los paneles se pliegan.
2. **Cada dato dice de dónde viene.** Fuente, año, unidad y licencia siempre a un clic, y la ausencia de dato se distingue visualmente de un valor bajo.
3. **Un mismo motor para todo.** Cualquier indicador nuevo se añade como datos y metadatos, sin escribir código de interfaz. Esto es lo que hace que la web sea multipropósito sin convertirse en un cajón de sastre.
4. **Bonito, pero legible.** Las animaciones y efectos 3D nunca tapan el dato; las paletas son aptas para daltonismo y las escalas, honestas.
5. **Rápido en un portátil normal y usable en un móvil.** Si un efecto no aguanta el presupuesto de rendimiento, se degrada o se quita.
6. **Neutral.** Orbe muestra datos, no opina. Las fronteras en disputa siguen la representación de facto de Natural Earth y se indica en la página de información.

## Alcance funcional

La v1 incluye la entrada con globo, la transición a mapa plano, cuatro modos (explorar, ficha de país, línea temporal y extrusión 3D) y cuatro tipos de capa (coropleta, burbujas, puntos y flujos). El resto queda reservado para la v2, pero la arquitectura tiene que admitirlo desde el principio.

### Pantalla de entrada

El globo aparece en tema oscuro, girando despacio, con atmósfera y estrellas de fondo. Encima flota un buscador único que encuentra tanto países ("Japón") como indicadores ("esperanza de vida"). Debajo, entre cuatro y seis tarjetas de mapas destacados con una pregunta y una miniatura ("¿Dónde se vive más años?", "Terremotos de las últimas 24 horas", "¿Quién emite más CO₂ por persona?"). Las tarjetas salen de un fichero de configuración, así que se pueden cambiar sin tocar código. Cualquier interacción con el globo detiene la rotación.

### Globo y mapa plano

Un botón alterna entre globo 3D y mapa plano con transición animada; al hacer zoom por encima de cierto nivel, el globo pasa a plano solo. La vista plana es Mercator (decisión D1, ver registro). Al pasar el ratón por un país aparece un tooltip con nombre, valor del indicador activo y año; al hacer clic se abre su ficha.

### Modos de visualización

| Modo | Qué hace | Versión |
| --- | --- | --- |
| Explorar | Un indicador sobre el mapa, con leyenda, selector de año y ranking lateral | v1 |
| Ficha de país | Panel con todos los datos de un país y su mapa interior | v1 |
| Línea temporal | Reproduce la evolución del indicador año a año (por ejemplo, 1960 a hoy) | v1 |
| Extrusión 3D | Eleva cada país en proporción a su valor, sobre el globo o el plano | v1 |
| Comparar | Dos indicadores o dos años, con cortina deslizante o pantalla partida | v2 |
| Cartograma | Deforma los países según el valor | v2 |
| Vista Equal Earth | Mapa mundial plano de proyección equivalente para comparar coropletas | v2 |

### Tipos de capa

Todas las capas son primitivas genéricas: un indicador declara en sus metadatos qué tipo de capa usa y el motor la pinta.

| Capa | Ejemplos | Versión |
| --- | --- | --- |
| Coropleta | PIB per cápita, esperanza de vida | v1 |
| Burbujas proporcionales | Población total, emisiones totales | v1 |
| Puntos con icono | Ciudades, volcanes, aeropuertos, patrimonio UNESCO, terremotos | v1 |
| Líneas y flujos | Ríos, migraciones entre países, comercio | v1 |
| Mapa de calor | Densidad de terremotos o de ciudades | v2 |
| Relieve y terreno | Altitud, sombreado del relieve | v2 |

Varias capas de puntos o líneas pueden superponerse sobre una coropleta. Solo hay una coropleta activa a la vez.

### Ficha de país

Se abre como panel lateral en escritorio y como hoja inferior deslizable en móvil, y la cámara vuela hasta el país. Contiene:

- Bandera, nombre oficial en el idioma de la interfaz y nombre local.
- Datos clave: capital, población, superficie, PIB per cápita, esperanza de vida, idiomas, moneda.
- Posición en el ranking mundial y regional del indicador activo.
- Pequeñas gráficas de evolución de los indicadores principales.
- Comparación con la media mundial y la de su región.
- Mapa interior con provincias y ciudades principales.
- Fuentes de todo lo mostrado.

### Compartir y exportar

Prioridad baja, pero barato si se diseña desde el principio. El estado de la vista (indicador, año, modo, cámara y país seleccionado) vive en la URL, de modo que cualquier vista se comparte copiando el enlace. La exportación a PNG de la vista actual y a CSV del indicador activo entra en la v1 si no supone más de un par de días de trabajo; si no, pasa a v2.

### Información y créditos

Una página "Acerca de" explica el proyecto, lista todas las fuentes y licencias, aclara el criterio sobre fronteras y enlaza el repositorio.

## Datos

Todos los datos son abiertos, se preprocesan en el repositorio y se sirven como ficheros estáticos que el navegador carga bajo demanda. La única excepción son las capas en tiempo real, que el navegador pide directamente a APIs públicas.

### Granularidad

| Nivel | Geometría | Datos estadísticos | Versión |
| --- | --- | --- | --- |
| Países | Todo el mundo (Natural Earth 1:50m, 1:10m al acercarse) | Todos los indicadores | v1 |
| Primer nivel administrativo (unas 4.600 provincias o estados) | Todo el mundo (Natural Earth admin-1) | Solo Europa (NUTS 2 de Eurostat), EE. UU. (estados, Census) y España (comunidades y provincias, INE) | Geometría en v1, datos en v2 |
| Ciudades | Puntos, unas 30.000 de más de 15.000 habitantes (GeoNames) | Población y capitalidad | v1 |
| Municipios | No, salvo capas puntuales justificadas | No | Fuera de alcance |

El identificador de país es el código ISO 3166-1 alfa-3. Las regiones usan el código nativo de su fuente (NUTS, FIPS, código INE) con una tabla de correspondencias con Natural Earth.

### Catálogo inicial

Ocho categorías y el máximo de indicadores que el pipeline pueda mantener con calidad, con un mínimo de 50 en la v1. La tabla da ejemplos de cada categoría; el agente de datos completa la lista en el fichero `catalog.yaml`.

| Categoría | Ejemplos de indicadores | Fuente principal |
| --- | --- | --- |
| Demografía | Población, densidad, edad mediana, fecundidad, población urbana, migrantes | Banco Mundial, ONU (World Population Prospects) |
| Economía | PIB, PIB per cápita (PPA), crecimiento, inflación, desempleo, Gini, exportaciones | Banco Mundial |
| Salud | Esperanza de vida, mortalidad infantil, gasto sanitario, médicos por habitante | Banco Mundial, Our World in Data |
| Educación | Alfabetización, años de escolarización, matriculación terciaria, gasto educativo | Banco Mundial, UNESCO UIS |
| Medio ambiente y clima | CO₂ total y per cápita, superficie forestal, áreas protegidas, anomalía de temperatura | Our World in Data, Banco Mundial |
| Energía | Consumo per cápita, mix eléctrico, porcentaje renovable, acceso a electricidad | Our World in Data (Energy) |
| Geografía física | Superficie, altitud máxima, costa, volcanes, ríos, terremotos en tiempo real | Natural Earth, Smithsonian GVP, USGS |
| Sociedad y cultura | Idiomas oficiales, acceso a internet, móviles, patrimonio UNESCO, aeropuertos | Unicode CLDR, Banco Mundial, UNESCO, OurAirports |

Los datos descriptivos de la ficha (capital, moneda, nombre local, idiomas) salen de Wikidata. Los nombres de países en cada idioma los da el propio navegador con `Intl.DisplayNames` a partir del código ISO, sin ficheros de traducción.

### Tiempo real

La v1 incluye el feed GeoJSON de terremotos del USGS (última hora, día y semana), que admite peticiones desde el navegador. Candidatos para v2: eventos naturales de NASA EONET (incendios, tormentas, volcanes). Si una API falla, la capa se oculta con un aviso discreto y el resto de la web sigue funcionando.

### Licencias

Cada indicador guarda su licencia en los metadatos y la interfaz la muestra con la atribución exigida. Puntos a vigilar:

- Banco Mundial y Our World in Data publican en CC BY 4.0; Natural Earth, OurAirports y USGS son de dominio público; Wikidata es CC0; GeoNames es CC BY 4.0.
- Algunas series dentro de Our World in Data heredan la licencia de su fuente original: se comprueba serie a serie.
- Los datos de la OMS (GHO) son CC BY-NC-SA, que impide uso comercial. Se evitan mientras exista la posibilidad de monetizar; si una serie solo existe ahí, se marca y se decide caso a caso.
- Las condiciones de UNESCO (lista de patrimonio) y del Smithsonian (volcanes) se verifican en el hito M0 antes de incorporarlas.

### Pipeline

Un pipeline en Python dentro del repositorio descarga cada fuente, normaliza códigos y unidades, valida y genera los ficheros finales. Lo ejecuta GitHub Actions una vez al mes (y a mano cuando haga falta) y abre un pull request con el resumen de cambios para revisarlo antes de publicar.

Cada indicador produce dos cosas: una entrada en `catalog.json` con sus metadatos (id, nombre en español e inglés, descripción, unidad, categoría, tipo de capa, escala de color recomendada, fuente, URL, licencia, años disponibles, fecha de actualización) y un fichero de datos compacto con los valores por código y año. Las validaciones mínimas son: códigos ISO válidos, sin duplicados, unidades coherentes, valores dentro de un rango plausible y cobertura mínima (al menos 100 países con dato en el año más reciente). Un indicador que no pasa no se publica.

Las geometrías se generan una vez como teselas vectoriales en formato PMTiles con tippecanoe, con versiones simplificadas por nivel de zoom.

## Diseño visual y experiencia de uso

Orbe tiene dos temas: uno oscuro "espacial", que es el predeterminado, y uno claro "editorial". El tema sigue la preferencia del sistema la primera vez y luego la elección del usuario.

**Tema oscuro.** Fondo casi negro con un campo de estrellas tenue, globo con halo de atmósfera, océanos en azul muy oscuro y tierra apagada para que el dato destaque. Los paneles son translúcidos con desenfoque de fondo y bordes finos.

**Tema claro.** Inspirado en los atlas impresos y los gráficos de prensa de calidad: océano gris azulado muy claro, tierra en marfil, tipografía con presencia y paneles opacos.

**Color de los datos.** Escalas secuenciales y divergentes perceptualmente uniformes y aptas para daltonismo (familias viridis, cividis y las de ColorBrewer validadas). Cada indicador declara si su escala es secuencial, divergente o categórica, y si es lineal, logarítmica o por cuantiles. Los países sin dato se pintan con un patrón rayado neutro, nunca con un color de la escala.

**Tipografía.** Una sans moderna para la interfaz (Inter o similar) y una con más carácter para títulos y cifras grandes. Cifras tabulares en tablas y leyendas. Formato de números según el idioma (`Intl.NumberFormat`).

**Movimiento.** Transiciones suaves de cámara al seleccionar un país, al cambiar de globo a plano y al cambiar de indicador (los colores se interpolan, no saltan). Todo respeta `prefers-reduced-motion`: con esa preferencia activa no hay rotación automática y las transiciones son cortas.

**Disposición en escritorio.** Mapa a pantalla completa. Barra superior mínima con logo, buscador, selector de idioma y tema. Panel izquierdo plegable con el catálogo de indicadores por categoría. Leyenda y control de año abajo. Ficha de país a la derecha.

**Disposición en móvil.** Mapa a pantalla completa con un botón de búsqueda. El catálogo y la ficha se abren como hojas inferiores deslizables. Gestos táctiles nativos para girar, acercar e inclinar.

El agente de diseño mantiene los tokens (colores, espaciados, radios, sombras, tipografía) en un único fichero y ninguna pantalla define colores fuera de él.

## Arquitectura técnica

Orbe es una aplicación de una sola página sin servidor propio: el pipeline genera los datos en el repositorio, la CI construye la web y GitHub Pages sirve ambas cosas como ficheros estáticos. El navegador solo habla con tres servicios externos gratuitos.

&#91;embedded content: arquitectura de Orbe · de las fuentes al navegador\]

El mapa base sale de OpenFreeMap; las geometrías y los datos de Orbe se superponen encima.

### Stack

Las versiones exactas se fijan en el hito M0 y no se cambian sin anotarlo en el registro de decisiones.

| Pieza | Elección | Motivo |
| --- | --- | --- |
| Base de la web | React 18, TypeScript estricto y Vite | Ecosistema maduro, tipado y build rápido |
| Estado | Zustand, sincronizado con los parámetros de la URL | Ligero; la URL es la fuente de verdad para compartir |
| Mapa | MapLibre GL JS v5 con proyección de globo | Código abierto, sin claves, globo con transición a plano |
| Capas avanzadas | deck.gl con `MapboxOverlay`, cargado bajo demanda | Burbujas, flujos, extrusión y miles de puntos con buen rendimiento |
| Escalas y proyecciones | d3-scale, d3-scale-chromatic y d3-geo | Escalas de color correctas y vista Equal Earth en v2 |
| Gráficas de la ficha | Observable Plot | Gráficas pequeñas y limpias con poco código |
| Mapa base | OpenFreeMap con estilos propios para cada tema | Teselas vectoriales gratuitas sin clave ni límites declarados |
| Geometrías propias | PMTiles generados con tippecanoe y leídos con el protocolo `pmtiles` | Un solo fichero por capa, servible desde hosting estático |
| Idiomas | i18next, `Intl.DisplayNames` e `Intl.NumberFormat` | Traducciones y nombres de países sin ficheros enormes |
| Banderas | flag-icons (MIT) | SVG ligeros por código ISO |
| Pipeline | Python 3.12 con uv, polars, geopandas y pydantic | Lenguaje que Jorge domina; validación tipada de metadatos |
| Pruebas | Vitest, Playwright, pytest, Lighthouse CI y axe-core | Cubren lógica, recorridos, datos, rendimiento y accesibilidad |
| Despliegue | GitHub Actions y GitHub Pages | Gratis y automático |
| Analítica | GoatCounter | Gratuito, sin cookies |

### Estructura del repositorio

```text
orbe/
├── CLAUDE.md               reglas para todos los agentes
├── .claude/
│   ├── settings.json       atribución desactivada, permisos
│   └── agents/             un fichero por subagente
├── docs/
│   ├── SPEC.md             este documento
│   └── DECISIONS.md        registro de decisiones
├── web/
│   ├── src/
│   │   ├── map/            motor de mapa y capas
│   │   ├── ui/             componentes de interfaz
│   │   ├── state/          estado y sincronización con la URL
│   │   ├── i18n/           textos en español e inglés
│   │   ├── theme/          tokens y estilos de mapa por tema
│   │   └── config/         tarjetas destacadas y ajustes
│   └── tests/
├── pipeline/
│   ├── sources/            un módulo por fuente
│   ├── catalog.yaml        definición de indicadores
│   └── tests/
├── data/                   salida del pipeline (servida tal cual)
├── .githooks/commit-msg    bloqueo de atribuciones
└── .github/workflows/      CI, despliegue y datos mensuales
```

### Cómo añadir un indicador

Es la operación más frecuente y no debe requerir tocar la interfaz: se añade su entrada en `catalog.yaml` (fuente, transformación, metadatos, tipo de capa y escala), un módulo en `pipeline/sources/` si la fuente es nueva, y se ejecuta el pipeline. El catálogo de la web, el buscador y la leyenda lo recogen solos.

## Requisitos de calidad

Los umbrales de esta tabla se comprueban en CI y bloquean el merge si fallan; los marcados como manuales se revisan al cerrar cada hito.

| Área | Requisito | Cómo se comprueba |
| --- | --- | --- |
| Carga inicial | JavaScript inicial de 500 KB comprimido como máximo; deck.gl y los modos secundarios se cargan bajo demanda | Presupuesto de tamaño en el build |
| Velocidad | LCP por debajo de 2,5 s y CLS por debajo de 0,1 en escritorio; Lighthouse de rendimiento de 85 o más en escritorio y 70 o más en móvil | Lighthouse CI |
| Fluidez | Globo a 60 fps en un portátil medio y 30 fps o más en un móvil de gama media, con la coropleta activa | Manual, con el panel de rendimiento del navegador |
| Datos | Un indicador se carga en menos de 300 ms con caché; ningún fichero de datos supera 2 MB | Test del pipeline |
| Accesibilidad | WCAG 2.2 AA en toda la interfaz; navegación completa con teclado; alternativa textual al mapa (tabla ordenable del indicador activo) | axe-core en Playwright y revisión manual |
| Idiomas | Español e inglés completos, español por defecto; ningún texto fijo en el código | Test que falla si falta una clave en un idioma |
| Navegadores | Últimas dos versiones de Chrome, Firefox, Safari y Edge; Safari en iOS 17 o superior; si no hay WebGL2, mensaje claro | Playwright en Chromium, Firefox y WebKit |
| SEO | Título, descripción e imagen para redes sociales por idioma; `sitemap.xml` | Lighthouse SEO de 90 o más |
| Privacidad | Sin cookies ni rastreadores de terceros; analítica con GoatCounter | Revisión manual |

**Pruebas.** Vitest para lógica (escalas, formateo, parseo de URL, carga de datos), Playwright para recorridos completos y capturas de pantalla comparadas en ambos temas y en tamaño móvil, y pytest para el pipeline. Cada pull request ejecuta todo y adjunta capturas de las pantallas afectadas para que la revisión visual sea rápida.

## Equipo de agentes y flujo de trabajo

El proyecto se desarrolla con Claude Code: una sesión principal hace de coordinadora y delega en cinco subagentes especializados, definidos en `.claude/agents/`. Jorge solo valida visualmente al cerrar cada hito.

| Agente | Responsabilidad | Carpetas que toca |
| --- | --- | --- |
| Coordinador (sesión principal) | Planifica el hito, crea las issues, reparte, integra ramas y mantiene este documento y el registro de decisiones | Todo, sin escribir funcionalidades |
| Mapa | MapLibre y deck.gl: globo, transición a plano, capas, extrusión, cámara, rendimiento gráfico | `web/src/map/` |
| Interfaz | React: paneles, buscador, ficha, leyenda, línea temporal, estado en la URL, idiomas | `web/src/ui/`, `web/src/state/`, `web/src/i18n/` |
| Datos | Pipeline en Python, catálogo, licencias, teselas de geometría, validaciones | `pipeline/`, `data/` |
| Diseño | Tokens visuales, temas, paletas, tipografía, revisión visual con capturas | `web/src/theme/` y revisión de cualquier PR visual |
| QA | Tests, Lighthouse, accesibilidad, revisión de cada pull request antes del merge | `web/tests/`, `pipeline/tests/`, `.github/workflows/` |

### Ciclo de un hito

1. El coordinador desglosa el hito en issues pequeñas (medio día o un día de trabajo cada una) con criterios de aceptación comprobables.
2. Cada agente trabaja en su rama (`feat/m2-coropleta`, `data/m2-catalogo`…) y abre un pull request.
3. QA y, si afecta a lo visual, Diseño revisan. Un PR no se integra con tests en rojo ni con comentarios sin resolver.
4. Al cerrar el hito se integra en `main`, GitHub Actions publica en GitHub Pages y el coordinador deja a Jorge un resumen breve: qué hay nuevo, enlace y qué mirar.
5. Jorge valida o pide cambios. Hasta su visto bueno no empieza el siguiente hito.

Las decisiones que cambian el alcance, añaden un coste, tocan licencias dudosas o contradicen este documento se le preguntan a Jorge; el resto lo deciden los agentes y lo anotan en el registro de decisiones.

### Reglas de git: sin rastro de Claude

Es un requisito obligatorio. Ningún commit, mensaje, PR, ajuste del repositorio ni lista de colaboradores puede mencionar a Claude ni a Anthropic.

- Toda la autoría es de Jorge: `git config user.name` y `user.email` con sus datos, y los PR se abren con su sesión de `gh`.
- En `.claude/settings.json` del proyecto se desactiva la atribución automática de Claude Code con `"attribution": {"commit": "", "pr": ""}` (la antigua opción `includeCoAuthoredBy` está obsoleta). Como hay casos documentados en que el ajuste no se respeta, el hook siguiente es la garantía real.
- Un hook `commit-msg` versionado en el repositorio rechaza cualquier mensaje que contenga "Co-Authored-By", "Generated with", "Claude Code" o "anthropic.com" (sin bloquear la palabra suelta "Claude", para que commits como "docs: actualiza CLAUDE.md" sigan pasando). La CI repite la comprobación sobre todos los commits y la descripción del PR.
- No se instala ninguna GitHub App ni cuenta de bot de Claude, ni se añade a nadie más como colaborador.
- Los commits de GitHub Actions (actualización mensual de datos) firman como el bot estándar de GitHub Actions.

Los mensajes siguen Conventional Commits en español (`feat(mapa): transición animada de globo a plano`).

### Ficheros de contexto para los agentes

Este documento se guarda como `docs/SPEC.md`. Además, en la raíz va un `CLAUDE.md` corto con las reglas que todo agente debe cumplir siempre: las reglas de git, los presupuestos de rendimiento, la prohibición de textos fijos sin traducir, la estructura de carpetas, cómo arrancar el proyecto y cómo pasar los tests. Cada fichero de `.claude/agents/` repite solo lo específico de su rol y remite a `SPEC.md` para lo demás. El registro de decisiones vive en `docs/DECISIONS.md`.

## Hitos y criterios de aceptación

La v1 se construye en seis hitos de una o dos semanas cada uno, con la web publicada al cerrar cada hito. No hay fechas fijas: el ritmo lo marca la validación de Jorge.

&#91;embedded content: hoja de ruta · 6 hitos hasta la v1 y ampliación v2\]

Cada hito está terminado solo si cumple todos sus criterios, pasa la CI completa y Jorge lo valida en la web publicada.

**M0 · Cimientos.**

- Repositorio público con licencia MIT, `CLAUDE.md`, `docs/SPEC.md`, `docs/DECISIONS.md` y los cinco agentes en `.claude/agents/`.
- Atribución de Claude Code desactivada, hook `commit-msg` activo y comprobación en CI; un commit de prueba con "Co-Authored-By" es rechazado.
- Proyecto Vite + React + TypeScript que se publica en GitHub Pages desde GitHub Actions.
- Pruebas de concepto resueltas y anotadas: deck.gl sobre el globo de MapLibre y PMTiles servido desde GitHub Pages.
- Licencias de UNESCO y Smithsonian comprobadas.

**M1 · Globo y mapa.**

- Globo con atmósfera y estrellas en tema oscuro, tema claro funcional y cambio entre ambos.
- Transición animada globo/plano por botón y por zoom.
- Pantalla de entrada con rotación que se detiene al interactuar y respeta `prefers-reduced-motion`.
- Buscador de países con vuelo de cámara, en español e inglés.
- Tokens de diseño centralizados y presupuestos de rendimiento activos en CI.

**M2 · Datos v1.**

- Pipeline completo con validaciones y GitHub Actions mensual que abre un PR.
- Al menos 50 indicadores en las ocho categorías, con metadatos y licencia.
- Modo explorar: catálogo por categorías, coropleta, leyenda, selector de año, ranking lateral, tooltip y patrón para países sin dato.
- Fuente, año y licencia visibles para el indicador activo.
- Tabla accesible alternativa al mapa.

**M3 · Ficha y tiempo.**

- Ficha de país completa (todos los apartados de la sección de alcance) como panel en escritorio y hoja inferior en móvil.
- Línea temporal con reproducción, pausa y velocidad, con colores interpolados.
- Estado de la vista en la URL; abrir un enlace reproduce exactamente la vista.
- Interfaz completa en ambos idiomas.

**M4 · Capas.**

- Burbujas proporcionales, puntos con icono y flujos funcionando sobre globo y plano.
- Capas de ciudades, volcanes, aeropuertos y patrimonio UNESCO (si su licencia lo permite).
- Terremotos del USGS en tiempo real con degradación elegante si la API falla.
- Geometría de provincias visible al acercarse.
- Modo de extrusión 3D.

**M5 · Lanzar v1.**

- Tarjetas de mapas destacados configurables en la entrada.
- Exportación a PNG y CSV si cabe en el esfuerzo previsto; si no, se pasa a v2 y se anota.
- Página "Acerca de" con fuentes, licencias y criterio de fronteras.
- GoatCounter, SEO por idioma e imagen para redes.
- Todos los requisitos de calidad cumplidos y revisión manual en móvil real.

**v2 · Ampliación.** Modo comparar, cartograma, vista Equal Earth, mapa de calor, relieve, datos subnacionales de Europa, EE. UU. y España, y nuevas capas en tiempo real (NASA EONET). Se planifica al cerrar la v1 con lo aprendido.

## Riesgos y registro de decisiones

### Riesgos

| Riesgo | Impacto | Mitigación |
| --- | --- | --- |
| deck.gl no se integra bien con el globo de MapLibre | Capas sin proyección esférica | Prueba de concepto en M0; plan B: capas nativas de MapLibre en el globo y deck.gl solo en plano |
| GitHub Pages no sirve bien PMTiles por peticiones de rango | Geometrías lentas o rotas | Comprobación en M0; plan B: TopoJSON troceado por nivel de zoom |
| Límites de GitHub Pages (sitio de 1 GB, ficheros de menos de 100 MB, unos 100 GB de tráfico al mes) | Despliegue rechazado o lento | Presupuesto de tamaño en CI; si el tráfico crece, pasar a Cloudflare Pages (también gratis) |
| Licencias incompatibles con un uso comercial futuro | Retirar datos más adelante | Licencia obligatoria en metadatos; CI rechaza indicadores sin licencia o con NC sin marcar |
| Fronteras en disputa | Críticas o malentendidos | Criterio de facto de Natural Earth, explicado en "Acerca de" |
| Rendimiento pobre en móviles | Mala experiencia | Presupuestos en CI, menos detalle geométrico y sin atmósfera en gama baja |
| Cambios de formato en las fuentes | Pipeline roto | Validación estricta; si falla, se mantienen los datos anteriores y se abre una issue |
| API en tiempo real caída o sin CORS | Capa vacía | Capa opcional con aviso; nunca bloquea la carga |

### Registro de decisiones

Estas son las decisiones tomadas en la entrevista inicial. A partir de aquí se amplían en `docs/DECISIONS.md`.

| Id | Decisión | Motivo |
| --- | --- | --- |
| D1 | MapLibre GL v5 + deck.gl; vista plana en Mercator, Equal Earth con D3 en v2 | Globo con transición a plano, zoom profundo y capas densas sin coste |
| D2 | Atlas de indicadores como núcleo; sin juegos | Coherencia multipropósito con un único motor |
| D3 | Países y provincias en todo el mundo, datos subnacionales solo en Europa, EE. UU. y España, ciudades como puntos | Mejor relación coste/aporte |
| D4 | Datos abiertos estáticos con pipeline mensual y terremotos en tiempo real | Funciona en hosting estático y gratuito |
| D5 | Escritorio primero, responsive completo, sin app nativa | Público y coste |
| D6 | Bilingüe español/inglés desde el inicio, español por defecto | Añadir idiomas después cuesta más |
| D7 | GitHub Pages, repositorio público, licencia MIT, coste cero | Portfolio y sin gasto |
| D8 | Tema oscuro espacial por defecto y claro editorial; paletas aptas para daltonismo | Atractivo y legible |
| D9 | Analítica sin cookies (GoatCounter), sin anuncios ni cuentas en v1 | Privacidad y simplicidad |
| D10 | Claude Code con cinco subagentes, trabajo por hitos con PR y validación de Jorge al cerrar cada hito | Autonomía con control |
| D11 | Ningún rastro de Claude en commits, PR ni colaboradores | Requisito de Jorge |
| D12 | Nombre provisional: Orbe | Corto y válido en español e inglés |
