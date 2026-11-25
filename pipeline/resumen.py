"""Ejecuta el pipeline y escribe en Markdown qué ha cambiado en data/ (cuerpo del PR mensual).

    uv run --directory pipeline python -m resumen /ruta/absoluta/resumen.md

La ruta, absoluta: `uv run --directory` cambia el directorio de trabajo a pipeline/.

Código de salida (D60): 0 si todo se publicó, 2 si algún indicador falló (conserva lo anterior) y
1 si el proceso entero se cae (p. ej. catalog.yaml inválido; entonces no hay resumen).
"""

import json
import sys
from pathlib import Path

import build_data as bd

# Cambio grande (D60): variación relativa > 20 % en un valor ya publicado y de más de una unidad del
# último decimal (para no contar saltos de redondeo); se listan los TOP_N mayores por indicador.
THRESHOLD = 0.20
TOP_N = 5


def snapshot(data_dir: Path) -> tuple[dict, dict]:
    """Entradas del catálogo y ficheros publicados, por id."""
    cat = bd._read_json(data_dir / "catalog.json") or {"indicators": []}
    entries = {i["id"]: i for i in cat["indicators"]}
    return entries, {k: bd._read_json(data_dir / e["file"]) for k, e in entries.items()}


def _at(data: dict, year: int) -> set[str]:
    i = data["years"].index(year)
    return {a3 for a3, v in data["values"].items() if v[i] is not None}


def big_changes(old: dict, new: dict, decimals: int) -> list[tuple[float, str, int, float, float]]:
    """(variación relativa, país, año, antes, ahora) de los valores publicados en ambos que cambian mucho."""
    col = {y: i for i, y in enumerate(new["years"])}
    out = []
    for a3, vals in old["values"].items():
        for y, a in zip(old["years"], vals):
            b = new["values"].get(a3, [None] * len(col))[col[y]] if y in col else None
            # Con a == 0 la variación relativa no está definida: no se lista.
            if a is None or b is None or a == 0 or abs(b - a) <= 10**-decimals:
                continue
            if (rel := abs(b - a) / abs(a)) > THRESHOLD:
                out.append((rel, a3, y, a, b))
    return sorted(out, key=lambda c: (-c[0], c[1], c[2]))


def summarize(before: tuple[dict, dict], after: tuple[dict, dict], failures: dict[str, str]) -> str:
    (old_cat, old), (new_cat, new) = before, after
    lines = ["# Resumen de la actualización de datos", ""]
    changed = [k for k in new if k in old and new[k] != old[k]]
    added, removed = sorted(new.keys() - old.keys()), sorted(old.keys() - new.keys())
    if not (changed or added or removed or failures):
        return "\n".join(lines + ["Sin cambios: ningún indicador tiene datos nuevos y `data/` no se ha modificado.", ""])

    lines += [f"- Indicadores publicados: {len(new)}", f"- Con cambios: {len(changed)}",
              f"- Nuevos: {len(added)}", f"- Retirados: {len(removed)}", f"- Fallidos: {len(failures)}", ""]
    if failures:
        lines += ["## Fallidos (se conserva lo publicado)", ""]
        lines += [f"- `{k}`: {msg}" + ("" if k in old_cat else " (sin publicación previa)") for k, msg in sorted(failures.items())]
        lines.append("")
    if added:
        lines += ["## Nuevos", ""] + [f"- `{k}` (último año {new_cat[k]['latestYear']})" for k in added] + [""]
    if removed:
        lines += ["## Retirados del catálogo (fichero borrado)", ""] + [f"- `{k}`" for k in removed] + [""]
    years = [k for k in changed if new_cat[k]["latestYear"] != old_cat[k]["latestYear"]]
    if years:
        lines += ["## Años nuevos", ""]
        lines += [f"- `{k}`: {old_cat[k]['latestYear']} → {new_cat[k]['latestYear']}" for k in years] + [""]
    moves = []
    for k in changed:
        a, b = _at(old[k], old_cat[k]["latestYear"]), _at(new[k], new_cat[k]["latestYear"])
        if a != b:
            moves.append(f"- `{k}` ({new_cat[k]['latestYear']}): " + "; ".join(
                f"{label} {', '.join(sorted(s))}" for label, s in (("entran", b - a), ("salen", a - b)) if s))
    if moves:
        lines += ["## Países que entran o salen en el año más reciente", ""] + moves + [""]
    big = [(k, c) for k in changed if (c := big_changes(old[k], new[k], new_cat[k]["decimals"]))]
    if big:
        lines += [f"## Cambios de más del {THRESHOLD * 100:.0f} % en valores ya publicados", ""]
        for k, c in big:
            more = f" (y {len(c) - TOP_N} más)" if len(c) > TOP_N else ""
            lines.append(f"- `{k}`: {len(c)} valores{more}")
            lines += [f"  - {a3} {y}: {a} → {b} ({(b - a) / abs(a):+.0%})" for _, a3, y, a, b in c[:TOP_N]]
        lines.append("")
    return "\n".join(lines)


def main(out: Path, entries: list[bd.Entry] | None = None, data_dir: Path = bd.DATA, **kwargs) -> int:
    before = snapshot(data_dir)
    failures = bd.run(entries or bd.load_catalog(), data_dir, **kwargs)
    out.write_text(summarize(before, snapshot(data_dir), failures), encoding="utf-8")
    return 2 if failures else 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("uso: python -m resumen RUTA.md")
    sys.exit(main(Path(sys.argv[1]).resolve()))
