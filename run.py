#!/usr/bin/env python3
"""Launch Modern 3D Pinball's API and React UI, or its built production server."""

from __future__ import annotations

import argparse
import errno
import os
import re
import shutil
import signal
import socket
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FRONTEND = ROOT / "frontend"
LOCAL_PYTHON = ROOT / ".venv" / ("Scripts/python.exe" if os.name == "nt" else "bin/python")


class RunError(RuntimeError):
    """A configuration or service failed."""


class StopRequested(Exception):
    """The parent received a termination signal."""


def load_env_file(path: Path | None = None) -> None:
    """Load literal .env values, without executing shell syntax or overriding the terminal."""
    env_file = path or ROOT / ".env"
    if not env_file.is_file():
        return
    for number, raw in enumerate(env_file.read_text(encoding="utf-8-sig").splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[7:].lstrip()
        key, separator, value = line.partition("=")
        key = key.strip()
        if not separator or not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", key):
            raise RunError(f"Invalid .env assignment on line {number}")
        value = value.strip()
        if value.startswith(("'", '"')):
            quote = value[0]
            end = value.find(quote, 1)
            if end < 0 or (value[end + 1:].strip() and not value[end + 1:].lstrip().startswith("#")):
                raise RunError(f"Invalid quoted .env value on line {number}")
            value = value[1:end]
        else:
            value = re.split(r"\s+#", value, maxsplit=1)[0].rstrip()
        os.environ.setdefault(key, value)


def select_runtime() -> Path:
    if not LOCAL_PYTHON.is_file():
        print("[run] Repository .venv is missing; running setup...", flush=True)
        status = subprocess.call([sys.executable, str(ROOT / "setup.py")], cwd=ROOT)
        if status:
            raise RunError(f"Setup failed with exit code {status}")
    if not LOCAL_PYTHON.is_file():
        raise RunError("Repository virtual environment is missing; run setup first")
    return LOCAL_PYTHON


def parse_port(value: str | int, label: str) -> int:
    try:
        port = int(value)
    except (TypeError, ValueError) as error:
        raise RunError(f"{label} must be an integer") from error
    if not 1 <= port <= 65535:
        raise RunError(f"{label} must be between 1 and 65535")
    return port


def available_port(start: int, reserved: set[int] | None = None, host: str = "127.0.0.1") -> int:
    try:
        addresses = socket.getaddrinfo(host, 0, type=socket.SOCK_STREAM)
    except socket.gaierror as error:
        raise RunError(f"Cannot resolve bind host {host}") from error
    family, _, _, _, address = addresses[0]
    for port in range(start, 65536):
        if port in (reserved or set()):
            continue
        endpoint = (address[0], port, *address[2:])
        with socket.socket(family, socket.SOCK_STREAM) as probe:
            try:
                probe.bind(endpoint)
            except OSError as error:
                if error.errno in (errno.EADDRINUSE, errno.EACCES) or getattr(error, "winerror", None) in (10013, 10048):
                    continue
                raise RunError(f"Cannot bind {host}:{port}: {error}") from error
        return port
    raise RunError(f"No available TCP port at or above {start}")


def merge_cors_origins(environment: dict[str, str], frontend_port: int) -> None:
    origins = [value.strip() for value in environment.get("CORS_ORIGINS", "").split(",") if value.strip()]
    if "*" in origins:
        return
    for hostname in ("localhost", "127.0.0.1"):
        origin = f"http://{hostname}:{frontend_port}"
        if origin not in origins:
            origins.append(origin)
    environment["CORS_ORIGINS"] = ",".join(origins)


class WindowsJob:
    """A Windows job kills descendants even after npm or Uvicorn's parent exits."""

    def __init__(self) -> None:
        import ctypes
        from ctypes import wintypes

        class BasicLimits(ctypes.Structure):
            _fields_ = [
                ("PerProcessUserTimeLimit", ctypes.c_longlong),
                ("PerJobUserTimeLimit", ctypes.c_longlong),
                ("LimitFlags", wintypes.DWORD),
                ("MinimumWorkingSetSize", ctypes.c_size_t),
                ("MaximumWorkingSetSize", ctypes.c_size_t),
                ("ActiveProcessLimit", wintypes.DWORD),
                ("Affinity", ctypes.c_size_t),
                ("PriorityClass", wintypes.DWORD),
                ("SchedulingClass", wintypes.DWORD),
            ]

        class IOCounters(ctypes.Structure):
            _fields_ = [(name, ctypes.c_ulonglong) for name in (
                "ReadOperationCount", "WriteOperationCount", "OtherOperationCount",
                "ReadTransferCount", "WriteTransferCount", "OtherTransferCount",
            )]

        class ExtendedLimits(ctypes.Structure):
            _fields_ = [
                ("BasicLimitInformation", BasicLimits), ("IoInfo", IOCounters),
                ("ProcessMemoryLimit", ctypes.c_size_t), ("JobMemoryLimit", ctypes.c_size_t),
                ("PeakProcessMemoryUsed", ctypes.c_size_t), ("PeakJobMemoryUsed", ctypes.c_size_t),
            ]

        self.ctypes = ctypes
        self.kernel = ctypes.WinDLL("kernel32", use_last_error=True)
        self.kernel.CreateJobObjectW.argtypes = [ctypes.c_void_p, wintypes.LPCWSTR]
        self.kernel.CreateJobObjectW.restype = wintypes.HANDLE
        self.kernel.SetInformationJobObject.argtypes = [wintypes.HANDLE, ctypes.c_int, ctypes.c_void_p, wintypes.DWORD]
        self.kernel.SetInformationJobObject.restype = wintypes.BOOL
        self.kernel.AssignProcessToJobObject.argtypes = [wintypes.HANDLE, wintypes.HANDLE]
        self.kernel.AssignProcessToJobObject.restype = wintypes.BOOL
        self.kernel.CloseHandle.argtypes = [wintypes.HANDLE]
        self.kernel.CloseHandle.restype = wintypes.BOOL
        self.handle = self.kernel.CreateJobObjectW(None, None)
        if not self.handle:
            raise RunError(f"Cannot create a Windows process job: {ctypes.WinError(ctypes.get_last_error())}")
        limits = ExtendedLimits()
        limits.BasicLimitInformation.LimitFlags = 0x2000  # JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
        if not self.kernel.SetInformationJobObject(self.handle, 9, ctypes.byref(limits), ctypes.sizeof(limits)):
            error = ctypes.WinError(ctypes.get_last_error())
            self.close()
            raise RunError(f"Cannot configure Windows process cleanup: {error}")

    def assign(self, process: subprocess.Popen[bytes]) -> None:
        if not self.kernel.AssignProcessToJobObject(self.handle, int(process._handle)):
            raise RunError(f"Cannot manage Windows service descendants: {self.ctypes.WinError(self.ctypes.get_last_error())}")

    def close(self) -> None:
        if self.handle:
            self.kernel.CloseHandle(self.handle)
            self.handle = None


class ManagedProcess:
    def __init__(self, label: str, command: list[str], *, cwd: Path, env: dict[str, str]) -> None:
        self.label = label
        self.job = WindowsJob() if os.name == "nt" else None
        self.process: subprocess.Popen[bytes] | None = None
        try:
            options = {"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP} if os.name == "nt" else {"start_new_session": True}
            self.process = subprocess.Popen(command, cwd=cwd, env=env, **options)
            if self.job:
                self.job.assign(self.process)
        except (OSError, RunError) as error:
            self.stop()
            raise RunError(f"Cannot start {label}: {error}") from error

    def stop(self) -> None:
        process = self.process
        try:
            if process and process.poll() is None:
                try:
                    if os.name == "nt":
                        process.send_signal(signal.CTRL_BREAK_EVENT)
                    else:
                        os.killpg(process.pid, signal.SIGTERM)
                except OSError:
                    pass
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    pass
            # Always clean the group/job, including when its leader already exited.
            if self.job:
                self.job.close()
            elif process:
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
            if process and process.poll() is None:
                process.kill()
                process.wait(timeout=5)
        finally:
            if self.job:
                self.job.close()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--production", action="store_true", help="build React and serve it with the API on one port")
    parser.add_argument("--backend-port", type=int, help="first API/server port to try")
    parser.add_argument("--frontend-port", type=int, help="first Vite port to try (development only)")
    parser.add_argument("--host", help="API/server bind address (default: 127.0.0.1)")
    parser.add_argument("--no-reload", action="store_true", help="disable API development reload")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    load_env_file()
    requested_backend = parse_port(args.backend_port if args.backend_port is not None else os.environ.get("BACKEND_PORT", "8000"), "backend port")
    host = args.host or os.environ.get("BACKEND_HOST", "127.0.0.1")
    backend_port = available_port(requested_backend, host=host)
    connect_host = "127.0.0.1" if host in ("0.0.0.0", "localhost") else "::1" if host == "::" else host
    backend_url = f"http://{'[' + connect_host + ']' if ':' in connect_host else connect_host}:{backend_port}"
    runtime = select_runtime()
    npm = shutil.which("npm.cmd" if os.name == "nt" else "npm")
    if npm is None or not (FRONTEND / "node_modules").is_dir():
        raise RunError("Frontend dependencies or npm are missing; run setup first")
    environment = os.environ.copy()
    environment.setdefault("PINBALL_DB_PATH", "data/pinball.db")
    environment["PYTHONUNBUFFERED"] = "1"
    frontend_environment = environment.copy()
    frontend_environment["BACKEND_URL"] = backend_url
    if backend_port != requested_backend:
        print(f"[run] Port {requested_backend} is busy; using {backend_port}.", flush=True)
    backend_command = [str(runtime), "-m", "uvicorn", "backend.app.main:app", "--host", host, "--port", str(backend_port)]
    services: list[ManagedProcess] = []
    previous_sigterm = signal.getsignal(signal.SIGTERM)

    def handle_sigterm(_number: int, _frame: object) -> None:
        raise StopRequested

    signal.signal(signal.SIGTERM, handle_sigterm)
    try:
        if args.production:
            print("[run] Building the React frontend for production...", flush=True)
            build = ManagedProcess("Frontend build", [npm, "run", "build"], cwd=FRONTEND, env=frontend_environment)
            services.append(build)
            assert build.process is not None
            status = build.process.wait()
            build.stop()
            services.remove(build)
            if status:
                raise RunError(f"Frontend build failed with exit code {status}")
            environment["PINBALL_STATIC_DIR"] = str(FRONTEND / "dist")
            print(f"[run] Modern 3D Pinball: {backend_url} (API docs: {backend_url}/docs)", flush=True)
        else:
            requested_frontend = parse_port(args.frontend_port if args.frontend_port is not None else os.environ.get("FRONTEND_PORT", "5173"), "frontend port")
            frontend_port = available_port(requested_frontend, {backend_port})
            merge_cors_origins(environment, frontend_port)
            if not args.no_reload:
                backend_command.append("--reload")
            if frontend_port != requested_frontend:
                print(f"[run] Frontend port {requested_frontend} is busy; using {frontend_port}.", flush=True)
            print(f"[run] Modern 3D Pinball: http://localhost:{frontend_port}\n[run] API: {backend_url} (docs: {backend_url}/docs)", flush=True)
        print("[run] Press Ctrl+C to stop all services.", flush=True)
        services.append(ManagedProcess("Backend", backend_command, cwd=ROOT, env=environment))
        if not args.production:
            services.append(ManagedProcess("Frontend", [npm, "run", "dev", "--", "--host", "127.0.0.1", "--port", str(frontend_port), "--strictPort"], cwd=FRONTEND, env=frontend_environment))
        while True:
            for service in services:
                assert service.process is not None
                status = service.process.poll()
                if status is not None:
                    raise RunError(f"{service.label} exited unexpectedly with code {status}; stopping all services")
            time.sleep(0.25)
    except KeyboardInterrupt:
        print("\n[run] Stopping all services...", flush=True)
        return 0
    except StopRequested:
        print("\n[run] Termination requested; stopping all services...", flush=True)
        return 143
    finally:
        # A second Ctrl+C must not interrupt cleanup and leave descendants alive.
        previous_sigint = signal.signal(signal.SIGINT, signal.SIG_IGN)
        signal.signal(signal.SIGTERM, signal.SIG_IGN)
        try:
            for service in reversed(services):
                service.stop()
        finally:
            signal.signal(signal.SIGINT, previous_sigint)
            signal.signal(signal.SIGTERM, previous_sigterm)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RunError as error:
        print(f"[run] ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
    except KeyboardInterrupt:
        print("\n[run] Interrupted", file=sys.stderr)
        raise SystemExit(130)
