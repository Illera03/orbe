"""Resumen de cambios de data/ sin red: fuentes simuladas sobre un data/ temporal."""

import json
import shutil

import pytest

import build_data as bd
import resumen

A = bd.load_catalog()[0]  # esperanza-vida, rango plausible con 70
B, C = (A.model_copy(update={"id": i}) for i in ("otro", "retirado"))
CODES = sorted(bd.valid_codes())[:130]


def recs(codes=CODES[:120], years=(2023, 2024), value=70.0):
    return [(a3, y, value) for a3 in codes for y in years]


@pytest.fixture
def data_dir(tmp_path):
    (tmp_path / "geo").mkdir()
    shutil.copy(bd.DATA / "geo" / "countries.json", tmp_path / "geo" / "countries.json")
    return tmp_path


def go(data_dir, entries, by_id, today):
    out = data_dir / "resumen.md"
    code = resumen.main(out, entries, data_dir, fetch=lambda e, v: by_id[e.id], today=today)
    return code, out.read_text()


def test_sin_cambios_no_toca_data(data_dir):
    by_id = {A.id: recs()}
    assert go(data_dir, [A], by_id, "2026-01-01")[0] == 0
    before = {p: p.read_bytes() for p in data_dir.rglob("*.json")}
    code, md = go(data_dir, [A], by_id, "2026-02-01")
    assert code == 0 and "Sin cambios" in md
    assert {p: p.read_bytes() for p in data_dir.rglob("*.json")} == before


def test_resumen_completo(data_dir):
    go(data_dir, [A, B, C], {A.id: recs(), B.id: recs(), C.id: recs()}, "2026-01-01")
    before_b = (data_dir / "indicators" / "otro.json").read_bytes()
    entry_b = next(i for i in json.loads((data_dir / "catalog.json").read_text())["indicators"] if i["id"] == B.id)
    # A: 2025 nuevo sin CODES[0] y con CODES[120]; 7 valores de 2023 revisados > 20 %. B falla. C sale del catálogo.
    a = [(a3, y, 90.0 if y == 2023 and a3 in CODES[:7] else v) for a3, y, v in recs()] + recs(CODES[1:121], (2025,))
    code, md = go(data_dir, [A, B], {A.id: a, B.id: recs(CODES[:50])}, "2026-02-01")
    print(md)
    assert code == 2
    assert "`otro`: ValueError: ningún año con 100" in md
    assert (data_dir / "indicators" / "otro.json").read_bytes() == before_b
    cat = {i["id"]: i for i in json.loads((data_dir / "catalog.json").read_text())["indicators"]}
    assert cat.keys() == {A.id, B.id} and cat[B.id] == entry_b
    assert not (data_dir / "indicators" / "retirado.json").exists()
    assert "## Retirados del catálogo (fichero borrado)\n\n- `retirado`" in md
    assert f"`{A.id}`: 2024 → 2025" in md
    assert f"`{A.id}` (2025): entran {CODES[120]}; salen {CODES[0]}" in md
    assert f"`{A.id}`: 7 valores (y 2 más)" in md and f"{CODES[0]} 2023: 70.0 → 90.0 (+29%)" in md
    assert md.count("2023: 70.0 → 90.0") == resumen.TOP_N


def test_umbral_de_cambio_grande():
    old = {"years": [2020], "values": {"AAA": [0.1], "BBB": [0], "CCC": [10], "DDD": [10], "EEE": [None], "FFF": [0.3]}}
    new = {"years": [2020], "values": {"AAA": [0.2], "BBB": [5], "CCC": [13], "DDD": [11.9], "EEE": [3], "FFF": [0.4]}}
    # AAA y FFF: una unidad del decimal (redondeo; 0.4 - 0.3 da 0.10000000000000003 en coma flotante);
    # BBB: desde 0; DDD: 19 %; EEE: sin dato antes.
    assert [c[1] for c in resumen.big_changes(old, new, decimals=1)] == ["CCC"]


def test_fichero_huerfano_sin_entrada(data_dir):
    go(data_dir, [A], {A.id: recs()}, "2026-01-01")
    (data_dir / "indicators" / "suelto.json").write_text("{}")
    code, md = go(data_dir, [A], {A.id: recs()}, "2026-02-01")
    assert code == 0 and not (data_dir / "indicators" / "suelto.json").exists()


def test_cambio_solo_de_metadatos(data_dir):
    go(data_dir, [A], {A.id: recs()}, "2026-01-01")
    renamed = A.model_copy(update={"decimals": A.decimals + 1})
    code, md = go(data_dir, [renamed], {A.id: recs()}, "2026-02-01")
    assert code == 0 and "Sin cambios" not in md and "- Con cambios: 1" in md
