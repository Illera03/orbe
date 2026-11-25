"""Fuente Our World in Data sin red: fixture recortado de un CSV de grapher."""

import json
from pathlib import Path

import pytest

import build_data as bd
from sources import owid

FIXTURE = Path(__file__).parent / "fixtures" / "owid_share-electricity-nuclear.csv"
VALID = bd.valid_codes(bd.DATA)
ENTRIES = {e.id: e for e in bd.load_catalog()}


def test_parse_quita_agregados_y_traduce_kosovo():
    rows = owid.parse(FIXTURE.read_text(), VALID)
    assert rows == [
        ("FRA", 1999, 75.1), ("FRA", 2000, 77.4), ("XKX", 2000, 0.0), ("ESP", 2000, 27.6), ("ESP", 2001, None),
    ]


@pytest.mark.parametrize(
    "text",
    ["", "entity,code,year,a,b\n", "country,code,year,v\n"],
)
def test_parse_rechaza_cabecera_inesperada(text):
    with pytest.raises(ValueError, match="cabecera"):
        owid.parse(text, VALID)


def test_since_descarta_anios_anteriores(tmp_path):
    (tmp_path / "geo").mkdir()
    (tmp_path / "geo" / "countries.json").write_bytes((bd.DATA / "geo" / "countries.json").read_bytes())
    entry = ENTRIES["electricidad-nuclear"]
    codes = sorted(VALID)[:100]
    recs = [(a3, y, 10.0) for a3 in codes for y in (1999, 2000)]
    assert bd.run([entry], tmp_path, fetch=lambda e, v: recs, today="2026-01-01")
    data = (tmp_path / "indicators" / "electricidad-nuclear.json").read_text()
    assert '"years":[2000]' in data
    assert "since" not in (tmp_path / "catalog.json").read_text()


def test_licencias_owid_citan_a_owid_y_fuente_original():
    for e in ENTRIES.values():
        if e.source.module == "owid":
            assert "Our World in Data" in e.license.attribution and e.license.attribution.split(",")[0] != "Our World in Data"


def test_log_publica_ceros_como_sin_dato(tmp_path):
    (tmp_path / "geo").mkdir()
    (tmp_path / "geo" / "countries.json").write_bytes((bd.DATA / "geo" / "countries.json").read_bytes())
    recs = [(a3, 2020, 5.0) for a3 in sorted(VALID - {"ATA", "ESP"})[:100]] + [("ATA", 2020, 0.0), ("ESP", 2020, -1.0)]
    assert bd.run([ENTRIES["co2-total"]], tmp_path, fetch=lambda e, v: recs, today="2026-01-01")
    values = json.loads((tmp_path / "indicators" / "co2-total.json").read_text())["values"]
    assert "ATA" not in values and "ESP" not in values and len(values) == 100
