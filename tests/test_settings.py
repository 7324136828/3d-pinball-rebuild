"""Per-user settings initialization, validation and storage precedence."""

from __future__ import annotations

import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from backend import settings
from backend.app.config import PROJECT_ROOT, Settings


class UserSettingsTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory(prefix="pinball-settings-test-")
        self.addCleanup(self.temporary.cleanup)
        # Windows runners may spell TEMP with an 8.3 alias (e.g. RUNNER~1).
        self.root = Path(self.temporary.name).resolve()
        self.config = self.root / "config" / "settings.json"
        self.mapping = self.root / "port_mapping.json"
        self.mapping.write_text('{"frontend": 3010, "backend": 3020}', encoding="utf-8")
        self.default_data = self.root / "storage"
        for patcher in (
            patch.object(settings, "settings_path", return_value=self.config),
            patch.object(settings, "default_data_directory", return_value=self.default_data),
            patch.dict(os.environ, {}, clear=True),
        ):
            patcher.start()
            self.addCleanup(patcher.stop)

    def write_settings(self, values: dict) -> str:
        self.config.parent.mkdir(parents=True, exist_ok=True)
        content = json.dumps(values)
        self.config.write_text(content, encoding="utf-8")
        return content

    def test_missing_file_is_created_empty_then_filled_and_re_read(self) -> None:
        with patch.object(settings, "_write_json", wraps=settings._write_json) as write:
            ports = settings.initialize_port_settings(self.mapping)
        self.assertEqual(write.call_args_list[0].args, (self.config, {}))
        self.assertEqual(ports, {"frontend_port": 3010, "backend_port": 3020})
        self.assertEqual(json.loads(self.config.read_text()), ports)
        loaded = settings.load_settings()
        self.assertEqual(loaded, settings.AppSettings(self.config, self.default_data))
        self.assertEqual(
            json.loads(self.config.read_text()),
            {**ports, "data_directory": str(self.default_data)},
        )

    def test_only_missing_ports_are_filled_and_unknown_settings_survive(self) -> None:
        self.write_settings({"frontend_port": 4110, "custom": {"theme": "dark"}, "data_directory": "scores"})
        self.assertEqual(settings.initialize_port_settings(self.mapping), {"frontend_port": 4110, "backend_port": 3020})
        loaded = settings.load_settings()
        self.assertEqual(loaded.data_directory, self.config.parent / "scores")
        self.assertEqual(
            json.loads(self.config.read_text()),
            {"frontend_port": 4110, "backend_port": 3020, "custom": {"theme": "dark"}, "data_directory": "scores"},
        )

    def test_existing_configuration_is_not_rewritten(self) -> None:
        content = self.write_settings({"frontend_port": 4100, "backend_port": 4200, "data_directory": "scores"})
        with patch.object(settings, "_write_json", wraps=settings._write_json) as write:
            self.assertEqual(settings.initialize_port_settings(self.mapping), {"frontend_port": 4100, "backend_port": 4200})
            settings.load_settings()
        write.assert_not_called()
        self.assertEqual(self.config.read_text(), content)

    def test_mapping_accepts_canonical_keys_and_canonical_keys_take_precedence(self) -> None:
        self.mapping.write_text(
            '{"frontend": 1000, "frontend_port": 3010, "backend_port": 3020}', encoding="utf-8"
        )
        self.assertEqual(settings.load_port_mapping(self.mapping), {"frontend_port": 3010, "backend_port": 3020})

    def test_invalid_ports_are_rejected_without_overwriting_user_values(self) -> None:
        for value in (None, True, False, "3010", 3010.0, 0, -1, 65536):
            with self.subTest(value=value):
                content = self.write_settings({"frontend_port": value, "custom": "keep"})
                with self.assertRaises(settings.SettingsError):
                    settings.initialize_port_settings(self.mapping)
                self.assertEqual(self.config.read_text(), content)

    def test_equal_ports_are_rejected_in_settings_and_mapping(self) -> None:
        content = self.write_settings({"frontend_port": 3020})
        with self.assertRaises(settings.SettingsError):
            settings.initialize_port_settings(self.mapping)
        self.assertEqual(self.config.read_text(), content)
        self.mapping.write_text('{"frontend": 3010, "backend": 3010}', encoding="utf-8")
        with self.assertRaises(settings.SettingsError):
            settings.load_port_mapping(self.mapping)

    def test_bad_json_and_non_objects_are_never_replaced(self) -> None:
        self.config.parent.mkdir(parents=True)
        for content in ("{broken", "[]", "null", '"string"'):
            with self.subTest(content=content):
                self.config.write_text(content, encoding="utf-8")
                with self.assertRaises(settings.SettingsError):
                    settings.initialize_port_settings(self.mapping)
                with self.assertRaises(settings.SettingsError):
                    settings.load_settings()
                self.assertEqual(self.config.read_text(), content)

    def test_invalid_storage_folder_is_preserved(self) -> None:
        for value in (None, 12, "", "  ", "bad\0folder", []):
            with self.subTest(value=value):
                content = self.write_settings({"data_directory": value})
                with self.assertRaises(settings.SettingsError):
                    settings.load_settings()
                self.assertEqual(self.config.read_text(), content)

    def test_storage_path_expands_environment_and_relative_paths_use_settings_folder(self) -> None:
        os.environ["PINBALL_TEST_STORAGE"] = str(self.root / "custom storage")
        placeholder = "%PINBALL_TEST_STORAGE%" if os.name == "nt" else "$PINBALL_TEST_STORAGE"
        self.write_settings({"data_directory": placeholder})
        self.assertEqual(settings.load_settings().data_directory, self.root / "custom storage")
        self.write_settings({"data_directory": "../data storage"})
        self.assertEqual(settings.load_settings().data_directory, self.root / "data storage")

    def test_database_uses_storage_and_explicit_environment_override_wins(self) -> None:
        self.write_settings({"data_directory": "scores"})
        self.assertEqual(settings.configured_database_path(PROJECT_ROOT), self.config.parent / "scores" / "pinball.db")
        os.environ["PINBALL_DB_PATH"] = "custom/pinball.db"
        self.assertEqual(settings.configured_database_path(PROJECT_ROOT), PROJECT_ROOT / "custom" / "pinball.db")
        os.environ["PINBALL_DB_PATH"] = str(self.root / "absolute.db")
        self.assertEqual(settings.configured_database_path(PROJECT_ROOT), self.root / "absolute.db")

    def test_backend_configuration_uses_shared_storage_settings_and_retains_api(self) -> None:
        self.write_settings({"data_directory": "scores"})
        os.environ.update({"CORS_ORIGINS": "https://pinball.example", "PINBALL_SESSION_TTL_SECONDS": "120", "PINBALL_STATIC_DIR": "frontend/dist"})
        configured = Settings.from_environment()
        self.assertEqual(configured.database_path, self.config.parent / "scores" / "pinball.db")
        self.assertEqual(configured.cors_origins, ("https://pinball.example",))
        self.assertEqual(configured.session_ttl_seconds, 120)
        self.assertEqual(configured.static_dir, PROJECT_ROOT / "frontend" / "dist")


class SettingsLocationTests(unittest.TestCase):
    def test_configuration_and_default_storage_locations_use_os_environment(self) -> None:
        with tempfile.TemporaryDirectory(prefix="pinball-locations-test-") as directory:
            root = Path(directory).resolve()
            with patch.dict(os.environ, {"APPDATA": str(root / "roaming"), "XDG_CONFIG_HOME": str(root / "xdg"), "TEMP": str(root / "temp")}, clear=True):
                expected_config = root / ("roaming" if os.name == "nt" else "xdg") / settings.APP_NAME / "settings.json"
                self.assertEqual(settings.settings_path(), expected_config)
                self.assertEqual(settings.default_data_directory(), root / "temp" / settings.APP_NAME)


if __name__ == "__main__":
    unittest.main()
