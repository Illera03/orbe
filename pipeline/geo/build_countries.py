"""Genera data/geo/countries.pmtiles y data/geo/countries.json desde Natural Earth 1:50m admin-0.

Requisitos: uv y tippecanoe >= 2.x. Uso: uv run --directory pipeline python geo/build_countries.py
"""

import json
import math
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path

SRC = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_0_countries.geojson"
OUT = Path(__file__).resolve().parents[2] / "data" / "geo"
MAX_BYTES = 2 * 1024 * 1024
# Natural Earth da -99 en ISO_A3; ADM0_A3 es su código propio. Kosovo usa el código de usuario XKX/XK (Banco Mundial, CLDR).
A3_FIX = {"KOS": "XKX"}
# Entidades sin código ISO 3166-1: se dibujan en el PMTiles pero no entran en countries.json.
NON_ISO = {"SOL", "CYN", "IOA", "ATC", "KAS"}
# Islas a más de esta distancia (grados) de la parte principal no cuentan para el encuadre.
LINK_DEG = 10.0


def codes(p: dict) -> tuple[str, str | None]:
    a3 = p["ISO_A3"] if p["ISO_A3"] != "-99" else p["ADM0_A3"]
    a3 = A3_FIX.get(a3, a3)
    a2 = None if a3 in NON_ISO else p["ISO_A2_EH"]  # ISO_A2 trae -99 en Francia y Noruega y CN-TW en Taiwán
    return a3, a2


def polygons(geom: dict) -> list:
    return [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]


def camera_bbox(geom: dict) -> list[float]:
    """Bbox [oeste, sur, este, norte] de la parte principal del país.

    Parte del polígono mayor y añade los que están a menos de LINK_DEG de alguno ya incluido.
    Las longitudes se desenvuelven alrededor del polígono mayor, así que si oeste > este el
    encuadre cruza el antimeridiano (para la cámara: este + 360).
    """
    boxes = []
    for poly in polygons(geom):
        xs = [x for x, _ in poly[0]]
        ys = [y for _, y in poly[0]]
        boxes.append([min(xs), min(ys), max(xs), max(ys)])
    main = max(boxes, key=lambda b: (b[2] - b[0]) * (b[3] - b[1]) * math.cos(math.radians((b[1] + b[3]) / 2)))
    center = (main[0] + main[2]) / 2
    for b in boxes:
        shift = 360 * round((center - (b[0] + b[2]) / 2) / 360)
        b[0] += shift
        b[2] += shift

    def near(a, b):
        dx = max(0.0, a[0] - b[2], b[0] - a[2])
        dy = max(0.0, a[1] - b[3], b[1] - a[3])
        return math.hypot(dx, dy) <= LINK_DEG

    kept, rest = [main], [b for b in boxes if b is not main]
    grew = True
    while grew:
        grew = False
        for b in rest[:]:
            if any(near(b, k) for k in kept):
                kept.append(b)
                rest.remove(b)
                grew = True
    w, s = min(b[0] for b in kept), min(b[1] for b in kept)
    e, n = max(b[2] for b in kept), max(b[3] for b in kept)
    wrap = lambda x: (x + 180) % 360 - 180 if not -180 <= x <= 180 else x  # noqa: E731
    # Redondeo hacia fuera a 0,01° (~1 km) para que el bbox contenga siempre el país.
    return [
        math.floor(wrap(w) * 100) / 100,
        math.floor(s * 100) / 100,
        math.ceil(wrap(e) * 100) / 100,
        math.ceil(n * 100) / 100,
    ]


def main() -> None:
    with urllib.request.urlopen(SRC) as r:
        fc = json.load(r)
    rows = []
    for f in fc["features"]:
        p = f["properties"]
        a3, a2 = codes(p)
        f["properties"] = {"ISO_A3": a3, "NAME_ES": p["NAME_ES"], "NAME_EN": p["NAME_EN"]}
        if a2:
            f["properties"]["ISO_A2"] = a2
            rows.append({"a3": a3, "a2": a2, "bbox": camera_bbox(f["geometry"])})
    rows.sort(key=lambda r: r["a3"])
    a3s = [f["properties"]["ISO_A3"] for f in fc["features"]]
    assert len(a3s) > 200 and len(set(a3s)) == len(a3s), "datos de origen inesperados"
    assert len({r["a2"] for r in rows}) == len(rows) and all(len(r["a2"]) == 2 for r in rows), "alfa-2 inesperado"

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "countries.json").write_text(
        "[\n" + ",\n".join(json.dumps(r, separators=(",", ":")) for r in rows) + "\n]\n", encoding="utf-8"
    )
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / "countries.geojson"
        src.write_text(json.dumps(fc, ensure_ascii=False), encoding="utf-8")
        # Mismos parámetros que data/poc (validados en #7): z0-6, simplificación por zoom sin huecos entre países.
        subprocess.run(
            ["tippecanoe", "-q", "-o", str(OUT / "countries.pmtiles"), "--force", "-l", "countries",
             "-Z0", "-z6", "--detect-shared-borders", str(src)],
            check=True,
        )
    for name in ("countries.json", "countries.pmtiles"):
        size = (OUT / name).stat().st_size
        if size > MAX_BYTES:
            sys.exit(f"{name} ocupa {size} bytes (> 2 MB)")
        print(f"OK: data/geo/{name} ({size} bytes, {len(rows)} países en la tabla)")


if __name__ == "__main__":
    main()
