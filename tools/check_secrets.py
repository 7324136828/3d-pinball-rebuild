#!/usr/bin/env python3
"""Conservative source credential scan; report locations, never matched values."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXCLUDED = {".git", ".venv", "node_modules", "__pycache__", "dist", "test-results", "playwright-report", ".artifacts"}
PATTERNS = {
    "private key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----"),
    "AWS access key": re.compile(r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b"),
    "GitHub token": re.compile(r"\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b"),
    "provider API key": re.compile(r"\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{30,}\b"),
    "Google API key": re.compile(r"\bAIza[A-Za-z0-9_-]{35}\b"),
    "Slack token": re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{20,}\b"),
    "credential in URL": re.compile(r"(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|https?)://[^\s/:]+:[^\s/@]+@", re.I),
}
ASSIGNMENT = re.compile(
    r"\b(?:api[_-]?key|client[_-]?secret|access[_-]?token|password|secret[_-]?key)\b"
    r"\s*[:=]\s*[\"']([^\"'\r\n]+)[\"']", re.I,
)
PLACEHOLDERS = ("example", "placeholder", "redacted", "your_", "your-", "changeme", "os.environ", "process.env", "${", "<", "test-")


def scan() -> list[tuple[str, int, str]]:
    findings: list[tuple[str, int, str]] = []
    for path in sorted(ROOT.rglob("*")):
        relative = path.relative_to(ROOT)
        if any(part in EXCLUDED for part in relative.parts) or not path.is_file():
            continue
        # Binary assets are not source text. Decode only strict UTF-8 documents.
        try:
            data = path.read_bytes()
            if b"\0" in data:
                continue
            source = data.decode("utf-8-sig")
        except (UnicodeDecodeError, OSError):
            continue
        for line_number, line in enumerate(source.splitlines(), 1):
            for category, pattern in PATTERNS.items():
                if pattern.search(line):
                    findings.append((relative.as_posix(), line_number, category))
            for match in ASSIGNMENT.finditer(line):
                value = match.group(1).strip()
                if len(value) >= 12 and not any(marker in value.lower() for marker in PLACEHOLDERS):
                    findings.append((relative.as_posix(), line_number, "possible literal credential"))
    return findings


if __name__ == "__main__":
    detected = scan()
    for filename, line_number, category in detected:
        print(f"{filename}:{line_number}: {category} (value omitted)")
    print(f"Credential pattern audit: {len(detected)} potential finding(s).")
    raise SystemExit(1 if detected else 0)
