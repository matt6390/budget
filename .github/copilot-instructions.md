# Copilot Instructions

## Build, test, and lint commands

- **Start everything**: `./start.sh` from the repo root (starts backend on :8000 and frontend on :5173)
- **Backend only**: `cd backend && DJANGO_SETTINGS_MODULE=config.settings.local ./venv/bin/python manage.py runserver`
- **Frontend only**: `cd frontend && npm run dev`
- **Run all tests**: `cd backend && ./run_tests.sh`
- **Run single test**: `cd backend && ./run_tests.sh apps.users.tests.AuthTests.test_login_success`
- **Django check**: `cd backend && DJANGO_SETTINGS_MODULE=config.settings.local ./venv/bin/python manage.py check`
- **New migration**: `cd backend && DJANGO_SETTINGS_MODULE=config.settings.local ./venv/bin/python manage.py makemigrations`
- **Apply migrations**: `cd backend && DJANGO_SETTINGS_MODULE=config.settings.local ./venv/bin/python manage.py migrate`
- **Frontend build**: `cd frontend && npm run build`

## Architecture

- **Backend**: Django 4.2 + Django REST Framework + SimpleJWT. Python 3.10 virtualenv at `backend/venv/`.
- **Frontend**: React 18 + TypeScript + Vite. Proxies `/api` to `http://localhost:8000`.
- **Database**: SQLite at `backend/db.sqlite3`.
- **Auth**: JWT via httpOnly cookies (set by server) and localStorage (read by frontend). Custom `CookieJWTAuthentication` class reads the cookie first, then falls back to `Authorization` header.
- **Settings**: `config/settings/base.py` (production base); `config/settings/local.py` (dev, `DEBUG=True`). Always run dev with `DJANGO_SETTINGS_MODULE=config.settings.local`.

## Key conventions

- All budget data is user-scoped: every ViewSet uses `UserOwnedQuerySetMixin` which filters by `request.user` and auto-sets `user` on create.
- Income normalization to monthly: `biweekly * 26/12`, `weekly * 52/12`, `semimonthly * 2`, `annual / 12`.
- `IncomeSourceSerializer` exposes `monthly_equivalent` as a read-only computed field.
- `SummaryView` at `GET /api/budget/summary/?month=YYYY-MM` returns pre-aggregated dashboard data (income, expenses, spending, net, category breakdown).
- Frontend API client in `frontend/src/api/client.ts`: sends `Authorization: Bearer <token>` from localStorage; auto-refreshes on 401; clears tokens and redirects to `/login` on refresh failure.
- New Django apps go in `backend/apps/`. Register in `INSTALLED_APPS` as `apps.<name>`.
- Use `Decimal` (not float) for all monetary arithmetic in Python.
