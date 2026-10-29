"""Extract the official DB-HE Anejo B climate table with its cell geometry.

This is a provenance/maintenance helper, not runtime application code. It reads
page 46 of the official consolidated DB-HE PDF and emits compact JSON ranges.
The PDF table uses merged cells, so plain text extraction is not sufficient:
vertical vector rules are used to recover every altitude transition.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pdfplumber


PAGE_INDEX = 45
ZONE_RE = re.compile(r"^(?:[ABCDE\u03b1][1-4])$")

# Vector x coordinates of the 25 column boundaries on official page 46.
COLUMN_X = [
    167.52,
    198.48,
    215.82,
    230.46,
    244.68,
    258.96,
    273.30,
    287.64,
    301.86,
    316.02,
    330.42,
    344.70,
    358.98,
    373.32,
    387.48,
    401.82,
    416.16,
    430.44,
    444.72,
    458.88,
    475.02,
    491.10,
    507.18,
    521.34,
    538.20,
]

# Inclusive upper altitude for each base column. None means no upper bound.
COLUMN_MAX_M = [
    50,
    100,
    150,
    200,
    250,
    300,
    350,
    400,
    450,
    500,
    550,
    600,
    650,
    700,
    750,
    800,
    850,
    900,
    950,
    1000,
    1050,
    1250,
    1300,
    None,
]


def nearest_column_index(x: float) -> int | None:
    index = min(range(len(COLUMN_X)), key=lambda item: abs(COLUMN_X[item] - x))
    if abs(COLUMN_X[index] - x) > 2:
        # Background fill rectangles also appear as vertical ``rect_edge``
        # objects. They are intentionally ignored unless they coincide with
        # one of the actual altitude-column rules.
        return None
    return index


def extract(pdf_path: Path) -> dict[str, list[dict[str, object]]]:
    with pdfplumber.open(pdf_path) as document:
        page = document.pages[PAGE_INDEX]
        words = page.extract_words()
        edges = page.edges

    rows: dict[float, list[dict[str, object]]] = {}
    for word in words:
        if ZONE_RE.match(str(word["text"])):
            top = round(float(word["top"]), 1)
            rows.setdefault(top, [])

    result: dict[str, list[dict[str, object]]] = {}
    for top in sorted(rows):
        row_words = [word for word in words if abs(float(word["top"]) - top) < 0.2]
        zones = [str(word["text"]) for word in row_words if ZONE_RE.match(str(word["text"]))]
        province = " ".join(str(word["text"]) for word in row_words if float(word["x0"]) < 167).strip()
        if not province or not zones:
            continue

        candidate_indices = [
            nearest_column_index(float(edge["x0"]))
            for edge in edges
            if edge.get("orientation") == "v"
            and float(edge["top"]) <= top
            and float(edge["bottom"]) >= top + 3
            and 165 <= float(edge["x0"]) <= 540
        ]
        boundary_indices = {index for index in candidate_indices if index is not None}
        boundary_indices.update({0, len(COLUMN_X) - 1})
        ordered = sorted(boundary_indices)
        if len(ordered) != len(zones) + 1:
            raise ValueError(
                f"{province}: {len(zones)} labels but {len(ordered) - 1} recovered spans: {ordered}"
            )

        ranges: list[dict[str, object]] = []
        for zone, end_boundary in zip(zones, ordered[1:]):
            upper = COLUMN_MAX_M[end_boundary - 1]
            ranges.append({"maxAltitudeM": upper, "zone": zone})
        result[province] = ranges

    if len(result) != 52:
        raise ValueError(f"Expected 52 province rows, recovered {len(result)}")
    return result


if __name__ == "__main__":
    source = Path(sys.argv[1] if len(sys.argv) > 1 else "output/DBHE-oficial.pdf")
    print(json.dumps(extract(source), ensure_ascii=False, indent=2))
