#!/usr/bin/env python3
"""Capture the real application using temporary services and an isolated demo database."""

from __future__ import annotations

import argparse
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from run import ManagedProcess, RunError, available_port, select_runtime  # noqa: E402


def wait_for_api(base_url: str, service: ManagedProcess) -> None:
    deadline = time.monotonic() + 45
    while time.monotonic() < deadline:
        assert service.process is not None
        if service.process.poll() is not None:
            raise RunError(f"Screenshot stack exited with code {service.process.returncode}")
        try:
            with urlopen(f"{base_url}/api/health", timeout=2) as response:
                if response.status == 200 and json.load(response).get("status") == "ok":
                    return
        except (OSError, URLError):
            time.sleep(0.2)
    raise RunError("Screenshot stack did not become ready within 45 seconds")


def confirm_closed(ports: tuple[int, int]) -> None:
    for port in ports:
        deadline = time.monotonic() + 5
        while True:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as connection:
                connection.settimeout(0.2)
                closed = connection.connect_ex(("127.0.0.1", port)) != 0
            if closed:
                break
            if time.monotonic() >= deadline:
                raise RunError(f"Screenshot service still listens on port {port}")
            time.sleep(0.1)
    print(f"[screenshots] Services stopped; ports {ports[0]} and {ports[1]} are closed.", flush=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--browser", choices=("auto", "msedge", "chromium"), default="auto",
        help="auto tries installed Edge on Windows, then Playwright Chromium",
    )
    parser.add_argument(
        "--rankings-only", action="store_true", help="Refresh only the rankings screenshot",
    )
    args = parser.parse_args()
    node = shutil.which("node")
    if not node or not (ROOT / "e2e" / "node_modules" / "@playwright" / "test").is_dir():
        raise RunError("Run setup first to install Node and the Playwright test dependencies")
    runtime = select_runtime()
    backend_port = available_port(8030)
    frontend_port = available_port(5190, {backend_port})
    base_url = f"http://127.0.0.1:{frontend_port}"
    with tempfile.TemporaryDirectory(prefix="modern-pinball-screenshots-") as directory:
        environment = os.environ.copy()
        environment.update({
            "PINBALL_DB_PATH": str(Path(directory) / "demo-rankings.sqlite"),
            "PINBALL_STATIC_DIR": "",
            "VITE_ENABLE_TEST_HOOKS": "0",
            "PINBALL_CAPTURE_ISOLATED": "1",
            "PINBALL_CAPTURE_URL": base_url,
            "PINBALL_CAPTURE_BROWSER": args.browser,
            "PINBALL_CAPTURE_RANKINGS_ONLY": "1" if args.rankings_only else "0",
        })
        print(f"[screenshots] Starting the real app at {base_url} with a temporary SQLite database.", flush=True)
        stack = ManagedProcess(
            "Screenshot stack",
            [str(runtime), str(ROOT / "run.py"), "--no-reload", "--host", "127.0.0.1",
             "--backend-port", str(backend_port), "--frontend-port", str(frontend_port)],
            cwd=ROOT, env=environment,
        )
        capture: ManagedProcess | None = None
        try:
            wait_for_api(base_url, stack)
            capture = ManagedProcess(
                "Screenshot browser",
                [node, str(ROOT / "e2e" / "capture-screenshots.mjs")],
                cwd=ROOT / "e2e", env=environment,
            )
            assert capture.process is not None
            try:
                status = capture.process.wait(timeout=180)
            except subprocess.TimeoutExpired as error:
                raise RunError("Screenshot browser exceeded its 180-second timeout") from error
            if status:
                raise RunError(f"Screenshot capture failed with exit code {status}")
        finally:
            if capture:
                capture.stop()
            stack.stop()
            confirm_closed((backend_port, frontend_port))
    print("[screenshots] Temporary demo database removed; images are in screenshot/.", flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RunError as error:
        print(f"[screenshots] ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
    except KeyboardInterrupt:
        print("\n[screenshots] Interrupted; services were stopped.", file=sys.stderr)
        raise SystemExit(130)
