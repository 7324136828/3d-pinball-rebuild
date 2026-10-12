"""Portable startup, same-origin API proxy, and real listener integration checks."""

from __future__ import annotations

import argparse
import gzip
import io
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import unittest
from contextlib import contextmanager, redirect_stderr
from pathlib import Path
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient

from backend import packaged
from backend.network import discover_lan_ipv4

PROJECT_ROOT = Path(__file__).resolve().parents[1]
ENTRYPOINT = """
import sys
from pathlib import Path
sys.path.insert(0, sys.argv[1])
from backend import packaged
packaged.runtime_directory = lambda: Path(sys.argv[2])
try:
    raise SystemExit(packaged.main(sys.argv[3:]))
except (packaged.RunError, OSError) as error:
    print(f'[run] ERROR: {error}', file=sys.stderr)
    raise SystemExit(1)
"""


def free_ports() -> tuple[int, int]:
    with socket.socket() as first, socket.socket() as second:
        first.bind(("127.0.0.1", 0))
        second.bind(("127.0.0.1", 0))
        return first.getsockname()[1], second.getsockname()[1]


class PackagedTests(unittest.TestCase):
    def setUp(self) -> None:
        directory = tempfile.TemporaryDirectory(prefix="pinball-portable-test-")
        self.addCleanup(directory.cleanup)
        self.workspace = Path(directory.name).resolve()
        (self.workspace / "temp").mkdir()

    def environment(self) -> dict[str, str]:
        environment = os.environ.copy()
        for name in (
            "BACKEND_PORT", "FRONTEND_PORT", "BACKEND_HOST", "PINBALL_DB_PATH",
            "PINBALL_TABLE_PATH", "PINBALL_STATIC_DIR", "PINBALL_SESSION_TTL_SECONDS",
        ):
            environment.pop(name, None)
        environment.update({
            "APPDATA": str(self.workspace / "appdata"),
            "XDG_CONFIG_HOME": str(self.workspace / "appdata"),
            "TEMP": str(self.workspace / "temp"),
            "TMP": str(self.workspace / "temp"),
            "TMPDIR": str(self.workspace / "temp"),
        })
        return environment

    def settings_file(self) -> Path:
        return self.workspace / "appdata" / "3d-pinball-rebuild" / "settings.json"

    def make_mapping(self, root: Path, frontend: int = 3010, backend: int = 3020) -> Path:
        path = root / "port_mapping.json"
        path.write_text(json.dumps({"frontend_port": frontend, "backend_port": backend}), encoding="utf-8")
        return path

    def distribution(self, *, host: str = "127.0.0.1") -> tuple[Path, int, int]:
        root = self.workspace / "Debug"
        root.mkdir()
        frontend, backend = free_ports()
        self.make_mapping(root, frontend, backend)
        (root / "runtime.json").write_text(json.dumps({"host": host}), encoding="utf-8")
        (root / "public").mkdir()
        (root / "public" / "index.html").write_text("<h1>Portable pinball</h1>", encoding="utf-8")
        (root / "assets").mkdir()
        shutil.copyfile(PROJECT_ROOT / "assets" / "table.json", root / "assets" / "table.json")
        return root, frontend, backend

    def command(self, root: Path, *arguments: str) -> list[str]:
        return [sys.executable, "-c", ENTRYPOINT, str(PROJECT_ROOT), str(root), *arguments]

    def completed(self, root: Path, *arguments: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            self.command(root, *arguments), env=self.environment(), cwd=self.workspace,
            capture_output=True, text=True, timeout=15,
            creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
        )

    @contextmanager
    def running(self, root: Path, frontend: int):
        with tempfile.TemporaryFile(mode="w+b") as log:
            process = subprocess.Popen(
                self.command(root), env=self.environment(), cwd=self.workspace,
                stdout=log, stderr=subprocess.STDOUT,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
            )
            try:
                with httpx.Client(trust_env=False, timeout=1) as client:
                    deadline = time.monotonic() + 15
                    while time.monotonic() < deadline:
                        if process.poll() is not None:
                            log.seek(0)
                            self.fail(log.read().decode("utf-8", errors="replace"))
                        try:
                            if client.get(f"http://127.0.0.1:{frontend}/api/health").status_code == 200:
                                break
                        except httpx.RequestError:
                            pass
                        time.sleep(0.05)
                    else:
                        log.seek(0)
                        self.fail("Portable frontend/API did not become ready: " + log.read().decode("utf-8", errors="replace"))
                    yield client
            finally:
                if process.poll() is None:
                    process.terminate()
                    try:
                        process.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait(timeout=5)

    def test_environment_is_literal_and_database_is_relative_to_distribution(self) -> None:
        root = self.workspace
        (root / ".env").write_text(
            "\ufeff# comment\nBACKEND_PORT=9000\n"
            "export PINBALL_DB_PATH='selected data/pinball.db' # note\n"
            'LITERAL="$(echo never-execute)"\nHASH="inside # quoted"\n', encoding="utf-8",
        )
        with patch.dict(os.environ, {"BACKEND_PORT": "3020"}, clear=True):
            packaged.load_environment(root)
            self.assertEqual(os.environ["BACKEND_PORT"], "3020")
            self.assertEqual(os.environ["PINBALL_DB_PATH"], str((root / "selected data" / "pinball.db").resolve()))
            self.assertEqual(os.environ["LITERAL"], "$(echo never-execute)")
            self.assertEqual(os.environ["HASH"], "inside # quoted")
        (root / ".env").write_text("INVALID KEY=private-value", encoding="utf-8")
        with self.assertRaises(packaged.RunError) as error:
            packaged.load_environment(root)
        self.assertIn("line 1", str(error.exception))
        self.assertNotIn("private-value", str(error.exception))

    def test_blank_database_override_uses_settings(self) -> None:
        for value in ("", " \t "):
            with self.subTest(value=value), patch.dict(os.environ, {"PINBALL_DB_PATH": value}, clear=True):
                packaged.load_environment(self.workspace)
                self.assertNotIn("PINBALL_DB_PATH", os.environ)

    def test_runtime_profile_and_frozen_location_survive_directory_rename(self) -> None:
        root = self.workspace / "Debug"
        root.mkdir()
        self.assertEqual(packaged.runtime_host(root), "0.0.0.0")
        (root / "runtime.json").write_text('{"host": "127.0.0.1"}', encoding="utf-8")
        root = root.rename(self.workspace / "Renamed portable application")
        with patch.object(packaged.sys, "frozen", True, create=True), patch.object(packaged.sys, "executable", str(root / "server.exe")):
            self.assertEqual(packaged.runtime_directory(), root)
            self.assertEqual(packaged.runtime_host(packaged.runtime_directory()), "127.0.0.1")
        for content in ("{", "[]", "{}", '{"host": "localhost"}', '{"host": null}'):
            with self.subTest(content=content):
                (root / "runtime.json").write_text(content, encoding="utf-8")
                with self.assertRaisesRegex(packaged.RunError, "runtime profile"):
                    packaged.runtime_host(root)

    def test_ports_use_cli_then_environment_then_user_settings(self) -> None:
        mapping = self.make_mapping(self.workspace)
        settings = self.settings_file()
        settings.parent.mkdir(parents=True)
        original = json.dumps({"frontend_port": 4100, "backend_port": 4200, "custom": "preserved"})
        settings.write_text(original, encoding="utf-8")
        for variables, arguments, expected in (
            ({}, [], (4100, 4200)),
            ({"FRONTEND_PORT": "5100", "BACKEND_PORT": "5200"}, [], (5100, 5200)),
            ({"FRONTEND_PORT": "5100"}, ["--frontend", "6100", "--backend-port", "6200"], (6100, 6200)),
        ):
            with self.subTest(expected=expected), patch.dict(os.environ, {**self.environment(), **variables}, clear=True):
                options = packaged.parse_args(arguments, defaults_path=mapping)
                self.assertEqual((options.frontend_port, options.backend_port), expected)
                self.assertEqual(settings.read_text(encoding="utf-8"), original)

    def test_invalid_ports_and_effective_duplicate_ports_fail(self) -> None:
        for value in (0, -1, 65536, "bad", True, 3010.5):
            with self.subTest(value=value), self.assertRaises(argparse.ArgumentTypeError):
                packaged.port_number(value)
        with patch.dict(os.environ, self.environment(), clear=True), redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit):
                packaged.parse_args(["--frontend", "3020"])
            with patch.dict(os.environ, {"FRONTEND_PORT": "3020"}), self.assertRaises(SystemExit):
                packaged.parse_args([])

    def test_host_precedence_and_local_listener_urls(self) -> None:
        with patch.dict(os.environ, self.environment(), clear=True):
            self.assertEqual(packaged.parse_args([], default_host="127.0.0.1").host, "127.0.0.1")
            with patch.dict(os.environ, {"BACKEND_HOST": "0.0.0.0"}):
                self.assertEqual(packaged.parse_args([], default_host="127.0.0.1").host, "0.0.0.0")
                self.assertEqual(packaged.parse_args(["--host", "127.0.0.1"]).host, "127.0.0.1")
        with packaged.bind_listener("0.0.0.0", 0, "backend") as listener:
            self.assertEqual(packaged.listener_url(listener), f"http://127.0.0.1:{listener.getsockname()[1]}")

    def test_initialize_settings_opens_no_ports_and_needs_no_frontend(self) -> None:
        with socket.socket() as first, socket.socket() as second:
            first.bind(("127.0.0.1", 0))
            second.bind(("127.0.0.1", 0))
            first.listen()
            second.listen()
            frontend, backend = first.getsockname()[1], second.getsockname()[1]
            self.make_mapping(self.workspace, frontend, backend)
            completed = self.completed(self.workspace, "--initialize-settings")
            self.assertEqual(completed.returncode, 0, completed.stderr)
            values = json.loads(self.settings_file().read_text(encoding="utf-8"))
            self.assertEqual((values["frontend_port"], values["backend_port"]), (frontend, backend))
            self.assertFalse((self.workspace / "public").exists())
            self.assertFalse((self.workspace / "temp" / "3d-pinball-rebuild").exists())

    def test_help_does_not_create_settings(self) -> None:
        completed = self.completed(self.workspace, "--help")
        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertIn("usage:", completed.stdout)
        self.assertFalse(self.settings_file().exists())

    def test_missing_and_invalid_mapping_fail_before_frontend_validation(self) -> None:
        for content in (None, "{", "[]", '{"frontend_port": 3010}'):
            with self.subTest(content=content):
                mapping = self.workspace / "port_mapping.json"
                mapping.unlink(missing_ok=True)
                if content is not None:
                    mapping.write_text(content, encoding="utf-8")
                completed = self.completed(self.workspace)
                self.assertEqual(completed.returncode, 1)
                self.assertIn(str(mapping), completed.stderr)
                self.assertNotIn("Frontend is missing", completed.stderr)
                self.assertNotIn("Traceback", completed.stderr)

    def test_busy_frontend_fails_without_changing_ports_and_releases_backend(self) -> None:
        root, _, backend = self.distribution()
        with socket.socket() as busy:
            busy.bind(("127.0.0.1", 0))
            busy.listen()
            frontend = busy.getsockname()[1]
            self.make_mapping(root, frontend, backend)
            completed = self.completed(root)
            self.assertEqual(completed.returncode, 1)
            self.assertIn("Cannot bind frontend", completed.stderr)
            with socket.socket() as released:
                released.bind(("127.0.0.1", backend))

    def test_backend_startup_failure_stops_both_services(self) -> None:
        root, frontend, backend = self.distribution()
        (root / "blocked").write_text("This file cannot contain a database.", encoding="utf-8")
        (root / ".env").write_text("PINBALL_DB_PATH=blocked/pinball.db\n", encoding="utf-8")
        completed = self.completed(root)
        self.assertEqual(completed.returncode, 1)
        self.assertIn("Backend failed", completed.stderr)
        for port in (frontend, backend):
            with socket.socket() as released:
                released.bind(("127.0.0.1", port))

    def test_invalid_session_ttl_fails_clearly_and_releases_both_ports(self) -> None:
        root, frontend, backend = self.distribution()
        for value in ("invalid", "59", "604801"):
            with self.subTest(value=value):
                (root / ".env").write_text(f"PINBALL_SESSION_TTL_SECONDS={value}\n", encoding="utf-8")
                completed = self.completed(root)
                self.assertEqual(completed.returncode, 1)
                self.assertIn("PINBALL_SESSION_TTL_SECONDS", completed.stderr)
                self.assertNotIn("Traceback", completed.stderr)
                for port in (frontend, backend):
                    with socket.socket() as released:
                        released.bind(("127.0.0.1", port))

    def test_settings_ports_proxy_geometry_and_default_storage(self) -> None:
        root, frontend, backend = self.distribution()
        # Populate one configured port; the other must be read from the mapping.
        settings = self.settings_file()
        settings.parent.mkdir(parents=True)
        settings.write_text(json.dumps({"frontend_port": frontend, "custom": "preserved"}), encoding="utf-8")
        with self.running(root, frontend) as client:
            frontend_url = f"http://127.0.0.1:{frontend}"
            self.assertIn("Portable pinball", client.get(frontend_url).text)
            game = client.post(frontend_url + "/api/games", json={"player_names": ["LAN Pilot"]}).json()
            completion = client.post(frontend_url + f"/api/games/{game['id']}/complete", json={"scores": [1234], "duration_ms": 1000})
            self.assertEqual(completion.status_code, 200, completion.text)
            self.assertEqual(client.get(f"http://127.0.0.1:{backend}/api/leaderboard?limit=1").json()["entries"][0]["score"], 1234)
            response = client.get(frontend_url + "/api/table")
            self.assertEqual(response.json(), json.loads((root / "assets" / "table.json").read_bytes()))
            self.assertEqual(client.get(frontend_url + "/api/table", headers={"If-None-Match": response.headers["etag"]}).status_code, 304)
            self.assertEqual(client.get(frontend_url + "/%2e%2e/runtime.json").status_code, 404)
            self.assertEqual(client.get(frontend_url + "/api/missing").status_code, 404)
        self.assertTrue((self.workspace / "temp" / "3d-pinball-rebuild" / "pinball.db").is_file())
        values = json.loads(settings.read_text(encoding="utf-8"))
        self.assertEqual((values["frontend_port"], values["backend_port"], values["custom"]), (frontend, backend, "preserved"))

    def test_custom_storage_survives_portable_folder_rename(self) -> None:
        root, frontend, _backend = self.distribution()
        settings = self.settings_file()
        settings.parent.mkdir(parents=True)
        storage = self.workspace / "selected data" / "nested"
        settings.write_text(json.dumps({"data_directory": str(storage), "custom": "kept"}), encoding="utf-8")
        with self.running(root, frontend) as client:
            url = f"http://127.0.0.1:{frontend}"
            game = client.post(url + "/api/games", json={"player_names": ["Pilot"]}).json()
            self.assertEqual(client.post(url + f"/api/games/{game['id']}/complete", json={"scores": [42], "duration_ms": 0}).status_code, 200)
        preserved = settings.read_text(encoding="utf-8")
        root = root.rename(self.workspace / "Renamed Release")
        with self.running(root, frontend) as client:
            self.assertEqual(client.get(f"http://127.0.0.1:{frontend}/api/leaderboard").json()["entries"][0]["score"], 42)
        self.assertTrue((storage / "pinball.db").is_file())
        self.assertEqual(settings.read_text(encoding="utf-8"), preserved)

    def test_release_profile_serves_lan_and_debug_refuses_lan(self) -> None:
        addresses = discover_lan_ipv4()
        if not addresses:
            self.skipTest("No local LAN IPv4 address is available")
        root, frontend, backend = self.distribution(host="0.0.0.0")
        with self.running(root, frontend) as client:
            for address in addresses:
                with self.subTest(address=address):
                    self.assertIn("Portable pinball", client.get(f"http://{address}:{frontend}").text)
                    self.assertEqual(client.get(f"http://{address}:{frontend}/api/health").json(), {"status": "ok"})
                    self.assertEqual(client.get(f"http://{address}:{backend}/docs").status_code, 200)
        (root / "runtime.json").write_text('{"host": "127.0.0.1"}', encoding="utf-8")
        root = root.rename(self.workspace / "Renamed local build")
        with self.running(root, frontend) as client:
            for address in addresses:
                for port in (frontend, backend):
                    with self.subTest(address=address, port=port), self.assertRaises((httpx.ConnectError, httpx.ConnectTimeout)):
                        client.get(f"http://{address}:{port}/api/health")


