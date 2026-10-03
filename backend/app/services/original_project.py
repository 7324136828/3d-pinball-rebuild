"""Expose the original JavaScript engine's authored table without rewriting it.

Runtime geometry is the standalone repository-root assets copy of the original table.
Its complete native geometry is passed to the browser for the original engine.
No upload, conversion job or generated scratch file is required.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

from ..config import PROJECT_ROOT


class OriginalProjectAdapter:
    def __init__(self, table_path: Path | None = None):
        self.table_path = table_path or PROJECT_ROOT / "assets" / "table.json"
        self.table_bytes = b""
        self.etag = ""

    def initialize(self) -> None:
        data = self.table_path.read_bytes()
        table = json.loads(data)
        if not isinstance(table, dict) or not all(key in table for key in ("table", "bounds", "ball", "flippers")):
            raise ValueError("Original project table geometry is missing required fields")
        self.table_bytes = data
        self.etag = '"' + hashlib.sha256(data).hexdigest() + '"'