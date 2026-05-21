#!/usr/bin/env bash
set -e
echo "==> Setting up backend"

# Find Python 3.10 regardless of where it lives (Intel Mac, Apple Silicon, Linux)
PYTHON=""
for candidate in python3.10 python3 python; do
  if command -v "$candidate" &>/dev/null; then
    ver=$("$candidate" -c 'import sys; print(sys.version_info[:2])' 2>/dev/null)
    if [[ "$ver" == "(3, 10)" || "$ver" == "(3, 11)" || "$ver" == "(3, 12)" ]]; then
      PYTHON="$candidate"
      break
    fi
  fi
done

if [ -z "$PYTHON" ]; then
  echo "ERROR: Python 3.10 or newer not found."
  echo "  Mac:   brew install python@3.10"
  echo "  Linux: sudo apt install python3.10"
  exit 1
fi

echo "  Using $PYTHON ($(${PYTHON} --version))"
"$PYTHON" -m venv venv
./venv/bin/pip install --upgrade pip -q
./venv/bin/pip install -r requirements.txt -q
cp -n .env.example .env 2>/dev/null || true
DJANGO_SETTINGS_MODULE=config.settings.local ./venv/bin/python manage.py migrate
echo "Done. Run ./start.sh from the project root to launch the app."
