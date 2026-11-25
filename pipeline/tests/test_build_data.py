"""Pipeline de indicadores sin red: fuente simulada con un fixture del Banco Mundial."""

import json
import shutil
from pathlib import Path

import pytest
from pydantic import ValidationError

import build_data as bd
from sources import worldbank

FIXTURE = Path(__file__).parent / "fixtures" / "worldbank_SP.DYN.LE00.IN.json"
REAL_DATA = bd.DATA
VALID = bd.valid_codes(REAL_DATA)
ENTRY = bd.load_catalog()[0]
CODES = sorted(VALID)[:120]


def records(year=2024, n=120, value=70.04):
    return [(a3, y, value) for a3 in CODES[:n] for y in (year - 1, year)]


@pytest.fixture
def data_dir(tmp_path):
    (tmp_path / "geo").mkdir()
    shutil.copy(REAL_DATA / "geo" / "countries.json", tmp_path / "geo" / "countries.json")
    return tmp_path


def test_parse_quita_agregados():
    rows = worldbank.parse(json.loads(FIXTURE.read_text()), VALID)
    assert {a3 for a3, _, _ in rows} == {"ESP", "FRA", "XKX"}
    assert all(isinstance(y, int) for _, y, _ in rows)


def test_parse_rechaza_errores_y_paginacion():
    with pytest.raises(ValueError):
        worldbank.parse([{"message": [{"id": "120", "value": "Invalid value"}]}], VALID)
    with pytest.raises(ValueError):
        worldbank.parse([{"pages": 2}, []], VALID)


def test_catalogo_yaml_valido():
    assert ENTRY.id == "esperanza-vida" and ENTRY.license.commercial


def test_validaciones_pasan():
    bd.validate(ENTRY, records(), VALID)


@pytest.mark.parametrize(
    "recs, msg",
    [
        (records() + [("WLD", 2024, 70.0)], "countries.json"),
        (records() + [(CODES[0], 2024, 71.0)], "duplicados"),
        (records(value=150.0), "rango"),
        (records(n=99), "ningún año con 100"),
        ([(CODES[0], 2024, None)], "sin datos"),
    ],
)
def test_validaciones_fallan(recs, msg):
    with pytest.raises(ValueError, match=msg):
        bd.validate(ENTRY, recs, VALID)


def test_recorta_anios_finales_con_poca_cobertura(data_dir):
    # 2025 con 40 países no llega a 100: no se publica y latestYear es 2024.
    recs = records() + [(a3, 2025, 70.0) for a3 in CODES[:40]]
    assert bd.run([ENTRY], data_dir, fetch=lambda e, v: recs, today="2026-01-01")
    (ind,) = json.loads((data_dir / "catalog.json").read_text())["indicators"]
    data = json.loads((data_dir / ind["file"]).read_text())
    assert ind["latestYear"] == ind["years"][1] == data["years"][-1] == 2024
    assert all(len(v) == len(data["years"]) for v in data["values"].values())


def test_licencia_obligatoria_y_nc():
    raw = ENTRY.model_dump()
    with pytest.raises(ValidationError):
        bd.Entry.model_validate({**raw, "license": {**raw["license"], "id": "CC-BY-NC-SA-4.0"}})
    bd.Entry.model_validate({**raw, "license": {**raw["license"], "id": "CC-BY-NC-SA-4.0", "commercial": False}})
    without = {k: v for k, v in raw.items() if k != "license"}
    with pytest.raises(ValidationError):
        bd.Entry.model_validate(without)
    with pytest.raises(ValidationError):
        bd.Entry.model_validate({**raw, "license": {**raw["license"], "attribution": ""}})


@pytest.mark.parametrize(
    "scale",
    [
        {"domain": [85, 45]},
        {"domain": [45, 45]},
        {"domain": [45]},
        {"domain": [45, 85, 90]},
        {"domain": ["a", 85]},
        {"domain": [0, 85], "transform": "log"},
        {"domain": [-1, 85], "transform": "log"},
        {"domain": [float("-inf"), 85]},
        {"domain": [45, float("inf")]},
        {"domain": [float("nan"), 85]},
        {"midpoint": float("nan")},
        {"palette": "Viridis"},
        {"palette": "magma"},
        {"palette": "puor"},
        {"kind": "diverging"},
    ],
)
def test_domain_invalido(scale):
    raw = ENTRY.model_dump()
    with pytest.raises(ValidationError):
        bd.Entry.model_validate({**raw, "scale": {**raw["scale"], **scale}})


def test_paleta_por_kind():
    raw = ENTRY.model_dump()
    div = bd.Entry.model_validate({**raw, "scale": {**raw["scale"], "kind": "diverging", "palette": "puor", "midpoint": 0}})
    assert div.scale.palette == bd.PALETTES["diverging"]


def test_catalogo_completo_valido():
    entries = bd.load_catalog()
    assert len(entries) >= 30 and all(e.scale.palette == bd.PALETTES[e.scale.kind] for e in entries)
    assert all(e.scale.midpoint is not None for e in entries if e.scale.kind == "diverging")
    assert all(e.range[0] > 0 for e in entries if e.scale.transform == "log")


def test_log_rechaza_valores_no_positivos():
    raw = ENTRY.model_dump()
    log = bd.Entry.model_validate({**raw, "scale": {**raw["scale"], "transform": "log", "domain": None}, "range": [-10, 100]})
    bd.validate(log, records(), VALID)
    with pytest.raises(ValueError, match="≤ 0"):
        bd.validate(log, records() + [(CODES[0], 2000, 0.0)], VALID)


