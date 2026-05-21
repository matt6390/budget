#!/usr/bin/env bash
set -e
REPO="$(cd "$(dirname "$0")" && pwd)"

echo "==> Starting Budget App"

# Backend
cd "$REPO/backend"
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "  Created backend/.env from .env.example"
fi
DJANGO_SETTINGS_MODULE=config.settings.local ./venv/bin/python manage.py migrate --run-syncdb 2>/dev/null || true
DJANGO_SETTINGS_MODULE=config.settings.local ./venv/bin/python manage.py runserver 8000 &
BACKEND_PID=$!

# Frontend
cd "$REPO/frontend"
if [ ! -d "node_modules" ]; then
  echo "  Installing frontend dependencies..."
  npm install
fi
npm run dev &
FRONTEND_PID=$!

echo ""
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:5173"
echo ""
echo "  Press Ctrl+C to stop both."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
