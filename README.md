# Spherespace

Spherespace is a real-time social platform focused on creators and communities. It combines a performant React + TypeScript frontend with a robust Django REST + Channels backend to provide instant messaging, verified creator badges, payments, and creator analytics.

**Spherespace — Where People Connect**

**Key Features:**
- **Real-time chat:** WebSocket-based messaging using Django Channels and Daphne.
- **Verified badges & payments:** Integration-ready payment flows (Paystack / USD pricing) for verification tiers.
- **Creator analytics:** Lightweight analytics dashboards for creators (views, likes, engagement).
- **Social primitives:** Profiles, following, message requests, read receipts, typing indicators.
- **Modern frontend:** Vite + React + TypeScript + TanStack Query for fast UX.

**Tech Stack:**
- Backend: Django 5, Django REST Framework, Django Channels, Daphne
- Frontend: React, TypeScript, Vite, Tailwind CSS
- Database: SQLite/Postgres (configurable via `DATABASE_URL`)
- Channel layer: In-memory (dev) or Redis (production)

**Project Structure (high level):**
- `my_project/` — Django project
- `users/` — User, profile, and chat models + APIs + WebSocket consumers
- `blog/` — Blog app and content
- `frontend/` — React app (Vite) in `frontend/`

**Quick Start (development)**

Prerequisites:
- Python 3.11+
- Node 18+
- Redis (optional, for production websocket scaling)

Backend

1. Create & activate virtualenv:

```bash
python -m venv venv
# Windows
venv\\Scripts\\activate
# macOS / Linux
source venv/bin/activate
```

2. Install Python deps:

```bash
pip install -r requirements.txt
```

3. Run migrations & create a superuser:

```bash
python manage.py migrate
python manage.py createsuperuser
```

4. Run the development ASGI server (Daphne) to support WebSockets:

```bash
# Development (Daphne)
daphne -b 127.0.0.1 -p 8000 my_project.asgi:application
# or using manage.py runserver which will use Daphne when channels installed
python manage.py runserver
```

Frontend

1. Install dependencies and start dev server:

```bash
cd frontend
npm install
npm run dev
```

2. Open the app at the Vite dev URL (usually `http://localhost:5173`) and backend at `http://127.0.0.1:8000`.

**Environment Variables (examples)**
- `DJANGO_SECRET_KEY`
- `DJANGO_DEBUG` (True/False)
- `DATABASE_URL` (optional)
- `REDIS_URL` (for channels_redis)
- `PAYSTACK_SECRET_KEY` (payments)

**Important Files / Components**
- `users/models.py` — `Profile`, `Conversation`, `DirectMessage`
- `users/api.py` — REST endpoints for conversations, messages, requests
- `users/consumers.py` — `ChatConsumer` for WebSocket messaging
- `my_project/asgi.py` — ASGI routing + Channels integration
- `frontend/src/hooks/useChatWebSocket.ts` — frontend WebSocket hook
- `frontend/src/components/Chat.tsx` — chat UI integrated with WebSocket connection

**WebSocket / Real-time Notes**
- WebSocket endpoint: `/ws/chat/?token=<jwt>`
- Backend pushes: `new_message`, `typing`, `messages_read`, etc.
- Frontend falls back to polling for resilience (TanStack Query polling) if WebSocket is unavailable.

**Deployment Tips**
- Use `daphne` or an ASGI server + process manager (systemd, supervisord).
- Use `channels_redis` with Redis for the `CHANNEL_LAYERS` backend in production.
- Serve static files via CDN or `whitenoise` + proper collectstatic configuration.
- Use HTTPS and ensure WebSocket uses `wss://` in production.

**Roadmap (short term)**
- Group/DM search and message threading
- Media message uploads (images, voice) with resumable uploads
- Presence improvements (accurate last-seen, multi-device presence)
- Rich reactions & message editing
- Admin tools for verified badge management

**Contributing**
- Fork the repo, make a feature branch, open PRs to `main`.
- Keep changes small and add tests for backend logic where applicable.


This README is a living document — we can expand it with diagrams, API examples, and a contributor guide when you want to publish or onboard collaborators.

## Docs

Additional developer docs and diagrams are available in the `docs/` folder:

- `docs/architecture.svg` — high-level architecture diagram (frontend → ASGI/Daphne → Channels → DB/Redis).
- `docs/websocket-sequence.svg` — sequence diagram for a WebSocket message flow.
- `docs/api.md` — REST + WebSocket examples (curl, fetch, WebSocket snippets).

Open these files for diagrams and copyable API examples to help onboard contributors or flesh out API clients.
