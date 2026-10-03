#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"

if [ ! -x ".venv/bin/python" ]; then
    echo "[run] Repository .venv is missing. Running setup..."
    bash ./setup.sh
fi

exec ".venv/bin/python" run.py "$@"
