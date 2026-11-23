"""Genera data/catalog.json y data/indicators/<id>.json a partir de catalog.yaml.

    uv run --directory pipeline python -m build_data

Un indicador que no pasa las validaciones no se publica: se conservan su entrada y su fichero
anteriores (si los hay) y el proceso termina con código 1. `source.accessed` y `generated` solo
cambian cuando cambia lo publicado, así que una ejecución sin cambios en la fuente no deja diff.
"""

import datetime
import importlib
import json
import re
import sys
from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel, ConfigDict, Field, model_validator

ROOT = Path(__file__).resolve().parent
DATA = ROOT.parent / "data"
MAX_BYTES = 2 * 1024 * 1024
MIN_COUNTRIES = 100

Record = tuple[str, int, float | None]


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Text(Model):
    es: str = Field(min_length=1)
    en: str = Field(min_length=1)


class Scale(Model):
    kind: Literal["sequential", "diverging"]
    transform: Literal["linear", "log", "quantile"]
    palette: str = Field(min_length=1)
    midpoint: float | None = None


class Source(Model):
    module: str = Field(min_length=1)
    name: str = Field(min_length=1)
    url: str = Field(pattern=r"^https://")


class License(Model):
    id: str = Field(min_length=1)
    url: str = Field(pattern=r"^https://")
    attribution: str = Field(min_length=1)
    commercial: bool

    @model_validator(mode="after")
    def nc_no_comercial(self):
        if "NC" in re.split(r"[-\s_]", self.id.upper()) and self.commercial:
            raise ValueError(f"licencia {self.id} no comercial con commercial: true")
        return self


class Entry(Model):
    id: str = Field(pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$")
    sourceCode: str = Field(min_length=1)
    order: Literal["desc", "asc"]
    name: Text
    description: Text
    unit: Text
    decimals: int = Field(ge=0, le=6)
    category: Literal[
        "demografia", "economia", "salud", "educacion", "medio-ambiente", "energia", "geografia", "sociedad"
    ]
    layer: Literal["choropleth"]
    scale: Scale
    source: Source
    license: License
    range: tuple[float, float]


def load_catalog(path: Path = ROOT / "catalog.yaml") -> list[Entry]:
    entries = [Entry.model_validate(e) for e in yaml.safe_load(path.read_text(encoding="utf-8"))]
    ids = [e.id for e in entries]
    if len(ids) != len(set(ids)):
        raise ValueError("ids repetidos en catalog.yaml")
    return entries


def valid_codes(data_dir: Path = DATA) -> set[str]:
    return {c["a3"] for c in json.loads((data_dir / "geo" / "countries.json").read_text(encoding="utf-8"))}


def validate(entry: Entry, records: list[Record], valid: set[str]) -> None:
    """Lanza ValueError si el indicador no se puede publicar."""
    if bad := sorted({a3 for a3, _, _ in records} - valid):
        raise ValueError(f"códigos fuera de countries.json: {bad[:10]}")
    keys = [(a3, y) for a3, y, _ in records]
    if len(keys) != len(set(keys)):
        raise ValueError("pares (país, año) duplicados")
    lo, hi = entry.range
    if out := [r for r in records if r[2] is not None and not lo <= r[2] <= hi]:
        raise ValueError(f"{len(out)} valores fuera del rango plausible {entry.range}, p. ej. {out[0]}")
    present = [(a3, y) for a3, y, v in records if v is not None]
    if not present:
        raise ValueError("sin datos")
    latest = max(y for _, y in present)
    n = sum(1 for _, y in present if y == latest)
    if n < MIN_COUNTRIES:
        raise ValueError(f"solo {n} países con dato en {latest} (mínimo {MIN_COUNTRIES})")


def build(entry: Entry, records: list[Record]) -> dict:
    """Fichero del indicador: años del primero al último con algún dato y solo países con algún dato."""
    present = [(a3, y, v) for a3, y, v in records if v is not None]
    years = list(range(min(y for _, y, _ in present), max(y for _, y, _ in present) + 1))
    col = {y: i for i, y in enumerate(years)}
    values: dict[str, list] = {}
    for a3, y, v in sorted(present):
        v = round(v, entry.decimals)
        values.setdefault(a3, [None] * len(years))[col[y]] = int(v) if entry.decimals == 0 else v
    return {"id": entry.id, "years": years, "values": values}


def dump_indicator(data: dict) -> bytes:
    return json.dumps(data, separators=(",", ":"), ensure_ascii=False).encode()


def catalog_entry(entry: Entry, data: dict, accessed: str) -> dict:
    d = entry.model_dump(exclude={"range"}, exclude_none=True)
    d["source"] = {"name": entry.source.name, "url": entry.source.url, "accessed": accessed}
    return {
        **d,
        "years": [data["years"][0], data["years"][-1]],
        "latestYear": data["years"][-1],
        "file": f"indicators/{entry.id}.json",
    }


def _read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else None


def run(entries: list[Entry], data_dir: Path = DATA, fetch=None, today: str | None = None) -> bool:
    """Publica los indicadores que pasan. Devuelve False si alguno falló. `fetch(entry, valid)` da los registros."""
    today = today or datetime.date.today().isoformat()
    fetch = fetch or (lambda e, valid: importlib.import_module(f"sources.{e.source.module}").records(e.sourceCode, valid))
    valid = valid_codes(data_dir)
    prev_catalog = _read_json(data_dir / "catalog.json") or {"generated": None, "indicators": []}
    prev_entries = {i["id"]: i for i in prev_catalog["indicators"]}
    out, ok = [], True
    (data_dir / "indicators").mkdir(parents=True, exist_ok=True)
    for entry in entries:
        path = data_dir / "indicators" / f"{entry.id}.json"
        try:
            records = fetch(entry, valid)
            validate(entry, records, valid)
            data = build(entry, records)
            blob = dump_indicator(data)
            if len(blob) > MAX_BYTES:
                raise ValueError(f"{len(blob)} bytes, más de {MAX_BYTES}")
        except Exception as exc:  # noqa: BLE001 — cualquier fallo deja publicado lo anterior
            ok = False
            print(f"[{entry.id}] NO SE PUBLICA: {exc}", file=sys.stderr)
            if entry.id in prev_entries:
                out.append(prev_entries[entry.id])
            continue
        prev = prev_entries.get(entry.id)
        unchanged = prev is not None and _read_json(path) == data
        accessed = prev["source"]["accessed"] if unchanged else today
        if not unchanged:
            path.write_bytes(blob)
        out.append(catalog_entry(entry, data, accessed))
        print(f"[{entry.id}] {'sin cambios' if unchanged else 'actualizado'}: {len(blob)} bytes", file=sys.stderr)
    generated = prev_catalog["generated"] if out == prev_catalog["indicators"] else today
    text = json.dumps({"generated": generated, "indicators": out}, ensure_ascii=False, indent=2) + "\n"
    (data_dir / "catalog.json").write_text(text, encoding="utf-8")
    return ok


if __name__ == "__main__":
    sys.exit(0 if run(load_catalog()) else 1)
