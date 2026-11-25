"""Our World in Data, CSV de grapher (https://docs.owid.io/projects/etl/api/chart-api/).

`code` es el slug del gráfico (https://ourworldindata.org/grapher/<slug>) y debe tener una sola columna de valores.
"""

import csv
import io
import urllib.request

URL = "https://ourworldindata.org/grapher/{code}.csv?v=1&csvType=full&useColumnShortNames=true"
# OWID usa códigos propios para lo que no tiene ISO; Kosovo es XKX en countries.json, como en el Banco Mundial.
ALIAS = {"OWID_KOS": "XKX"}


def fetch(code: str) -> str:
    req = urllib.request.Request(URL.format(code=code), headers={"User-Agent": "orbe-pipeline"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read().decode("utf-8")


def parse(text: str, valid: set[str]) -> list[tuple[str, int, float | None]]:
    """Filas (a3, año, valor) de los países de `valid`; agregados (OWID_WRL, regiones sin código…) quedan fuera."""
    rows = csv.reader(io.StringIO(text))
    header = next(rows, [])
    if header[:3] != ["entity", "code", "year"] or len(header) != 4:
        raise ValueError(f"cabecera inesperada de OWID (se espera entity,code,year,<valor>): {header}")
    out = []
    for _, code, year, value in rows:
        a3 = ALIAS.get(code, code)
        if a3 in valid:
            out.append((a3, int(year), float(value) if value else None))
    return out


def records(code: str, valid: set[str]) -> list[tuple[str, int, float | None]]:
    return parse(fetch(code), valid)
