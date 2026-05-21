#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
DJANGO_SETTINGS_MODULE=config.settings.local ./venv/bin/python manage.py test apps --verbosity=2 "$@"
