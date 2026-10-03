"""Transactional, durable storage for client-reported pinball results.

Scores are produced by the browser engine. Sessions prevent accidental duplicate
submissions; they are not a server-side anti-cheat mechanism.
"""

from __future__ import annotations

import json
import sqlite3
from contextlib import closing
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

from .config import MAX_SCORE


class GameNotFound(Exception):
    pass


class CompletionConflict(Exception):
    pass


class GameExpired(Exception):
    pass


class PlayerCountMismatch(Exception):
    pass


class PinballStore:
    """Use one short-lived connection per operation, safe across workers."""

    def __init__(self, database_path: Path, session_ttl_seconds: int = 86_400):
        self.database_path = Path(database_path)
        self.session_ttl_seconds = session_ttl_seconds

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path, timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys=ON")
        connection.execute("PRAGMA busy_timeout=10000")
        return connection

    def initialize(self) -> None:
        self.database_path.parent.mkdir(parents=True, exist_ok=True)
        with closing(self._connect()) as connection, connection:
            connection.execute("PRAGMA journal_mode=WAL")
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS games (
                    id TEXT PRIMARY KEY,
                    status TEXT NOT NULL CHECK (status IN ('active', 'completed')),
                    player_names TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    completed_at TEXT,
                    completion_payload TEXT,
                    completion_result TEXT
                )
                """
            )
            connection.execute(
                f"""
                CREATE TABLE IF NOT EXISTS scores (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    game_id TEXT NOT NULL REFERENCES games(id),
                    player_index INTEGER NOT NULL CHECK (player_index BETWEEN 0 AND 3),
                    player_name TEXT NOT NULL,
                    score INTEGER NOT NULL CHECK (score BETWEEN 0 AND {MAX_SCORE}),
                    played_at TEXT NOT NULL,
                    UNIQUE (game_id, player_index)
                )
                """
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS scores_ranking ON scores(score DESC, id ASC)"
            )

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    def healthy(self) -> bool:
        with closing(self._connect()) as connection:
            connection.execute("SELECT 1 FROM games LIMIT 1").fetchone()
        return True

    def start_game(self, player_names: list[str]) -> dict:
        game = {
            "id": str(uuid4()),
            "status": "active",
            "player_names": player_names,
            "created_at": self._now().isoformat(),
        }
        with closing(self._connect()) as connection, connection:
            connection.execute(
                "INSERT INTO games (id, status, player_names, created_at) VALUES (?, ?, ?, ?)",
                (game["id"], game["status"], json.dumps(player_names), game["created_at"]),
            )
        return game

    def complete_game(self, game_id: str, scores: list[int], duration_ms: int) -> dict:
        payload = json.dumps({"scores": scores, "duration_ms": duration_ms}, separators=(",", ":"))
        with closing(self._connect()) as connection, connection:
            # Serializes concurrent retries before they inspect or insert results.
            connection.execute("BEGIN IMMEDIATE")
            game = connection.execute("SELECT * FROM games WHERE id = ?", (game_id,)).fetchone()
            if game is None:
                raise GameNotFound
            if game["status"] == "completed":
                if game["completion_payload"] != payload:
                    raise CompletionConflict
                # Return the original rank snapshot even after newer games arrive.
                return json.loads(game["completion_result"])

            now = self._now()
            if now - datetime.fromisoformat(game["created_at"]) > timedelta(seconds=self.session_ttl_seconds):
                raise GameExpired
            names = json.loads(game["player_names"])
            if len(names) != len(scores):
                raise PlayerCountMismatch

            played_at = now.isoformat()
            connection.executemany(
                "INSERT INTO scores (game_id, player_index, player_name, score, played_at) VALUES (?, ?, ?, ?, ?)",
                [(game_id, index, name, score, played_at) for index, (name, score) in enumerate(zip(names, scores))],
            )
            rows = connection.execute(
                """
                WITH ranked AS (
                    SELECT id, game_id, player_index, player_name, score, played_at,
                           RANK() OVER (ORDER BY score DESC) AS rank
                    FROM scores
                )
                SELECT id, rank, player_name, score, played_at
                FROM ranked WHERE game_id = ? ORDER BY player_index
                """,
                (game_id,),
            ).fetchall()
            result = {"game_id": game_id, "results": [dict(row) for row in rows]}
            connection.execute(
                """
                UPDATE games SET status = 'completed', completed_at = ?,
                                 completion_payload = ?, completion_result = ?
                WHERE id = ?
                """,
                (played_at, payload, json.dumps(result), game_id),
            )
        return result

    def leaderboard(self, limit: int, offset: int) -> dict:
        with closing(self._connect()) as connection, connection:
            # A read transaction keeps total and page consistent during writes.
            connection.execute("BEGIN")
            total = connection.execute("SELECT COUNT(*) FROM scores").fetchone()[0]
            rows = connection.execute(
                """
                SELECT id, RANK() OVER (ORDER BY score DESC) AS rank,
                       player_name, score, played_at
                FROM scores ORDER BY score DESC, id ASC LIMIT ? OFFSET ?
                """,
                (limit, offset),
            ).fetchall()
        return {"entries": [dict(row) for row in rows], "total": total}