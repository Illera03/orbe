# data/geo

Geometría de países de producción y tabla de encuadres.

- Fuente: [Natural Earth](https://www.naturalearthdata.com/) 1:50m Admin 0 – Countries, v5.1.2
  (`ne_50m_admin_0_countries.geojson` del repositorio
  [nvkelso/natural-earth-vector](https://github.com/nvkelso/natural-earth-vector),
  <https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_0_countries.geojson>).
- Licencia: dominio público ([términos de Natural Earth](https://www.naturalearthdata.com/about/terms-of-use/)).
- Fecha de consulta y generación: 2026-11-13.
- Fronteras en disputa: representación de facto de Natural Earth.

## countries.pmtiles

Capa `countries`, zoom 0 a 6, simplificada por zoom con tippecanoe 2.79 (mismos parámetros que `data/poc/`,
validados en #7). Unos 1,4 MB. Propiedades por polígono:

- `ISO_A3`: ISO 3166-1 alfa-3 (con `ADM0_A3` cuando Natural Earth da `-99`, por ejemplo Francia y Noruega).
- `ISO_A2`: ISO 3166-1 alfa-2. Falta en las entidades sin código ISO (ver abajo).
- `NAME_ES` y `NAME_EN`: nombres de Natural Earth (la interfaz usa `Intl.DisplayNames`).

## countries.json

Lista de 237 países con código ISO, ordenada por `a3`, una entrada por línea:

```json
{"a3":"ESP","a2":"ES","bbox":[-18.17,27.64,4.33,43.77]}
```

- `bbox` es `[oeste, sur, este, norte]` en grados, redondeado hacia fuera a 0,01°, pensado para encuadrar la cámara:
  cubre el polígono mayor del país y las islas a menos de 10° de alguna parte ya incluida. Los territorios lejanos
  que Natural Earth incluye en el país quedan fuera (Guayana Francesa en Francia, Hawái en EE. UU., Caribe en Países Bajos).
- Si `oeste > este`, el encuadre cruza el antimeridiano: hay que usar `este + 360`. Pasa en Fiyi, Nueva Zelanda
  (islas Chatham), Rusia (Chukotka) y EE. UU. (Aleutianas). La Antártida va de -180 a 180.

## Casos especiales

- Kosovo: Natural Earth da `KOS`; se publica `XKX` / `XK`, el código de usuario que usan el Banco Mundial e `Intl.DisplayNames`.
- Taiwán: `ISO_A2` de Natural Earth es `CN-TW`; se usa `TW` (`ISO_A2_EH`).
- Sin código ISO 3166-1: se dibujan en el PMTiles con el `ADM0_A3` de Natural Earth y sin `ISO_A2`, pero no están en
  `countries.json`: Somalilandia (`SOL`), Chipre del Norte (`CYN`), territorios australianos del Índico (`IOA`),
  islas Ashmore y Cartier (`ATC`) y glaciar de Siachen (`KAS`).

## Regenerar

Necesita uv y tippecanoe:

```bash
uv run --directory pipeline python geo/build_countries.py
uv run --directory pipeline pytest
```
