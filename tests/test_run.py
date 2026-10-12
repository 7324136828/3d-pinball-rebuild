"""Source launcher settings, service commands and LAN integration without subprocesses."""

from __future__ import annotations

import io
import json
import os
import signal
import socket
import tempfile
import unittest
from contextlib import ExitStack, redirect_stdout
from pathlib import Path
from unittest.mock import Mock, call, patch

import run
from backend import settings


class SourceRunTests(unittest.TestCase):
    def setUp(self) -> None:
        temporary = tempfile.TemporaryDirectory(prefix="pinball-source-run-test-")
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.frontend = self.root / "frontend"
        (self.frontend / "node_modules").mkdir(parents=True)
        (self.root / "port_mapping.json").write_text('{"frontend": 3010, "backend": 3020}', encoding="utf-8")
        self.config = self.root / "appdata" / settings.APP_NAME / "settings.json"
        self.runtime = self.root / ".venv" / "python.exe"
        self.npm = "npm-test-command"
        self.launches: list[dict] = []
        self.output = io.StringIO()
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.stack.enter_context(patch.dict(os.environ, {}, clear=True))
        for attribute, value in (("ROOT", self.root), ("FRONTEND", self.frontend)):
            self.stack.enter_context(patch.object(run, attribute, value))
        self.stack.enter_context(patch.object(settings, "settings_path", return_value=self.config))
        self.stack.enter_context(patch.object(run, "settings_path", return_value=self.config))
        self.stack.enter_context(patch.object(settings, "default_data_directory", return_value=self.root / "storage"))
        self.runtime_selection = self.stack.enter_context(patch.object(run, "select_runtime", return_value=self.runtime))
        self.npm_selection = self.stack.enter_context(patch.object(run.shutil, "which", return_value=self.npm))
        self.host_resolution = self.stack.enter_context(patch.object(run.socket, "getaddrinfo", side_effect=self.resolve_host))
        self.port_selection = self.stack.enter_context(patch.object(run, "available_port", side_effect=lambda start, reserved=None, host=None: start))
        self.stack.enter_context(patch.object(run, "lan_urls_for_host", side_effect=self.lan_urls))
        self.managed_process = self.stack.enter_context(patch.object(run, "ManagedProcess", side_effect=self.launch))
        self.stack.enter_context(patch.object(run.signal, "getsignal", return_value=signal.SIG_DFL))
        self.stack.enter_context(patch.object(run.signal, "signal", return_value=signal.SIG_DFL))
        self.sleep = self.stack.enter_context(patch.object(run.time, "sleep", side_effect=KeyboardInterrupt))

    @staticmethod
    def resolve_host(host: str, _port: int, **_kwargs) -> list[tuple]:
        resolved = {"localhost": "127.0.0.1", "pinball.local": "192.168.1.10"}.get(host, host)
        family = socket.AF_INET6 if ":" in resolved else socket.AF_INET
        address = (resolved, 0, 0, 0) if family == socket.AF_INET6 else (resolved, 0)
        return [(family, socket.SOCK_STREAM, socket.IPPROTO_TCP, "", address)]

    @staticmethod
    def lan_urls(host: str, port: int) -> list[str]:
        return [f"http://192.168.1.10:{port}"] if host == "0.0.0.0" else []

    def launch(self, label: str, command: list[str], *, cwd: Path, env: dict[str, str]):
        service = Mock(label=label)
        service.label = label
        service.process.poll.return_value = None
        service.process.wait.return_value = 0
        self.launches.append({"label": label, "command": list(command), "cwd": cwd, "env": dict(env), "service": service})
        return service

    def write_settings(self) -> str:
        self.config.parent.mkdir(parents=True, exist_ok=True)
        content = '{"frontend_port": 4310, "backend_port": 4320, "custom": "preserved"}'
        self.config.write_text(content, encoding="utf-8")
        return content

    def run_until_interrupt(self, arguments: list[str] | None = None) -> None:
        with redirect_stdout(self.output):
            self.assertEqual(run.main(arguments or []), 0)

    def command_port(self, label: str) -> int:
        command = next(launch["command"] for launch in self.launches if launch["label"] == label)
        return int(command[command.index("--port") + 1])

    def test_initialize_settings_returns_before_runtime_dependencies_environment_or_listeners(self) -> None:
        # Initialization is safe even if this distribution has no usable runtime.
        (self.root / ".env").write_text("MALFORMED PRIVATE VALUE", encoding="utf-8")
        self.run_until_interrupt(["--initialize-settings"])
        self.assertEqual(json.loads(self.config.read_text()), {"frontend_port": 3010, "backend_port": 3020})
        self.runtime_selection.assert_not_called()
        self.npm_selection.assert_not_called()
        self.host_resolution.assert_not_called()
        self.port_selection.assert_not_called()
        self.managed_process.assert_not_called()

    def test_new_install_uses_mapping_ports_and_binds_both_services_for_lan(self) -> None:
        self.run_until_interrupt()
        self.assertEqual(self.command_port("Frontend"), 3010)
        self.assertEqual(self.command_port("Backend"), 3020)
        for launch in self.launches:
            command = launch["command"]
            self.assertEqual(command[command.index("--host") + 1], "0.0.0.0")
            launch["service"].stop.assert_called_once()
        frontend = self.launches[1]
        self.assertEqual(frontend["cwd"], self.frontend)
        self.assertEqual(frontend["env"]["BACKEND_URL"], "http://127.0.0.1:3020")
        self.assertIn("--strictPort", frontend["command"])
        self.assertIn("--reload", self.launches[0]["command"])
        self.assertIn("LAN: http://192.168.1.10:3010", self.output.getvalue())

    def test_port_precedence_cli_environment_env_file_then_saved_settings(self) -> None:
        original = self.write_settings()
        for env_text, variables, arguments, expected in (
            ("", {}, [], (4310, 4320)),
            ("FRONTEND_PORT=4510\nBACKEND_PORT=4520\n", {}, [], (4510, 4520)),
            ("FRONTEND_PORT=4510\nBACKEND_PORT=4520\n", {"FRONTEND_PORT": "5310", "BACKEND_PORT": "5320"}, [], (5310, 5320)),
            ("FRONTEND_PORT=4510\nBACKEND_PORT=4520\n", {"FRONTEND_PORT": "5310", "BACKEND_PORT": "5320"}, ["--frontend-port", "6310", "--backend", "6320"], (6310, 6320)),
        ):
            with self.subTest(expected=expected), patch.dict(os.environ, variables, clear=True):
                self.launches.clear()
                (self.root / ".env").write_text(env_text, encoding="utf-8")
                self.run_until_interrupt(arguments)
                self.assertEqual((self.command_port("Frontend"), self.command_port("Backend")), expected)
                self.assertEqual(self.config.read_text(), original)

    def test_busy_port_fallback_updates_proxy_cors_urls_and_reserves_backend_port(self) -> None:
        self.write_settings()
        os.environ["CORS_ORIGINS"] = "https://pinball.example"
        self.port_selection.side_effect = [4321, 4311]
        self.run_until_interrupt()
        self.assertEqual(self.port_selection.call_args_list, [call(4320, host="0.0.0.0"), call(4310, {4321}, host="0.0.0.0")])
        self.assertEqual(self.command_port("Backend"), 4321)
        self.assertEqual(self.command_port("Frontend"), 4311)
        self.assertEqual(self.launches[1]["env"]["BACKEND_URL"], "http://127.0.0.1:4321")
        self.assertEqual(
            set(self.launches[0]["env"]["CORS_ORIGINS"].split(",")),
            {"https://pinball.example", "http://localhost:4311", "http://127.0.0.1:4311", "http://192.168.1.10:4311"},
        )
        self.assertIn("LAN API: http://192.168.1.10:4321/docs", self.output.getvalue())
        self.assertEqual(json.loads(self.config.read_text())["backend_port"], 4320)

    def test_cli_host_overrides_environment_and_proxy_uses_resolved_adapter(self) -> None:
        self.write_settings()
        os.environ["BACKEND_HOST"] = "127.0.0.1"
        self.run_until_interrupt(["--host", "pinball.local", "--no-reload"])
        for launch in self.launches:
            command = launch["command"]
            self.assertEqual(command[command.index("--host") + 1], "192.168.1.10")
        self.assertEqual(self.launches[1]["env"]["BACKEND_URL"], "http://192.168.1.10:4320")
        self.assertNotIn("--reload", self.launches[0]["command"])
        self.assertIn("http://192.168.1.10:4310", self.launches[0]["env"]["CORS_ORIGINS"])

    def test_ipv6_wildcard_uses_bracketed_loopback_proxy_url(self) -> None:
        self.write_settings()
        self.run_until_interrupt(["--host", "::"])
        self.assertEqual(self.launches[1]["env"]["BACKEND_URL"], "http://[::1]:4320")
        self.assertIn("http://[::1]:4310", self.output.getvalue())
        self.assertIn("http://[::1]:4310", self.launches[0]["env"]["CORS_ORIGINS"])

    def test_production_builds_once_then_serves_single_backend_with_lan_urls(self) -> None:
        self.write_settings()
        self.run_until_interrupt(["--production"])
        self.assertEqual([launch["label"] for launch in self.launches], ["Frontend build", "Backend"])
        build, backend = self.launches
        self.assertEqual(build["command"], [self.npm, "run", "build"])
        self.assertEqual(build["env"]["BACKEND_URL"], "http://127.0.0.1:4320")
        self.assertEqual(backend["env"]["PINBALL_STATIC_DIR"], str(self.frontend / "dist"))
        self.assertNotIn("--reload", backend["command"])
        self.port_selection.assert_called_once_with(4320, host="0.0.0.0")
        build["service"].stop.assert_called_once()
        backend["service"].stop.assert_called_once()
        self.assertIn("LAN: http://192.168.1.10:4320", self.output.getvalue())

    def test_failed_production_build_stops_before_backend_start(self) -> None:
        self.write_settings()
        original_launch = self.launch

        def failed_build(*args, **kwargs):
            service = original_launch(*args, **kwargs)
            service.process.wait.return_value = 7
            return service

        self.managed_process.side_effect = failed_build
        with redirect_stdout(self.output), self.assertRaisesRegex(run.RunError, "Frontend build failed with exit code 7"):
            run.main(["--production"])
        self.assertEqual([launch["label"] for launch in self.launches], ["Frontend build"])
        self.launches[0]["service"].stop.assert_called_once()

    def test_invalid_saved_ports_and_equal_effective_overrides_fail_before_services(self) -> None:
        self.write_settings()
        with self.assertRaisesRegex(run.RunError, "must be different"):
            run.main(["--backend", "4310"])
        self.config.write_text('{"frontend_port": true, "backend_port": 4320}', encoding="utf-8")
        with self.assertRaisesRegex(run.RunError, "frontend_port must be an integer"):
            run.main(["--frontend", "6310"])
        self.managed_process.assert_not_called()


if __name__ == "__main__":
    unittest.main()
