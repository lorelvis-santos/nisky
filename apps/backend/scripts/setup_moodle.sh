#!/usr/bin/env bash
set -euo pipefail

# Crea el venv local del cliente Moodle e instala sus dependencias.
# El venv vive dentro del repo (scripts/.venv) para que el proyecto sea portable.
cd "$(dirname "$0")"

if [ ! -d .venv ]; then
  python3 -m venv .venv
fi

.venv/bin/pip install --quiet -r requirements.txt

echo "Cliente Moodle listo: $(pwd)/.venv/bin/python"