class ProxyTests(unittest.TestCase):
    def test_proxy_preserves_query_body_cookies_and_removes_hop_headers(self) -> None:
        with tempfile.TemporaryDirectory(prefix="pinball-proxy-test-") as directory:
            public = Path(directory)
            (public / "index.html").write_text("Pinball", encoding="utf-8")
            app = packaged.create_frontend_app(public, "http://127.0.0.1:3020")
            received = []

            def backend(request: httpx.Request) -> httpx.Response:
                received.append(request)
                return httpx.Response(201, content=gzip.compress(b'{"created": true}'), headers=[
                    ("content-encoding", "gzip"), ("content-type", "application/json"),
                    ("connection", "x-internal"), ("connection", "x-second"),
                    ("x-internal", "remove"), ("x-second", "remove too"),
                    ("set-cookie", "first=1"), ("set-cookie", "second=2"),
                ])

            with TestClient(app) as client:
                previous = app.state.backend_client
                transport = httpx.MockTransport(backend)
                app.state.backend_client = httpx.AsyncClient(base_url="http://127.0.0.1:3020", transport=transport, trust_env=False)
                try:
                    response = client.post("/api/games%3Fembedded?limit=1&name=a%20b", content=b'{"player_names":["Pilot"]}', headers=[
                        ("connection", "x-internal"), ("connection", "x-second"),
                        ("x-internal", "secret"), ("x-second", "also secret"),
                        ("content-type", "application/json"),
                    ])
                    self.assertEqual(response.status_code, 201)
                    self.assertEqual(response.json(), {"created": True})
                    self.assertEqual(response.headers.get_list("set-cookie"), ["first=1", "second=2"])
                    for field in ("connection", "content-encoding", "x-internal", "x-second"):
                        self.assertNotIn(field, response.headers)
                    self.assertEqual(int(response.headers["content-length"]), len(response.content))
                    request = received[0]
                    self.assertEqual(request.url.raw_path, b"/api/games%3Fembedded?limit=1&name=a%20b")
                    self.assertEqual(request.url.query, b"limit=1&name=a%20b")
                    self.assertEqual(request.content, b'{"player_names":["Pilot"]}')
                    self.assertEqual(request.headers["host"], "127.0.0.1:3020")
                    # HTTPX may add its own Connection: keep-alive for the new
                    # hop; private tokens from the incoming field must be gone.
                    self.assertNotIn("x-internal", request.headers.get("connection", ""))
                    for field in ("x-internal", "x-second"):
                        self.assertNotIn(field, request.headers)
                finally:
                    client.portal.call(app.state.backend_client.aclose)
                    app.state.backend_client = previous

    def test_unavailable_backend_returns_502(self) -> None:
        with tempfile.TemporaryDirectory(prefix="pinball-proxy-test-") as directory:
            app = packaged.create_frontend_app(Path(directory), "http://127.0.0.1:3020")
            with TestClient(app) as client, patch.object(app.state.backend_client, "request", side_effect=httpx.ConnectError("unavailable")):
                response = client.get("/api/health")
                self.assertEqual(response.status_code, 502)
                self.assertEqual(response.json(), {"detail": "Backend is unavailable"})


if __name__ == "__main__":
    unittest.main()
