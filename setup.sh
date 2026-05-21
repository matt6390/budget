#!/usr/bin/env bash
# One-time setup script — run this once when you first download the project.
set -e
REPO="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "=============================="
echo "  Budget App — First-time Setup"
echo "=============================="
echo ""

# ── Backend ─────────────────────────────────────────────
echo "Step 1/2 — Setting up the backend (Python)..."
cd "$REPO/backend"
bash setup.sh

# ── Frontend ─────────────────────────────────────────────
echo ""
echo "Step 2/2 — Installing frontend dependencies (Node.js)..."
cd "$REPO/frontend"
npm install

echo ""
echo "=============================="
echo "  Setup complete!"
echo ""
echo "  To start the app, run:"
echo "    ./start.sh"
echo ""
echo "  Then open http://localhost:5173 in your browser."
echo "=============================="
echo ""
