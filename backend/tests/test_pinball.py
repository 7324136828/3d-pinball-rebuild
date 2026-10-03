from __future__ import annotations

import json
import sqlite3
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from contextlib import closing
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

from backend.app.config import PROJECT_ROOT, Settings
from backend.app.main import create_app
from backend.app.services.original_project import OriginalProjectAdapter
from backend.app.store import PinballStore


class PinballStoreTests(unittest.TestCase):
    def test_concurrent_identical_completions_insert_once(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            store = PinballStore(Path(directory) / "pinball.db")
            store.initialize()
            game = store.start_game(["Commander", "Cadet"])
            with ThreadPoolExecutor(max_workers=6) as executor:
                responses = list(executor.map(lambda _: store.complete_game(game["id"], [500, 200], 1000), range(12)))
            self.assertTrue(all(response == responses[0] for response in responses))
            self.assertEqual(store.leaderboard(10, 0)["total"], 2)


class PinballApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.database = Path(self.temp.name) / "pinball.db"
        self.client = TestClient(create_app(self.database))
        self.client.__enter__()
        self.addCleanup(self.temp.cleanup)
        self.addCleanup(self.client.__exit__, None, None, None)

    def start(self, names: list[str]) -> str:
        response = self.client.post("/api/games", json={"player_names": names})
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["id"]

    def complete(self, game_id: str, scores: list[int], duration_ms: int = 1000):
        return self.client.post(f"/api/games/{game_id}/complete", json={"scores": scores, "duration_ms": duration_ms})

    def test_multiplayer_rankings_ties_and_pagination_survive_restart(self) -> None:
        game = self.start(["Cadet", "Pilot", "Commander"])
        response = self.complete(game, [100, 200, 200])
        self.assertEqual(response.status_code, 200)
        self.assertEqual([result["rank"] for result in response.json()["results"]], [3, 1, 1])
        other = self.start(["Admiral"])
        self.assertEqual(self.complete(other, [300]).status_code, 200)
        page = self.client.get("/api/leaderboard?limit=2&offset=1").json()
        self.assertEqual(page["total"], 4)
        self.assertEqual([entry["rank"] for entry in page["entries"]], [2, 2])
        self.assertEqual([entry["player_name"] for entry in page["entries"]], ["Pilot", "Commander"])
        with TestClient(create_app(self.database)) as restarted:
            entries = restarted.get("/api/leaderboard").json()["entries"]
            self.assertEqual([entry["rank"] for entry in entries], [1, 2, 2, 4])

    def test_completion_retries_return_original_results_and_conflicts_never_insert(self) -> None:
        game = self.start(["Cadet"])
        first = self.complete(game, [50]).json()
        self.complete(self.start(["Commander"]), [100])
        self.assertEqual(self.complete(game, [50]).json(), first)
        self.assertEqual(self.complete(game, [51]).status_code, 409)
        self.assertEqual(self.complete(game, [50], duration_ms=1001).status_code, 409)
        self.assertEqual(self.client.get("/api/leaderboard").json()["total"], 2)

    def test_expired_active_games_rejected_completed_retries_accepted(self) -> None:
        active = self.start(["Cadet"])
        completed = self.start(["Pilot"])
        result = self.complete(completed, [10]).json()
        old = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
        with closing(sqlite3.connect(self.database)) as connection, connection:
            connection.execute("UPDATE games SET created_at = ?", (old,))
        self.assertEqual(self.complete(active, [10]).status_code, 410)
        self.assertEqual(self.complete(completed, [10]).json(), result)
        self.assertEqual(self.client.get("/api/leaderboard").json()["total"], 1)

    def test_names_are_bounded_trimmed_plain_text_and_sql_is_parameterized(self) -> None:
        hostile_name = "<script>alert(1)</script>"
        names = [hostile_name, "Robert'); DROP TABLE scores;--"]
        game = self.start(names)
        self.assertEqual(self.complete(game, [10, 20]).status_code, 200)
        stored_names = {entry["player_name"] for entry in self.client.get("/api/leaderboard").json()["entries"]}
        self.assertEqual(stored_names, set(names))
        for names in ([], [""], ["  "], ["a" * 33], ["A\nB"], ["A"] * 5, [123]):
            with self.subTest(names=names):
                self.assertEqual(self.client.post("/api/games", json={"player_names": names}).status_code, 422)
        trimmed = self.client.post("/api/games", json={"player_names": ["  Pilot  "]}).json()
        self.assertEqual(trimmed["player_names"], ["Pilot"])

    def test_score_validation_missing_games_and_player_count_do_not_pollute_rankings(self) -> None:
        game = self.start(["Cadet", "Pilot"])
        for scores, duration in (([0], 0), ([-1, 0], 0), ([True, 0], 0), ([1.0, 0], 0), (["1", 0], 0), ([9007199254740992, 0], 0), ([0, 0], -1), ([0, 0], True), ([0, 0], 604800001)):
            with self.subTest(scores=scores, duration=duration):
                self.assertEqual(self.complete(game, scores, duration).status_code, 422)
        self.assertEqual(self.complete(str(uuid4()), [0]).status_code, 404)
        self.assertEqual(self.complete("not-a-uuid", [0]).status_code, 422)
        self.assertEqual(self.client.get("/api/leaderboard").json(), {"entries": [], "total": 0})
        self.assertEqual(self.complete(game, [0, 1], 0).status_code, 200)

    def test_scores_beyond_native_integer_rollover_remain_exact(self) -> None:
        game = self.start(["Veteran"])
        score = 9_007_199_254_740_991
        response = self.complete(game, [score], 90_000_000)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["results"][0]["score"], score)
        with TestClient(create_app(self.database)) as restarted:
            self.assertEqual(restarted.get("/api/leaderboard").json()["entries"][0]["score"], score)

    def test_original_table_full_geometry_health_and_query_limits(self) -> None:
        runtime_table = PROJECT_ROOT / "assets" / "table.json"
        self.assertEqual(OriginalProjectAdapter().table_path, runtime_table)
        original = json.loads(runtime_table.read_bytes())
        response = self.client.get("/api/table")
        self.assertEqual(response.json(), original)
        self.assertEqual(self.client.get("/api/table", headers={"If-None-Match": response.headers["etag"]}).status_code, 304)
        self.assertEqual(self.client.get("/api/health").json(), {"status": "ok"})
        for query in ("limit=0", "limit=101", "offset=-1", "offset=1000001"):
            self.assertEqual(self.client.get("/api/leaderboard?" + query).status_code, 422)

    def test_production_static_files_spa_routes_and_api_404(self) -> None:
        static = Path(self.temp.name) / "dist"
        assets = static / "assets"
        assets.mkdir(parents=True)
        (static / "index.html").write_text("<html>Pinball</html>", encoding="utf-8")
        (assets / "app.js").write_text("console.log('pinball')", encoding="utf-8")
        settings = Settings(self.database, ("http://localhost:5173",), 86400, static)
        with TestClient(create_app(settings=settings)) as production:
            self.assertEqual(production.get("/").text, "<html>Pinball</html>")
            self.assertEqual(production.get("/leaderboard").status_code, 200)
            self.assertEqual(production.get("/assets/app.js").status_code, 200)
            self.assertIn("immutable", production.get("/assets/app.js").headers["cache-control"])
            self.assertEqual(production.get("/assets/missing.js").status_code, 404)
            self.assertEqual(production.get("/api/missing").status_code, 404)
            self.assertEqual(production.get("/api").status_code, 404)
            self.assertEqual(production.get("/api/health").json(), {"status": "ok"})
            self.assertEqual(production.get("/..%2Fpinball.db").status_code, 404)

    def test_cors_allows_configured_development_origin(self) -> None:
        response = self.client.options("/api/games", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["access-control-allow-origin"], "http://localhost:5173")
        forbidden = self.client.options("/api/games", headers={"Origin": "https://untrusted.example", "Access-Control-Request-Method": "POST"})
        self.assertEqual(forbidden.status_code, 400)


if __name__ == "__main__":
    unittest.main()