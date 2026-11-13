import json
from pathlib import Path

import pycountry
import pytest

DATA = Path(__file__).resolve().parents[2] / "data"
COUNTRIES = json.loads((DATA / "geo" / "countries.json").read_text(encoding="utf-8"))
# Códigos de usuario aceptados (no son ISO oficial): Kosovo, como en el Banco Mundial y Intl.DisplayNames.
USER_ASSIGNED = {"XKX": "XK"}


def test_tabla_completa():
    assert len(COUNTRIES) >= 200
    assert all(set(c) == {"a3", "a2", "bbox"} for c in COUNTRIES)


def test_codigos_validos_y_coherentes():
    for c in COUNTRIES:
        if c["a3"] in USER_ASSIGNED:
            assert c["a2"] == USER_ASSIGNED[c["a3"]]
            continue
        iso = pycountry.countries.get(alpha_3=c["a3"])
        assert iso is not None, f"{c['a3']} no es ISO 3166-1 alfa-3"
        assert iso.alpha_2 == c["a2"], f"{c['a3']}: alfa-2 {c['a2']} != {iso.alpha_2}"


@pytest.mark.parametrize("key", ["a3", "a2"])
def test_sin_duplicados(key):
    codes = [c[key] for c in COUNTRIES]
    assert len(codes) == len(set(codes))


def test_bbox_en_rango():
    for c in COUNTRIES:
        w, s, e, n = c["bbox"]
        assert -180 <= w <= 180 and -180 <= e <= 180, c
        assert -90 <= s < n <= 90, c
        assert w != e, c


def test_antimeridiano():
    # oeste > este significa que el encuadre cruza el antimeridiano (para la cámara, este + 360).
    cruzan = {c["a3"] for c in COUNTRIES if c["bbox"][0] > c["bbox"][2]}
    assert cruzan == {"FJI", "NZL", "RUS", "USA"}


def test_ningun_fichero_de_datos_supera_2_mb():
    grandes = [p for p in DATA.rglob("*") if p.is_file() and p.stat().st_size > 2 * 1024 * 1024]
    assert not grandes, grandes
