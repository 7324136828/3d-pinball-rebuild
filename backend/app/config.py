"""Environment configuration; relative paths are anchored to the repository."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
MAX_SCORE = 9_007_199_254_740_991  # JavaScript's largest exact integer; fits SQLite int64.
MAX_DURATION_MS = 604_800_000  # Seven days, matching the maximum configurable session TTL.


def project_path(value: str) -> Path:
    configured = Path(value).expanduser()
    return configured if configured.is_absolute() else PROJECT_ROOT / configured


@dataclass(frozen=True)
class Settings:
    database_path: Path
    cors_origins: tuple[str, ...]
    session_ttl_seconds: int
    static_dir: Path | None

    @classmethod
    def from_environment(cls) -> "Settings":
        ttl = int(os.environ.get("PINBALL_SESSION_TTL_SECONDS", "86400"))
        if not 60 <= ttl <= 604800:
            raise ValueError("PINBALL_SESSION_TTL_SECONDS must be between 60 and 604800")
        static_dir = os.environ.get("PINBALL_STATIC_DIR", "").strip()
        origins = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
        return cls(
            database_path=project_path(os.environ.get("PINBALL_DB_PATH", "data/pinball.db")),
            cors_origins=tuple(origin.strip() for origin in origins.split(",") if origin.strip()),
            session_ttl_seconds=ttl,
            static_dir=project_path(static_dir) if static_dir else None,
        )