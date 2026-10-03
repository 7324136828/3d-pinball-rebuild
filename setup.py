#!/usr/bin/env python3
"""Provision this repository's isolated Python and Node environments."""

from __future__ import annotations

import argparse
import os
import re
import shutil
import subprocess
import sys
import venv
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FRONTEND = ROOT / "frontend"
E2E = ROOT / "e2e"
LOCAL_VENV = ROOT / ".venv"
LOCAL_PYTHON = LOCAL_VENV / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
BACKEND_REQUIREMENTS = ROOT / "backend" / "requirements.txt"


class SetupError(RuntimeError):
    """A prerequisite or installation failed."""


def run(command: list[str | Path], *, cwd: Path = ROOT) -> None:
    rendered = [str(part) for part in command]
    print(f"[setup] $ {' '.join(rendered)}", flush=True)
    try:
        result = subprocess.run(rendered, cwd=cwd, check=False)
    except OSError as error:
        raise SetupError(f"Could not start {rendered[0]}: {error}") from error
    if result.returncode:
        raise SetupError(f"Command failed with exit code {result.returncode}")


def check_prerequisites() -> str:
    if sys.version_info < (3, 10):
        raise SetupError("Python 3.10 or newer is required")
    node = shutil.which("node")
    npm = shutil.which("npm.cmd" if os.name == "nt" else "npm")
    if not node or not npm:
        raise SetupError("Install Node.js 20.19+ (Node.js 24 LTS recommended) and npm 10+")
    for label, executable, minimum in (("Node.js", node, (20, 19, 0)), ("npm", npm, (10, 0, 0))):
        try:
            result = subprocess.run(
                [executable, "--version"], capture_output=True, text=True, check=False
            )
        except OSError as error:
            raise SetupError(f"Could not run {label}: {error}") from error
        match = re.fullmatch(r"v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?", result.stdout.strip())
        if result.returncode or not match:
            raise SetupError(f"Unable to determine the installed {label} version")
        version = tuple(int(part) for part in match.groups())
        if version < minimum:
            required = ".".join(str(part) for part in minimum)
            raise SetupError(f"{label} {required} or newer is required")
        print(f"[setup] {label} {'.'.join(str(part) for part in version)}")
    if not BACKEND_REQUIREMENTS.is_file():
        raise SetupError(f"Requirements file not found: {BACKEND_REQUIREMENTS}")
    if not (FRONTEND / "package-lock.json").is_file():
        raise SetupError("frontend/package-lock.json is required for a reproducible npm ci install")
    return npm


def select_python() -> Path:
    # An unrelated activated venv/Conda environment must never receive our dependencies.
    if not LOCAL_PYTHON.is_file():
        print(f"[setup] Creating repository virtual environment: {LOCAL_VENV}", flush=True)
        try:
            venv.EnvBuilder(with_pip=True).create(LOCAL_VENV)
        except (OSError, subprocess.SubprocessError) as error:
            raise SetupError(
                f"Cannot create .venv: {error}. On Debian/Ubuntu install python3-venv first."
            ) from error
    else:
        print(f"[setup] Reusing repository virtual environment: {LOCAL_VENV}", flush=True)
    if not LOCAL_PYTHON.is_file():
        raise SetupError(f"Virtual environment has no interpreter at {LOCAL_PYTHON}")
    run([LOCAL_PYTHON, "-c", "import sys; assert sys.version_info >= (3, 10), 'Python 3.10+ required'"])
    return LOCAL_PYTHON


def seed_environment_file() -> None:
    example = ROOT / ".env.example"
    target = ROOT / ".env"
    if example.is_file() and not target.exists():
        shutil.copy2(example, target)
        print("[setup] Created .env from .env.example; existing .env files are preserved")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skip-e2e", action="store_true", help="omit the optional Playwright test dependencies")
    args = parser.parse_args()
    npm = check_prerequisites()
    if not args.skip_e2e and not (E2E / "package-lock.json").is_file():
        raise SetupError("e2e/package-lock.json is missing; use --skip-e2e for application-only setup")
    python = select_python()
    run([python, "-m", "pip", "install", "--upgrade", "pip"])
    run([python, "-m", "pip", "install", "-r", BACKEND_REQUIREMENTS])
    run([npm, "ci", "--include=dev"], cwd=FRONTEND)
    if not args.skip_e2e:
        run([npm, "ci", "--include=dev"], cwd=E2E)
    seed_environment_file()
    print("\n[setup] Ready. Run run.bat or bash run.sh; add --production for a built, single-port server.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except SetupError as error:
        print(f"\n[setup] ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
    except KeyboardInterrupt:
        print("\n[setup] Interrupted", file=sys.stderr)
        raise SystemExit(130)
