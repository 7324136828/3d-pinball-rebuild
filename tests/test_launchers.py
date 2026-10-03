"""Launcher boundary and real process-tree cleanup tests (standard library only)."""

from __future__ import annotations

import ctypes
import os
import signal
import socket
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

import run
import setup


def process_stopped(pid: int) -> bool:
    if os.name == "nt":
        from ctypes import wintypes
        kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]
        kernel.OpenProcess.restype = wintypes.HANDLE
        kernel.WaitForSingleObject.argtypes = [wintypes.HANDLE, wintypes.DWORD]
        kernel.WaitForSingleObject.restype = wintypes.DWORD
        kernel.CloseHandle.argtypes = [wintypes.HANDLE]
        handle = kernel.OpenProcess(0x100000, False, pid)  # SYNCHRONIZE
        if not handle:
            return True
        try:
            return kernel.WaitForSingleObject(handle, 3000) == 0
        finally:
            kernel.CloseHandle(handle)
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return True
    # An exited, orphaned descendant may briefly await the system reaper.
    status = Path(f"/proc/{pid}/stat")
    return status.is_file() and status.read_text().split()[2] == "Z"


class ConfigurationTests(unittest.TestCase):
    def test_env_is_literal_and_terminal_values_win(self) -> None:
        with tempfile.TemporaryDirectory(prefix="pinball-launcher-test-") as directory:
            env = Path(directory) / ".env"
            env.write_text(
                "\ufeff# comment\nBACKEND_PORT=9999\n"
                "export PINBALL_DB_PATH='path with spaces/db.sqlite' # note\n"
                'LITERAL="$(echo never-execute)"\n'
                "HASH='inside # quoted'\nTRIM=plain # comment\n",
                encoding="utf-8",
            )
            with patch.dict(os.environ, {"BACKEND_PORT": "8123"}, clear=True):
                run.load_env_file(env)
                self.assertEqual(os.environ["BACKEND_PORT"], "8123")
                self.assertEqual(os.environ["PINBALL_DB_PATH"], "path with spaces/db.sqlite")
                self.assertEqual(os.environ["LITERAL"], "$(echo never-execute)")
                self.assertEqual(os.environ["HASH"], "inside # quoted")
                self.assertEqual(os.environ["TRIM"], "plain")

    def test_malformed_env_fails_without_printing_values(self) -> None:
        with tempfile.TemporaryDirectory(prefix="pinball-launcher-test-") as directory:
            env = Path(directory) / ".env"
            env.write_text("INVALID KEY=sensitive-example", encoding="utf-8")
            with self.assertRaises(run.RunError) as error:
                run.load_env_file(env)
            self.assertIn("line 1", str(error.exception))
            self.assertNotIn("sensitive-example", str(error.exception))

    def test_missing_env_is_optional(self) -> None:
        with tempfile.TemporaryDirectory(prefix="pinball-launcher-test-") as directory:
            run.load_env_file(Path(directory) / ".env")

    def test_ports_reject_zero_negative_and_out_of_range(self) -> None:
        for value in (0, -1, 65536, "garbage"):
            with self.subTest(value=value), self.assertRaises(run.RunError):
                run.parse_port(value, "backend port")
        self.assertEqual(run.parse_port("8000", "backend port"), 8000)

    def test_busy_and_reserved_ports_are_skipped(self) -> None:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as occupied:
            occupied.bind(("127.0.0.1", 0))
            start = occupied.getsockname()[1]
            selected = run.available_port(start, {start + 1})
            self.assertGreater(selected, start + 1)

    def test_bad_bind_host_fails_promptly(self) -> None:
        with self.assertRaises(run.RunError):
            run.available_port(8000, host="256.256.256.256")

    def test_cors_keeps_existing_origins_and_adds_chosen_port(self) -> None:
        environment = {"CORS_ORIGINS": "https://example.com"}
        run.merge_cors_origins(environment, 5432)
        self.assertEqual(
            environment["CORS_ORIGINS"],
            "https://example.com,http://localhost:5432,http://127.0.0.1:5432",
        )
        run.merge_cors_origins(environment, 5432)
        self.assertEqual(environment["CORS_ORIGINS"].count("http://localhost:5432"), 1)

    def test_runtime_always_uses_repository_environment(self) -> None:
        with tempfile.TemporaryDirectory(prefix="pinball-launcher-test-") as directory:
            local_python = Path(directory) / "python"
            local_python.touch()
            with patch.object(run, "LOCAL_PYTHON", local_python):
                with patch.dict(os.environ, {"VIRTUAL_ENV": "unrelated", "CONDA_PREFIX": "unrelated"}):
                    self.assertEqual(run.select_runtime(), local_python)

    def test_setup_never_replaces_existing_env(self) -> None:
        with tempfile.TemporaryDirectory(prefix="pinball-launcher-test-") as directory:
            root = Path(directory)
            (root / ".env.example").write_text("PORT=8000", encoding="utf-8")
            (root / ".env").write_text("PORT=9999", encoding="utf-8")
            with patch.object(setup, "ROOT", root):
                setup.seed_environment_file()
            self.assertEqual((root / ".env").read_text(), "PORT=9999")


class ProcessTreeTests(unittest.TestCase):
    def test_failed_executable_has_a_clear_error(self) -> None:
        with self.assertRaises(run.RunError) as error:
            run.ManagedProcess("Missing service", ["pinball-definitely-no-such-program"], cwd=run.ROOT, env=os.environ.copy())
        self.assertIn("Missing service", str(error.exception))

    def _assert_descendant_cleanup(self, parent_exits: bool) -> None:
        with tempfile.TemporaryDirectory(prefix="pinball-process-test-") as directory:
            pid_file = Path(directory) / "descendant.pid"
            code = (
                "import subprocess,sys,time; from pathlib import Path; "
                "child=subprocess.Popen([sys.executable,'-c','import time; time.sleep(120)']); "
                "Path(sys.argv[1]).write_text(str(child.pid)); "
                f"time.sleep({0.25 if parent_exits else 120})"
            )
            managed = run.ManagedProcess(
                "Process tree fixture", [sys.executable, "-c", code, str(pid_file)],
                cwd=run.ROOT, env=os.environ.copy(),
            )
            try:
                deadline = time.monotonic() + 5
                while not pid_file.is_file() and time.monotonic() < deadline:
                    time.sleep(0.05)
                self.assertTrue(pid_file.is_file(), "fixture did not create its descendant")
                child_pid = int(pid_file.read_text())
                if parent_exits:
                    assert managed.process is not None
                    self.assertEqual(managed.process.wait(timeout=5), 0)
                managed.stop()
                deadline = time.monotonic() + 5
                while not process_stopped(child_pid) and time.monotonic() < deadline:
                    time.sleep(0.05)
                self.assertTrue(process_stopped(child_pid), f"descendant {child_pid} survived cleanup")
                assert managed.process is not None
                self.assertIsNotNone(managed.process.poll())
                managed.stop()  # Cleanup is safe to repeat.
            finally:
                managed.stop()

    def test_cleanup_terminates_live_parent_and_descendant(self) -> None:
        self._assert_descendant_cleanup(parent_exits=False)

    def test_cleanup_terminates_descendant_after_parent_exits(self) -> None:
        self._assert_descendant_cleanup(parent_exits=True)


if __name__ == "__main__":
    unittest.main()
