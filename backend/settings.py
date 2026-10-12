"""Per-user application settings and storage paths, shared by all launch modes."""

from __future__ import annotations

import json
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path

APP_NAME = "3d-pinball-rebuild"


class SettingsError(RuntimeError):
    """Raised when the user's settings cannot be read, created or validated."""


@dataclass(frozen=True)
class AppSettings:
    settings_path: Path
    data_directory: Path


def settings_path() -> Path:
    if os.name == "nt":
        root = Path(os.environ.get("APPDATA") or Path.home() / "AppData" / "Roaming")
    else:
        root = Path(os.environ.get("XDG_CONFIG_HOME") or Path.home() / ".config")
    return root.expanduser().resolve() / APP_NAME / "settings.json"


def default_data_directory() -> Path:
    root = Path(os.environ.get("TEMP") or tempfile.gettempdir())
    return root.expanduser().resolve() / APP_NAME


def _write_json(path: Path, values: dict, *, overwrite: bool = False) -> None:
    # Publish complete JSON so another startup never reads a partial file.
    temporary_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", encoding="utf-8", dir=path.parent,
            prefix=".settings-", suffix=".tmp", delete=False,
        ) as settings_file:
            temporary_path = Path(settings_file.name)
            json.dump(values, settings_file, indent=2)
            settings_file.write("\n")
        if overwrite:
            temporary_path.replace(path)
            return
        try:
            if os.name == "nt":
                # Windows rename fails if the destination already exists.
                temporary_path.rename(path)
            else:
                os.link(temporary_path, path)
        except FileExistsError:
            pass
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)


def _read_json_object(path: Path) -> dict:
    try:
        values = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise SettingsError(f"Cannot read configuration at {path}: {error}") from error
    if not isinstance(values, dict):
        raise SettingsError(f"Invalid configuration at {path}: expected a JSON object")
    return values


def _ensure_settings_file(path: Path) -> None:
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        if not path.exists():
            _write_json(path, {})
    except OSError as error:
        raise SettingsError(f"Cannot create settings at {path}: {error}") from error


def _validate_ports(values: dict, path: Path) -> dict[str, int]:
    ports: dict[str, int] = {}
    for field in ("frontend_port", "backend_port"):
        if field not in values:
            raise SettingsError(f"Invalid configuration at {path}: missing {field}")
        value = values[field]
        if type(value) is not int or not 1 <= value <= 65535:
            raise SettingsError(
                f"Invalid configuration at {path}: {field} must be an integer from 1 to 65535"
            )
        ports[field] = value
    if ports["frontend_port"] == ports["backend_port"]:
        raise SettingsError(
            f"Invalid configuration at {path}: frontend_port and backend_port must be different"
        )
    return ports


def load_port_mapping(path: Path) -> dict[str, int]:
    """Read default ports, accepting the project's original frontend/backend keys."""
    values = _read_json_object(path)
    normalized = {
        field: values[field] if field in values else values.get(alias)
        for field, alias in (("frontend_port", "frontend"), ("backend_port", "backend"))
        if field in values or alias in values
    }
    return _validate_ports(normalized, path)


def initialize_port_settings(defaults_path: Path) -> dict[str, int]:
    """Create {}, fill missing default ports, and re-read the persisted user ports."""
    defaults = load_port_mapping(defaults_path)
    path = settings_path()
    _ensure_settings_file(path)
    values = _read_json_object(path)
    missing = [field for field in defaults if field not in values]
    for field in missing:
        values[field] = defaults[field]
    # Validate before updating; invalid existing ports are never replaced.
    _validate_ports(values, path)
    if missing:
        try:
            _write_json(path, values, overwrite=True)
        except OSError as error:
            raise SettingsError(f"Cannot update port settings at {path}: {error}") from error
    return _validate_ports(_read_json_object(path), path)


def load_settings() -> AppSettings:
    """Persist a default storage folder once while preserving user configuration."""
    path = settings_path()
    _ensure_settings_file(path)
    values = _read_json_object(path)
    configured = values.get("data_directory", str(default_data_directory()))
    if not isinstance(configured, str) or not configured.strip() or "\0" in configured:
        raise SettingsError(
            f"Invalid settings at {path}: data_directory must be a non-empty folder path"
        )
    try:
        directory = Path(os.path.expandvars(configured)).expanduser()
        if not directory.is_absolute():
            directory = path.parent / directory
        directory = directory.resolve()
    except (OSError, RuntimeError, ValueError) as error:
        raise SettingsError(f"Invalid data_directory in settings at {path}: {error}") from error
    if "data_directory" not in values:
        values["data_directory"] = str(directory)
        try:
            _write_json(path, values, overwrite=True)
        except OSError as error:
            raise SettingsError(f"Cannot update storage settings at {path}: {error}") from error
    return AppSettings(settings_path=path, data_directory=directory)


def configured_database_path(base_directory: Path) -> Path:
    settings = load_settings()
    override = os.environ.get("PINBALL_DB_PATH")
    if override and override.strip():
        try:
            database = Path(os.path.expandvars(override)).expanduser()
            if not database.is_absolute():
                database = base_directory / database
            return database.resolve()
        except (OSError, RuntimeError, ValueError) as error:
            raise SettingsError(f"Invalid PINBALL_DB_PATH: {error}") from error
    return settings.data_directory / "pinball.db"
