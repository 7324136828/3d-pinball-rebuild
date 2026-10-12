from __future__ import annotations

import json
import os
import socket
import subprocess
import tempfile
import time
import unittest
from contextlib import contextmanager
from pathlib import Path
from unittest import mock
from urllib.error import URLError
from urllib.request import ProxyHandler, Request, build_opener

import build

from build import (
    ARTIFACTS,
    LAUNCHER,
    NOTICES,
    PROFILES,
    BuildError,
    checked_path,
    main,
    prepare_artifacts,
    publish_artifacts,
    pyinstaller_command,
    select_python,
    validate_artifacts,
)


def write_packages(directory: Path, version: str) -> None:
    for profile, host in PROFILES.items():
        package = directory / profile
        package.mkdir(parents=True, exist_ok=True)
        (package / "server.exe").write_bytes(f"server-{profile}-{version}".encode("ascii"))
        (package / "public" / "assets").mkdir(parents=True)
        (package / "public" / "index.html").write_text(version, encoding="utf-8")
        (package / "public" / "assets" / "app.js").write_text(
            f"script-{profile}-{version}", encoding="utf-8",
        )
        (package / "assets").mkdir()
        (package / "assets" / "table.json").write_text(
            json.dumps({"version": version}), encoding="utf-8",
        )
        for notice in NOTICES:
            (package / notice).write_text(f"{notice}-{version}", encoding="utf-8")
        (package / "run.bat").write_text(f"run-{profile}-{version}", encoding="ascii")
        # Different old defaults make runtime.json replacement and rollback observable.
        runtime_host = host if version == "new" else f"old-{host}"
        (package / "runtime.json").write_text(
            json.dumps({"host": runtime_host}), encoding="ascii",
        )
        ports = {"frontend_port": 4100, "backend_port": 9200}
        if version != "new":
            ports = {"frontend_port": 4300, "backend_port": 9400}
        (package / "port_mapping.json").write_text(json.dumps(ports), encoding="ascii")


def package_contents(directory: Path) -> dict[Path, bytes]:
    return {
        path.relative_to(directory): path.read_bytes()
        for path in directory.rglob("*") if path.is_file()
    }


def managed_contents(directory: Path) -> dict[str, dict[Path, bytes]]:
    return {profile: package_contents(directory / profile) for profile in PROFILES}


