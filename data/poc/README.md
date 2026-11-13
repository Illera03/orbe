# data/poc

## countries.pmtiles

Polígonos de países para la prueba de concepto del hito M0.

- Fuente: [Natural Earth](https://www.naturalearthdata.com/) 1:50m Admin 0 – Countries, v5.1.2
  (`ne_50m_admin_0_countries.geojson` del repositorio
  [nvkelso/natural-earth-vector](https://github.com/nvkelso/natural-earth-vector)). Dominio público.
- Fecha de consulta y generación: 2026-11-13.
- Capa `countries`, zoom 0 a 6, simplificada por zoom con tippecanoe 2.79. Unos 1,4 MB.
- Propiedades: `ISO_A3` (con `ADM0_A3` cuando Natural Earth da `-99`; por ejemplo, `KOS` para Kosovo, que no es un código ISO oficial),
  `NAME_ES` y `NAME_EN`.

Para regenerarlo (necesita curl, uv y tippecanoe):

```bash
pipeline/geo/build_countries_pmtiles.sh
```
