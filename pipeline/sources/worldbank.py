"""Banco Mundial, API v2 en JSON (https://datahelpdesk.worldbank.org/knowledgebase/articles/889392)."""

import json
import urllib.request

URL = "https://api.worldbank.org/v2/country/all/indicator/{code}?format=json&per_page=20000"


def fetch(code: str) -> list:
    req = urllib.request.Request(URL.format(code=code), headers={"User-Agent": "orbe-pipeline"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.load(resp)


def parse(payload: list, valid: set[str]) -> list[tuple[str, int, float | None]]:
    """Filas (a3, año, valor) de los países de `valid`; los agregados (AFE, WLD…) quedan fuera."""
    if len(payload) < 2 or "message" in payload[0]:
        raise ValueError(f"respuesta de error del Banco Mundial: {payload[0]}")
    if payload[0]["pages"] != 1:
        raise ValueError(f"respuesta paginada ({payload[0]['pages']} páginas): sube per_page")
    return [
        (r["countryiso3code"], int(r["date"]), r["value"])
        for r in payload[1] or []
        if r["countryiso3code"] in valid
    ]


def records(code: str, valid: set[str]) -> list[tuple[str, int, float | None]]:
    return parse(fetch(code), valid)