class ArtifactPreparationTests(unittest.TestCase):
    def test_build_creates_two_self_contained_packages_with_mode_defaults(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            stage = Path(directory)
            (stage / "server.exe").write_bytes(b"shared backend")
            (stage / "public" / "assets").mkdir(parents=True)
            (stage / "public" / "index.html").write_text("shared frontend", encoding="utf-8")
            (stage / "public" / "assets" / "app.js").write_bytes(b"shared script")
            defaults = stage / "defaults.json"
            defaults.write_text(
                '{"frontend_port": 4100, "backend_port": 9200}\n', encoding="utf-8",
            )
            table = stage / "table.json"
            table.write_text('{"table": {}, "bounds": {}}', encoding="utf-8")
            for notice in NOTICES:
                (stage / notice).write_text(f"notice {notice}", encoding="utf-8")

            packages = prepare_artifacts(
                stage, defaults_path=defaults, table_path=table, notices_root=stage,
            )

            self.assertEqual(packages, stage / "packages")
            self.assertEqual({path.name for path in packages.iterdir()}, {"Debug", "Release"})
            for profile, expected_host in {"Debug": "127.0.0.1", "Release": "0.0.0.0"}.items():
                with self.subTest(profile=profile):
                    package = packages / profile
                    validate_artifacts(package, host=expected_host)
                    self.assertEqual({path.name for path in package.iterdir()}, set(ARTIFACTS))
                    self.assertEqual((package / "server.exe").read_bytes(), b"shared backend")
                    self.assertEqual(package_contents(package / "public"), package_contents(stage / "public"))
                    self.assertEqual((package / "run.bat").read_text(encoding="ascii"), LAUNCHER)
                    self.assertEqual((package / "port_mapping.json").read_bytes(), defaults.read_bytes())
                    self.assertEqual((package / "assets" / "table.json").read_bytes(), table.read_bytes())
                    for notice in NOTICES:
                        self.assertEqual((package / notice).read_bytes(), (stage / notice).read_bytes())
                    self.assertEqual(
                        json.loads((package / "runtime.json").read_text(encoding="ascii")),
                        {"host": expected_host},
                    )
                    self.assertFalse(any(path.is_symlink() for path in package.rglob("*")))

            # Each mode remains usable after the shared staging files or the other mode change.
            (stage / "server.exe").unlink()
            defaults.unlink()
            (packages / "Debug" / "public" / "index.html").write_text("changed", encoding="utf-8")
            self.assertEqual((packages / "Release" / "server.exe").read_bytes(), b"shared backend")
            self.assertEqual(
                (packages / "Release" / "public" / "index.html").read_text(encoding="utf-8"),
                "shared frontend",
            )
            self.assertEqual(
                json.loads((packages / "Release" / "port_mapping.json").read_text(encoding="utf-8")),
                {"frontend_port": 4100, "backend_port": 9200},
            )

    def test_launcher_initializes_settings_before_starting_servers(self) -> None:
        initialize = '"%~dp0server.exe" --initialize-settings\n'
        abort_on_failure = "if errorlevel 1 exit /b %ERRORLEVEL%\n"
        launch = ':launch\n"%~dp0server.exe" %*\n'
        self.assertIn(initialize + abort_on_failure + launch, LAUNCHER)
        for flag in ("--help", "-h"):
            help_bypass = f'if /i "%~1"=="{flag}" if "%~2"=="" goto launch\n'
            self.assertLess(LAUNCHER.index(help_bypass), LAUNCHER.index(initialize))

    def test_preparation_rejects_missing_or_invalid_port_defaults_before_creating_packages(self) -> None:
        for contents in (None, "{}", "not json", '{"frontend_port": 0, "backend_port": 9200}'):
            with self.subTest(contents=contents), tempfile.TemporaryDirectory() as directory:
                stage = Path(directory)
                defaults = stage / "defaults.json"
                if contents is not None:
                    defaults.write_text(contents, encoding="utf-8")
                with self.assertRaisesRegex(BuildError, "Invalid port defaults"):
                    prepare_artifacts(stage, defaults_path=defaults)
                self.assertFalse((stage / "packages").exists())

    def test_build_rejects_invalid_port_defaults_before_installing_dependencies(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            missing_defaults = Path(directory) / "missing.json"
            with (
                mock.patch("build.os.name", "nt"),
                mock.patch("build.PORT_MAPPING", missing_defaults),
                mock.patch("build.run") as run,
                mock.patch("build.select_python") as select_python,
            ):
                with self.assertRaisesRegex(BuildError, "Invalid port defaults"):
                    main([])
                run.assert_not_called()
                select_python.assert_not_called()

    def test_validation_rejects_an_incorrect_runtime_default(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            packages = Path(directory)
            write_packages(packages, "new")
            with self.assertRaisesRegex(BuildError, "Unexpected runtime defaults"):
                validate_artifacts(packages / "Debug", host="0.0.0.0")

    def test_validation_rejects_missing_or_invalid_packaged_port_defaults(self) -> None:
        for contents in (None, "{}", "[]", '{"frontend_port": 4100, "backend_port": "9200"}'):
            with self.subTest(contents=contents), tempfile.TemporaryDirectory() as directory:
                packages = Path(directory)
                write_packages(packages, "new")
                defaults = packages / "Debug" / "port_mapping.json"
                if contents is None:
                    defaults.unlink()
                else:
                    defaults.write_text(contents, encoding="utf-8")
                with self.assertRaisesRegex(BuildError, "Invalid port defaults"):
                    validate_artifacts(packages / "Debug", host=PROFILES["Debug"])


class PublicationTests(unittest.TestCase):
    def test_replacement_preserves_each_modes_database_and_local_configuration(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            repository = Path(directory)
            output = repository / "dist"
            stage = repository / "build" / "packages"
            write_packages(output, "old")
            write_packages(stage, "new")
            old_artifacts = managed_contents(output)
            new_artifacts = managed_contents(stage)
            user_state = {}
            for profile in PROFILES:
                package = output / profile
                (package / "data").mkdir()
                (package / "data" / "counter.db").write_bytes(f"{profile} counter data".encode("ascii"))
                (package / ".env").write_text(f"BACKEND_PORT=9000\nMODE={profile}\n", encoding="utf-8")
                (package / "notes.txt").write_text(f"{profile} user notes", encoding="utf-8")
                user_state[profile] = {
                    name: (package / name).read_bytes()
                    for name in ("data/counter.db", ".env", "notes.txt")
                }

            publish_artifacts(stage, repository=repository)

            for profile in PROFILES:
                with self.subTest(profile=profile):
                    actual = package_contents(output / profile)
                    self.assertEqual(
                        {path: content for path, content in actual.items() if path.parts[0] in ARTIFACTS},
                        new_artifacts[profile],
                    )
                    for name, content in user_state[profile].items():
                        self.assertEqual((output / profile / name).read_bytes(), content)
                    self.assertEqual(package_contents(stage / "previous" / profile), old_artifacts[profile])
                    self.assertFalse(any((stage / profile / name).exists() for name in ARTIFACTS))

    def test_locked_release_destination_rolls_back_both_existing_modes(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            repository = Path(directory)
            output = repository / "dist"
            stage = repository / "build" / "packages"
            write_packages(output, "old")
            write_packages(stage, "new")
            for profile in PROFILES:
                (output / profile / ".env").write_text(f"MODE={profile}", encoding="utf-8")
            old_contents = managed_contents(output)
            new_contents = managed_contents(stage)
            original_rename = Path.rename
            moves = []

            def fail_locked_release(source: Path, target: Path) -> Path:
                if source == output / "Release" / "public":
                    raise OSError("simulated locked Release destination")
                moves.append((source, Path(target)))
                return original_rename(source, target)

            with mock.patch.object(Path, "rename", new=fail_locked_release):
                with self.assertRaisesRegex(BuildError, "Could not replace Debug/Release artifacts"):
                    publish_artifacts(stage, repository=repository)

            for name in ARTIFACTS:
                self.assertIn((stage / "Debug" / name, output / "Debug" / name), moves)
            self.assertIn((stage / "Release" / "server.exe", output / "Release" / "server.exe"), moves)
            self.assertEqual(managed_contents(output), old_contents)
            self.assertEqual(managed_contents(stage), new_contents)

    def test_failed_first_install_leaves_no_mixed_artifacts(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            repository = Path(directory)
            output = repository / "dist"
            stage = repository / "build" / "packages"
            write_packages(stage, "new")
            new_contents = managed_contents(stage)
            original_rename = Path.rename

            def fail_release_install(source: Path, target: Path) -> Path:
                if source == stage / "Release" / "public":
                    raise OSError("simulated failed first installation")
                return original_rename(source, target)

            with mock.patch.object(Path, "rename", new=fail_release_install):
                with self.assertRaises(BuildError):
                    publish_artifacts(stage, repository=repository)

            self.assertEqual(managed_contents(stage), new_contents)
            for profile in PROFILES:
                with self.subTest(profile=profile):
                    self.assertEqual(package_contents(output / profile), {})
                    self.assertFalse(any((output / profile / name).exists() for name in ARTIFACTS))

    def test_unsafe_release_target_is_rejected_before_either_mode_is_moved(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            repository = Path(directory)
            output = repository / "dist"
            stage = repository / "build" / "packages"
            write_packages(output, "old")
            write_packages(stage, "new")
            old_contents = managed_contents(output)
            new_contents = managed_contents(stage)
            original_resolve = Path.resolve

            def resolve_unsafe_target(path: Path, *args: object, **kwargs: object) -> Path:
                if path == output / "Release" / "public":
                    return repository / "outside"
                return original_resolve(path, *args, **kwargs)

            with (
                mock.patch.object(Path, "resolve", new=resolve_unsafe_target),
                mock.patch.object(Path, "rename") as rename,
            ):
                with self.assertRaisesRegex(BuildError, "Unsafe build path"):
                    publish_artifacts(stage, repository=repository)
                rename.assert_not_called()

            self.assertEqual(managed_contents(output), old_contents)
            self.assertEqual(managed_contents(stage), new_contents)

    def test_checked_path_rejects_parent_and_paths_escaping_the_workspace(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            repository = Path(directory) / "repository"
            repository.mkdir()
            for unsafe in (repository, repository / ".." / "outside"):
                with self.subTest(path=unsafe), self.assertRaises(BuildError):
                    checked_path(unsafe, repository)


class BuildCommandTests(unittest.TestCase):
    def test_build_uses_repository_environment_even_when_another_is_active(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            local_venv = root / ".venv"
            python = local_venv / "Scripts" / "python.exe"
            python.parent.mkdir(parents=True)
            python.touch()
            with (
                mock.patch.dict(os.environ, {"VIRTUAL_ENV": "unrelated", "CONDA_PREFIX": "unrelated"}),
                mock.patch("build.ROOT", root),
                mock.patch("build.LOCAL_VENV", local_venv),
                mock.patch("build.LOCAL_PYTHON", python),
                mock.patch("build.venv.EnvBuilder") as builder,
            ):
                self.assertEqual(select_python(), python)
                builder.assert_not_called()

    def test_pyinstaller_freezes_the_packaged_entrypoint_with_dynamic_uvicorn_imports(self) -> None:
        command = pyinstaller_command(Path("python.exe"), Path("stage"))
        self.assertEqual(command[:3], [Path("python.exe"), "-m", "PyInstaller"])
        self.assertIn("--onefile", command)
        self.assertEqual(command[-1], build.BACKEND / "packaged.py")
        for module in (
            "uvicorn.logging", "uvicorn.loops.asyncio", "uvicorn.lifespan.on",
            "uvicorn.protocols.http.h11_impl",
        ):
            position = command.index(module)
            self.assertEqual(command[position - 1], "--hidden-import")

    @unittest.skipUnless(os.name == "nt", "Windows build command planner")
    def test_skip_install_build_plans_and_publishes_both_profiles(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            repository = Path(directory)
            frontend = repository / "frontend"
            backend = repository / "backend"
            frontend.mkdir()
            backend.mkdir()
            (backend / "packaged.py").touch()
            table = repository / "assets" / "table.json"
            table.parent.mkdir()
            table.write_text('{"table": {}}', encoding="utf-8")
            ports = repository / "port_mapping.json"
            ports.write_text('{"frontend_port": 3010, "backend_port": 3020}', encoding="utf-8")
            for notice in NOTICES:
                (repository / notice).write_text(notice, encoding="utf-8")
            commands = []

            def fake_run(command, *, cwd=repository, env=None):
                commands.append((command, cwd, env))
                if "--outDir" in command:
                    public = command[command.index("--outDir") + 1]
                    public.mkdir()
                    (public / "index.html").write_text("built frontend", encoding="utf-8")
                if "PyInstaller" in command:
                    frozen = command[command.index("--distpath") + 1]
                    frozen.mkdir()
                    (frozen / "server.exe").write_bytes(b"frozen backend")

            with (
                mock.patch.multiple(
                    "build", ROOT=repository, FRONTEND=frontend, BACKEND=backend,
                    WORK=repository / "build", OUTPUT=repository / "dist",
                    PORT_MAPPING=ports, TABLE=table,
                ),
                mock.patch("build.shutil.which", return_value="npm.cmd"),
                mock.patch("build.select_python", return_value=Path("local-python.exe")),
                mock.patch("build.run", side_effect=fake_run),
                mock.patch.dict(os.environ, {"VITE_ENABLE_TEST_HOOKS": "1"}),
            ):
                self.assertEqual(main(["--skip-install"]), 0)
            self.assertFalse(any("install" in command or "ci" in command for command, _, _ in commands))
            self.assertEqual(commands[0][0], ["npm.cmd", "run", "typecheck"])
            frontend_build = next(item for item in commands if "--outDir" in item[0])
            self.assertEqual(frontend_build[1], frontend)
            self.assertNotIn("VITE_ENABLE_TEST_HOOKS", frontend_build[2])
            self.assertEqual(sum(command[-1] == "--help" for command, _, _ in commands), 2)
            for profile, host in PROFILES.items():
                validate_artifacts(repository / "dist" / profile, host=host)


@unittest.skipUnless(
    os.name == "nt" and os.environ.get("PINBALL_TEST_PACKAGED_ROOT"),
    "Set PINBALL_TEST_PACKAGED_ROOT to a built dist folder to smoke-test Windows executables",
)
class PackagedSmokeTests(unittest.TestCase):
    @staticmethod
    def available_ports() -> tuple[int, int]:
        # Reserve distinct ephemeral ports together before handing them to the launcher.
        with socket.socket() as front, socket.socket() as back:
            front.bind(("127.0.0.1", 0))
            back.bind(("127.0.0.1", 0))
            return front.getsockname()[1], back.getsockname()[1]

    @contextmanager
    def launched(self, package, environment, isolated, opener, ports, arguments=()):
        frontend_url = f"http://127.0.0.1:{ports[0]}"
        backend_url = f"http://127.0.0.1:{ports[1]}"
        log_path = isolated / "server.log"
        with log_path.open("w", encoding="utf-8") as log:
            process = subprocess.Popen(
                ["cmd.exe", "/d", "/c", str(package / "run.bat"), *arguments], cwd=package,
                env=environment, stdout=log, stderr=subprocess.STDOUT,
            )
            try:
                deadline = time.monotonic() + 45
                while True:
                    try:
                        with opener.open(frontend_url + "/api/health", timeout=1) as response:
                            health = json.load(response)
                        self.assertEqual(health, {"status": "ok"})
                        break
                    except (URLError, OSError):
                        if process.poll() is not None or time.monotonic() >= deadline:
                            self.fail("Frozen launcher failed to start:\n" + log_path.read_text(encoding="utf-8"))
                        time.sleep(0.2)
                yield frontend_url, backend_url
            finally:
                if process.poll() is None:
                    subprocess.run(
                        ["taskkill", "/PID", str(process.pid), "/T", "/F"],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False,
                    )
                process.wait(timeout=15)

    def test_both_launchers_initialize_settings_then_use_saved_ports_and_storage(self) -> None:
        packages = Path(os.environ["PINBALL_TEST_PACKAGED_ROOT"]).resolve()
        opener = build_opener(ProxyHandler({}))
        for profile in PROFILES:
            with self.subTest(profile=profile), tempfile.TemporaryDirectory(prefix="pinball-frozen-") as directory:
                isolated = Path(directory).resolve()
                temporary = isolated / "temp"
                temporary.mkdir()
                environment = os.environ.copy()
                for name in (
                    "FRONTEND_PORT", "BACKEND_PORT", "BACKEND_HOST", "PINBALL_DB_PATH",
                    "PINBALL_STATIC_DIR", "CORS_ORIGINS",
                ):
                    environment.pop(name, None)
                environment.update(APPDATA=str(isolated / "settings"), TEMP=str(temporary), TMP=str(temporary))
                package = packages / profile
                settings_file = isolated / "settings" / "3d-pinball-rebuild" / "settings.json"
                defaults = build.load_port_mapping(package / "port_mapping.json")
                ports = self.available_ports()
                arguments = ["--frontend-port", str(ports[0]), "--backend-port", str(ports[1])]
                # Fresh startup still writes project port defaults into settings;
                # CLI ports keep smoke tests independent of busy default listeners.
                with self.launched(package, environment, isolated, opener, ports, arguments):
                    settings = json.loads(settings_file.read_text(encoding="utf-8"))
                    for field in ("frontend_port", "backend_port"):
                        self.assertEqual(settings[field], defaults[field])
                    default_data = temporary / "3d-pinball-rebuild"
                    self.assertEqual(Path(settings["data_directory"]), default_data)
                    self.assertTrue((default_data / "pinball.db").is_file())

                ports = self.available_ports()
                settings["frontend_port"], settings["backend_port"] = ports
                data = isolated / "custom data storage"
                settings["data_directory"] = str(data)
                settings["custom_value"] = "preserve this user setting"
                settings_file.write_text(json.dumps(settings), encoding="utf-8")
                with self.launched(package, environment, isolated, opener, ports) as (frontend_url, backend_url):
                    for url in (frontend_url, backend_url):
                        with opener.open(url + "/api/health", timeout=5) as response:
                            self.assertEqual(json.load(response), {"status": "ok"})
                        with opener.open(url + "/api/table", timeout=5) as response:
                            self.assertIn("flippers", json.load(response))
                    with opener.open(frontend_url + "/", timeout=5) as response:
                        self.assertIn(b"<html", response.read().lower())
                    request = Request(
                        frontend_url + "/api/games", data=b'{"player_names":["Frozen smoke"]}',
                        headers={"Content-Type": "application/json"}, method="POST",
                    )
                    with opener.open(request, timeout=5) as response:
                        self.assertEqual(response.status, 201)
                    self.assertTrue((data / "pinball.db").is_file())
                    self.assertEqual(json.loads(settings_file.read_text(encoding="utf-8")), settings)


if __name__ == "__main__":
    unittest.main()
