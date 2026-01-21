# 🌐 Spherespace

> **Where People Connect** — A real-time social platform for creators and communities

Spherespace combines a blazing-fast React + TypeScript frontend with a robust Django REST + Channels backend to deliver real-time messaging, verified creator badges, payments, gamification, and creator analytics.

---

## 🎯 Features Overview

| Category | Features |
|----------|----------|
| **Social** | User profiles, following, posts, comments, communities |
| **Real-time Chat** | WebSocket messaging, typing indicators, read receipts, message requests |
| **Gamification** | 🏆 Achievement badges, 🔥 activity streaks, karma system |
| **Creators** | Verified badges, analytics dashboard, payment integration |
| **Live Streaming** | 📹 Real-time broadcasting, chat overlay, floating hearts, host controls |
| **UI/UX** | Dark/light themes, skeleton loading, micro-interactions, glassmorphism |

---

## 🏗️ Architecture

```mermaid
graph TB
    subgraph Frontend["Frontend (React + Vite)"]
        UI[React Components]
        TQ[TanStack Query]
        WS[WebSocket Hook]
    end
    
    subgraph Backend["Backend (Django)"]
        DRF[Django REST Framework]
        CH[Django Channels]
        DA[Daphne ASGI]
    end
    
    subgraph Data["Data Layer"]
        PG[(PostgreSQL)]
        RD[(Redis)]
        S3[AWS S3 / Cloudinary]
    end
    
    UI --> TQ --> DRF
    UI --> WS --> CH --> DA
    DRF --> PG
    CH --> RD
    DRF --> S3
```

---

## 📁 Project Structure

```
my_project/
├── my_project/          # Django project settings
│   ├── settings.py
│   ├── urls.py
│   └── asgi.py          # Channels/WebSocket routing
├── users/               # User management
│   ├── models.py        # Profile, Follow, Conversation, DirectMessage, UserAchievement
│   ├── api.py           # REST endpoints
│   └── consumers.py     # WebSocket consumers
├── blog/                # Content management
│   ├── models.py        # Post, Comment, Community
│   └── api.py           # Posts, comments, communities API
├── payments/            # Paystack integration
│   └── api.py           # Payment flows
└── frontend/            # React application
    ├── src/
    │   ├── components/  # UI components
    │   ├── pages/       # Page components
    │   ├── hooks/       # Custom hooks
    │   └── api.ts       # API client
    └── index.html
```

---

## 🏆 Achievements System

The platform includes a gamification layer with automatic achievement detection:

```mermaid
flowchart LR
    A[User Action] --> B{Check Conditions}
    B -->|Post Created| C[first_post / rising_star]
    B -->|Received Likes| D[karma_king]
    B -->|Daily Login| E[week_warrior]
    B -->|Joined Community| F[community_builder]
    B -->|Gained Followers| G[social_butterfly]
    
    C --> H[Award Achievement]
    D --> H
    E --> H
    F --> H
    G --> H
    
    H --> I[Show Celebration 🎉]
```

### Available Achievements

| Achievement | Trigger | Badge |
|-------------|---------|-------|
| First Post | Publish 1 post | 🚀 |
| Rising Star | Publish 10 posts | ⭐ |
| Karma King | Reach 100 karma | 👑 |
| Week Warrior | 7-day activity streak | 🔥 |
| Community Builder | Join 5 communities | 🏘️ |
| Social Butterfly | Reach 50 followers | 🦋 |

### API Endpoints

```bash
# Get pending (unshown) achievements
GET /api/achievements/pending/

# Mark achievement as shown
POST /api/achievements/mark-shown/
{"achievement_id": "week_warrior"}

# Get all earned achievements
GET /api/achievements/
```

---

## 💬 Real-time Chat

```mermaid
sequenceDiagram
    participant U1 as User A
    participant WS as WebSocket Server
    participant U2 as User B
    
    U1->>WS: Connect /ws/chat/
    U2->>WS: Connect /ws/chat/
    U1->>WS: send_message {to: "userB", content: "Hey!"}
    WS->>U2: new_message {from: "userA", content: "Hey!"}
    U2->>WS: mark_read {message_id: "123"}
    WS->>U1: messages_read {ids: ["123"]}
```

---

## 🚀 Quick Start

### Option 1: Docker (Recommended)

The easiest way to run the full stack locally.

**Run Everything in Docker:**
```bash
# Development mode (with backend hot-reload)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Production mode (full simulation)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

**Mixed Mode (Best for Development):**
*Run backend in Docker + frontend locally for fastest React hot-reloading.*

1. **Terminal 1 (Backend):**
   ```bash
   docker compose up --build
   ```
2. **Terminal 2 (Frontend):**
   ```bash
   cd frontend
   npm run dev
   ```

**Services:**
| Service | Dev URL | Local Port | Host Port | Description |
|---------|---------|------------|-----------|-------------|
| Frontend | http://localhost:5173 | 5173 | 5173 | React + Vite (Mixed Mode) |
| Frontend | http://localhost | 80 | 80 | Nginx Production Build |
| Backend | http://localhost:8000 | 8000 | 8000 | Django REST API (Gunicorn) |
| Database | localhost:5432 | 5432 | 5433 | PostgreSQL |
| Redis | localhost:6379 | 6379 | 6380 | Caching & WebSockets |

### Option 2: Manual Setup

#### Prerequisites
- Python 3.12+
- Node.js 20+
- PostgreSQL (optional, SQLite default)
- Redis (optional, for WebSocket scaling)

#### Backend Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/macOS
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create admin user
python manage.py createsuperuser

# Start server
python manage.py runserver
```

#### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

**Access:**
- Frontend: http://localhost:5173
- Backend API: http://127.0.0.1:8000/api/
- API Docs: http://127.0.0.1:8000/api/docs/

---

## 📖 API Documentation

The Spherespace API includes interactive documentation powered by **OpenAPI/Swagger**.

| URL | Description |
|-----|-------------|
| `/api/docs/` | **Swagger UI** — Interactive API documentation |
| `/api/redoc/` | **ReDoc** — Alternative documentation view |
| `/api/schema/` | Raw OpenAPI JSON schema |
| `/api/` | DRF Browsable API |

### Using the API Docs

1. **Explore endpoints** — Browse all available API routes organized by category
2. **Try it out** — Test endpoints directly in the browser
3. **View schemas** — See request/response formats for each endpoint
4. **Authentication** — Use the "Authorize" button to add session credentials

### Key API Endpoints

```bash
# Authentication
POST /api/auth/login/
POST /api/auth/register/
POST /api/auth/logout/
GET  /api/auth/user/

# Posts & Content
GET  /api/posts/
POST /api/posts/
GET  /api/posts/{slug}/

# Communities
GET  /api/communities/
POST /api/communities/{slug}/join/

# Messaging
GET  /api/conversations/
POST /api/conversations/{id}/messages/

# Achievements
GET  /api/achievements/
GET  /api/achievements/pending/

# Livestreams
GET  /api/streams/
POST /api/streams/              # Create stream
POST /api/streams/{id}/go_live/ # Start broadcasting
POST /api/streams/{id}/end_stream/
DELETE /api/streams/{id}/delete_stream/
```

## ⚙️ Environment Variables

Create a `.env` file in the project root:

```env
# Django
DJANGO_SECRET_KEY=your-secret-key
DJANGO_DEBUG=True

# Database (optional, defaults to SQLite)
DATABASE_URL=postgres://user:pass@localhost:5432/spherespace

# Redis (for production)
REDIS_URL=redis://127.0.0.1:6379

# AWS S3 (for media storage)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_STORAGE_BUCKET_NAME=

# Payments
PAYSTACK_SECRET_KEY=sk_test_xxx
PAYSTACK_PUBLIC_KEY=pk_test_xxx

# Email
EMAIL_HOST_USER=your@email.com
EMAIL_HOST_PASSWORD=app-password
```

---

## 📊 Scalability

| Component | Current | At Scale (1M+ users) |
|-----------|---------|----------------------|
| Database | SQLite / PostgreSQL | PostgreSQL + Read Replicas |
| Caching | None | Redis |
| Channel Layer | In-Memory | Redis |
| Media Storage | Local / Cloudinary | AWS S3 + CloudFront CDN |
| Task Queue | Sync | Celery + Redis |

### Production Recommendations

```python
# settings.py - Production caching
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL'),
    }
}

# Channel layers with Redis
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [os.environ.get('REDIS_URL')],
        },
    },
}
```

---

## 🎨 UI Features

### Micro-interactions
- **Like button**: Heartbeat animation on click
- **Save button**: Pop bounce animation
- **Emoji reactions**: Colored tint + label display

### Skeleton Loading
Shimmer loading states across all pages for premium feel.

### Theme Support
- 🌙 Dark mode
- ☀️ Light mode
- System preference detection

### Live Experience
- **Glassmorphism**: Premium transparent overlays for stream controls
- **Custom Modals**: Apple-style confirmation dialogs for critical actions
- **Interactive**: Real-time hearts and chat overlay

---

## 🛣️ Roadmap

- [ ] Push notifications
- [ ] Voice/video calling
- [ ] Stories feature
- [ ] AI content recommendations
- [ ] Creator monetization tools
- [ ] Mobile apps (React Native)

---

## 🔄 CI/CD & DevOps

This project uses **GitHub Actions** for robust automated testing and deployment.

### 🛠️ Workflows
| Workflow | Trigger | Description |
|----------|---------|-------------|
| **CI Pipeline** | `push`, `pull_request` | Runs backend tests (pytest), frontend tests, lints, and builds Docker images. |
| **CodeQL Security** | `push`, `schedule` | Advanced security scanning for Python and Javascript vulnerabilities. |
| **Release** | `tag` (v*) | Automatically builds production Docker images, pushes to DockerHub, and creates a GitHub Release. |
| **Dependabot** | `daily` | Automatically checks and creates PRs for outdated pip and npm dependencies. |

### 🐳 Docker Architecture
* **Multi-stage builds** for optimized image sizes (Backend < 200MB).
* **Non-root users** for security.
* **Health checks** enabled for all services.
* **Docker Compose Watch** configured for backend hot-reloading in dev.

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 📚 Additional Docs

See the `docs/` folder for:
- `architecture.svg` — System architecture diagram
- `websocket-sequence.svg` — WebSocket message flow
- `api.md` — REST & WebSocket API examples

