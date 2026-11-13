#!/usr/bin/env bash
# Genera data/poc/countries.pmtiles (capa "countries") desde Natural Earth 1:50m admin-0.
# Requisitos: curl, uv, tippecanoe >= 2.x. Uso: pipeline/geo/build_countries_pmtiles.sh
set -euo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$REPO/data/poc/countries.pmtiles"
SRC="https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_0_countries.geojson"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

curl -fsSL "$SRC" -o "$TMP/ne.geojson"

# Solo ISO_A3 (ADM0_A3 si ISO_A3 es -99), NAME_ES y NAME_EN.
uv run --no-project --python 3.12 python -I - "$TMP/ne.geojson" "$TMP/countries.geojson" <<'PY'
import json, sys
src, dst = sys.argv[1], sys.argv[2]
fc = json.load(open(src, encoding="utf-8"))
for f in fc["features"]:
    p = f["properties"]
    iso = p["ISO_A3"] if p["ISO_A3"] != "-99" else p["ADM0_A3"]
    f["properties"] = {"ISO_A3": iso, "NAME_ES": p["NAME_ES"], "NAME_EN": p["NAME_EN"]}
isos = [f["properties"]["ISO_A3"] for f in fc["features"]]
assert len(isos) > 200 and all(len(i) == 3 for i in isos), "datos de origen inesperados"
json.dump(fc, open(dst, "w", encoding="utf-8"), ensure_ascii=False)
PY

mkdir -p "$(dirname "$OUT")"
# z0-6: 1:50m no gana detalle por encima de z6; la simplificación por zoom de tippecanoe (detect-shared-borders evita huecos entre países) deja el fichero muy por debajo de 2 MB.
tippecanoe -q -o "$OUT" --force -l countries -Z0 -z6 --detect-shared-borders "$TMP/countries.geojson"

SIZE=$(wc -c < "$OUT")
[ "$SIZE" -le 2097152 ] || { echo "countries.pmtiles ocupa $SIZE bytes (> 2 MB)" >&2; exit 1; }
echo "OK: $OUT ($SIZE bytes)"