def test_per_page_sin_paginar():
    per_page = int(worldbank.URL.rsplit("per_page=", 1)[1])
    assert 266 * 100 <= per_page <= 32767  # 100 años de las 266 entidades de la API; 32767 es el mayor probado (50000 da 400)


def test_domain_valido_y_omitido(data_dir):
    raw = ENTRY.model_dump()
    log = bd.Entry.model_validate({**raw, "scale": {**raw["scale"], "domain": [0.5, 85], "transform": "log"}})
    assert log.scale.domain == (0.5, 85)
    no_domain = bd.Entry.model_validate({**raw, "scale": {**raw["scale"], "domain": None}})
    assert bd.run([no_domain], data_dir, fetch=lambda e, v: records(), today="2026-01-01")
    (ind,) = json.loads((data_dir / "catalog.json").read_text())["indicators"]
    assert "domain" not in ind["scale"]


def test_contrato(data_dir):
    fixture = worldbank.parse(json.loads(FIXTURE.read_text()), VALID)
    recs = fixture + [r for r in records() if r[0] not in {a3 for a3, _, _ in fixture}]
    assert bd.run([ENTRY], data_dir, fetch=lambda e, v: recs, today="2026-01-01")
    cat = json.loads((data_dir / "catalog.json").read_text())
    assert set(cat) == {"generated", "indicators"}
    (ind,) = cat["indicators"]
    assert list(ind) == [
        "id", "sourceCode", "order", "name", "description", "unit", "decimals", "category",
        "layer", "scale", "source", "license", "years", "latestYear", "file",
    ]
    assert ind["source"]["accessed"] == "2026-01-01" and ind["file"] == "indicators/esperanza-vida.json"
    assert "midpoint" not in ind["scale"]
    assert ind["scale"]["domain"] == [45, 85]
    raw = (data_dir / ind["file"]).read_text()
    assert " " not in raw  # JSON compacto
    data = json.loads(raw)
    assert set(data) == {"id", "years", "values"}
    assert data["years"] == list(range(ind["years"][0], ind["years"][1] + 1))
    assert ind["latestYear"] == data["years"][-1] == 2024  # 2025 viene vacío en la fuente
    assert all(len(v) == len(data["years"]) for v in data["values"].values())
    assert data["values"][CODES[0]][0] == 70.0  # 70.04 redondeado a 1 decimal
    assert "WLD" not in data["values"] and "ESP" in data["values"]


def test_accessed_estable(data_dir):
    run = lambda recs, today: bd.run([ENTRY], data_dir, fetch=lambda e, v: recs, today=today)  # noqa: E731
    run(records(), "2026-01-01")
    before = {p: p.read_bytes() for p in data_dir.rglob("*.json")}
    run(records(), "2026-02-01")
    assert {p: p.read_bytes() for p in data_dir.rglob("*.json")} == before
    run(records(value=71.0), "2026-03-01")
    cat = json.loads((data_dir / "catalog.json").read_text())
    assert cat["generated"] == cat["indicators"][0]["source"]["accessed"] == "2026-03-01"


def test_fallo_conserva_lo_publicado(data_dir):
    bd.run([ENTRY], data_dir, fetch=lambda e, v: records(), today="2026-01-01")
    before = {p: p.read_bytes() for p in data_dir.rglob("*.json")}
    assert not bd.run([ENTRY], data_dir, fetch=lambda e, v: records(n=50), today="2026-02-01")
    assert {p: p.read_bytes() for p in data_dir.rglob("*.json")} == before


def test_fallo_sin_publicacion_previa(data_dir):
    assert not bd.run([ENTRY], data_dir, fetch=lambda e, v: records(n=50), today="2026-01-01")
    assert json.loads((data_dir / "catalog.json").read_text())["indicators"] == []
    assert not (data_dir / "indicators" / "esperanza-vida.json").exists()


def test_fichero_demasiado_grande(data_dir, monkeypatch):
    monkeypatch.setattr(bd, "MAX_BYTES", 100)
    assert not bd.run([ENTRY], data_dir, fetch=lambda e, v: records(), today="2026-01-01")
    assert not (data_dir / "indicators" / "esperanza-vida.json").exists()


def test_datos_publicados_cumplen():
    """La salida versionada en data/ respeta límites y contrato."""
    cat = json.loads((REAL_DATA / "catalog.json").read_text())
    for ind in cat["indicators"]:
        path = REAL_DATA / ind["file"]
        assert path.stat().st_size <= bd.MAX_BYTES
        data = json.loads(path.read_text())
        assert data["id"] == ind["id"] and set(data["values"]) <= VALID
        latest = sum(v[-1] is not None for v in data["values"].values())
        assert latest >= bd.MIN_COUNTRIES


@pytest.mark.parametrize("ind", json.loads((REAL_DATA / "catalog.json").read_text())["indicators"], ids=lambda i: i["id"])
def test_catalogo_publicado(ind):
    # Lo que se sirve en data/: licencia enlazada, fichero presente y ≥ 100 países en latestYear.
    lic = ind["license"]
    assert lic["id"] and lic["url"].startswith("https://") and lic["attribution"]
    data = json.loads((REAL_DATA / ind["file"]).read_text())
    i = data["years"].index(ind["latestYear"])
    assert sum(v[i] is not None for v in data["values"].values()) >= 100
