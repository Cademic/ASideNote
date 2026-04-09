![ASideNote Logo](Docs/Images/ASideNoteTransparent.png)

A productivity web application featuring a visual cork board dashboard where users can create sticky notes, index cards, and connect ideas with red string links -- all in a rich, interactive workspace.

**Live:** [https://asidenote.net](https://asidenote.net)

![ASideNote Dashboard](Docs/Images/ASideNoteDashboard.png)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [API Endpoints](#api-endpoints)
- [Deployment](#deployment)
- [CI/CD](#cicd)
- [Documentation](#documentation)
- [Future Plans](#future-plans)

---

## Overview

ASideNote is a web-based productivity platform that combines note-taking, project planning, and visual organization on an interactive cork board. Users can drag sticky notes and index cards around a realistic board, connect related ideas with red string links (detective-board style), and format content with a full rich text editor including tables and checklists.

The application is built with a clean-architecture ASP.NET Core 8 backend and a React + TypeScript frontend, backed by PostgreSQL. It is deployed on Render with a custom domain, managed database, and integrated third-party services for authentication and email.

---

## Features

### Cork Board Dashboard

- Realistic cork board with wood-grain border and textured surface
- Drag items from the sidebar or use the floating add button
- Click any item to bring it to the front (z-index stacking)
- Light and dark mode support

### Sticky Notes

- Drag and drop positioning on the board
- 8-direction resize (120px min, 600px max)
- Rich text editing with TipTap (bold, italic, underline, strikethrough)
- Font family (Sans, Serif, Mono, Cursive) and font size (8--48px)
- Text color and text alignment (left, center, right)
- 6 color themes: Yellow, Pink, Blue, Green, Orange, Purple
- Rotation/tilt presets (-10 to +10 degrees)
- Character limits with counters (title: 100, content: 1,000)
- Delete confirmation for notes with content

### Index Cards

- Larger format (450x300 default, up to 800x600)
- Ruled lines that adapt to text size (like real index cards)
- Colored header band with red rule separator
- All sticky note features plus:
  - Table creation and editing (add/remove rows and columns)
  - Checklists / task lists with interactive checkboxes
  - Bullet and ordered lists
  - Horizontal dividers
- 6 distinct colors: White, Ivory, Sky, Rose, Mint, Lavender
- Higher content limit (10,000 characters)

### Red String Connections

- Click and drag between pins to link any two items
- Catenary (hanging string) curves rendered in SVG at 60fps
- Works between notes, cards, or across both types
- Hover to highlight; click to delete

### Sidebar Board Tools

- Drag a Sticky Note or Index Card icon from the sidebar onto the board
- Click the icon to create at a random position
- Collapsible sidebar with responsive icon/label layout

### Authentication and Security

- JWT-based login and registration with refresh token rotation
- Google OAuth 2.0 sign-in and account creation
- Email verification (strict mode -- blocks app access until verified)
- Role-based access control (RBAC)
- Rate limiting on authentication endpoints
- Security headers (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- Password hashing with Argon2id
- Protected routes with automatic redirect
- Persistent sessions via localStorage

### Email Verification

- Verification email sent on registration via Resend
- Token-based verification links with 24-hour expiry
- Single-use tokens
- Resend verification with 2-minute throttle
- Verified status displayed in user profile

### Projects and Organization

- Create and manage projects with color coding
- Organize notes into folders
- Tag system with color-coded labels
- Calendar view for events and deadlines
- Board management with multiple boards per user

### Theme System

- Light, dark, and system-preference modes
- CSS variable-based theming
- Smooth theme transitions (fast text fade, slightly slower surface-color fade)
- Respects `prefers-reduced-motion`
- Persistent user preference

---

## Technology Stack

### Frontend

| Technology          | Purpose                              |
|---------------------|--------------------------------------|
| React 18            | UI framework                         |
| TypeScript          | Type safety                          |
| Vite 7              | Build tool and dev server            |
| React Router DOM 6  | Client-side routing                  |
| Tailwind CSS 3      | Utility-first styling                |
| TipTap 3 (ProseMirror) | Rich text editing                |
| react-draggable     | Drag and drop positioning            |
| Axios               | HTTP client with auth interceptors   |
| Lucide React        | Icon library                         |

### Backend

| Technology          | Purpose                              |
|---------------------|--------------------------------------|
| ASP.NET Core 8      | Web API framework                    |
| Entity Framework Core 8 | ORM and migrations               |
| PostgreSQL 16       | Relational database                  |
| FluentValidation    | Request validation                   |
| Serilog             | Structured logging                   |
| JWT Bearer          | Authentication and authorization     |
| Argon2id            | Password hashing                     |
| Resend SDK          | Transactional email                  |
| Google OAuth 2.0    | Social login                         |
| Swagger / OpenAPI   | API documentation                    |
| DotNetEnv           | Environment variable loading (dev)   |

### Infrastructure

| Technology          | Purpose                              |
|---------------------|--------------------------------------|
| Render              | Hosting (static site, web service, managed Postgres) |
| Docker              | Backend containerization             |
| GitHub Actions      | CI/CD pipelines                      |
| Let's Encrypt       | TLS certificates (auto-provisioned)  |
| GoDaddy             | Domain registrar and DNS             |
| Resend              | Email delivery with SPF/DKIM/DMARC   |
| Google Cloud Console | OAuth 2.0 credential management     |

---

## Project Structure

```
ASideNote/
├── .github/
│   ├── workflows/
│   │   ├── backend-ci.yml         # Backend CI pipeline
│   │   ├── frontend-ci.yml        # Frontend CI pipeline
│   │   └── codeql.yml             # CodeQL SAST scanning
│   └── dependabot.yml             # Dependency update automation
├── Docs/
│   ├── Deployment/                # Deployment guides and runbooks
│   │   ├── DeploymentProcess.md   # End-to-end deployment walkthrough
│   │   ├── DeploymentRunbook.md   # Standard deploy/rollback procedures
│   │   ├── RenderProvisioning.md  # Render service configuration
│   │   ├── EnvironmentVariables.md# Environment variable reference
│   │   ├── DomainDNSSetup.md      # DNS and custom domain setup
│   │   ├── EmailDeliverability.md # Resend and email auth setup
│   │   ├── SecretsPolicy.md       # Secret rotation and management
│   │   ├── LaunchChecklist.md     # Pre/post-launch verification
│   │   ├── ObservabilityPlan.md   # Logging, monitoring, SLOs
│   │   ├── DatabaseHardening.md   # Backup, migrations, indexes
│   │   └── DataLifecyclePrivacy.md# PII, retention, GDPR baseline
│   ├── Images/                    # Screenshots and diagrams
│   ├── Implementations/           # Feature implementation summaries
│   └── Planning/                  # Project proposal and requirements
├── infra/
│   └── environments/              # Terraform env configs (planned)
├── Source/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── TableWorks.API/           # Controllers, middleware, startup
│   │   │   ├── TableWorks.Application/   # Services, DTOs, validators
│   │   │   ├── TableWorks.Core/          # Entities, enums, interfaces
│   │   │   └── TableWorks.Infrastructure/# DbContext, repos, migrations
│   │   ├── tests/
│   │   │   └── TableWorks.Tests/         # Unit and integration tests
│   │   ├── Dockerfile                    # Multi-stage Docker build
│   │   ├── .dockerignore
│   │   ├── docker-compose.yml            # Local PostgreSQL
│   │   └── ASideNote.sln
│   └── frontend/
│       ├── src/
│       │   ├── api/              # API client and interceptors
│       │   ├── components/       # React components
│       │   │   ├── auth/         # ProtectedRoute, GoogleSignInButton
│       │   │   ├── dashboard/    # CorkBoard, StickyNote, IndexCard, etc.
│       │   │   ├── calendar/     # ProjectCalendar
│       │   │   └── layout/       # AppLayout, Sidebar, Navbar
│       │   ├── context/          # Auth and Theme providers
│       │   ├── lib/              # TipTap custom extensions
│       │   ├── pages/            # Page components
│       │   ├── router/           # Route configuration
│       │   └── types/            # TypeScript interfaces
│       ├── public/               # Static assets
│       ├── package.json
│       └── vite.config.ts
└── README.md
```

---

## Getting Started

### Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 18+](https://nodejs.org/)
- [Docker](https://www.docker.com/) (for PostgreSQL)

### Backend

```bash
cd Source/backend

# Copy environment config
cp .env.example .env
# Edit .env with your local settings (database, JWT secret, Google OAuth, etc.)

# Start PostgreSQL via Docker
docker compose up -d

# Apply database migrations
dotnet ef database update \
  --project src/TableWorks.Infrastructure/ASideNote.Infrastructure.csproj \
  --startup-project src/TableWorks.API/ASideNote.API.csproj

# Run the API (default: http://localhost:5000)
dotnet run --project src/TableWorks.API/ASideNote.API.csproj
```

### Frontend

```bash
cd Source/frontend

# Install dependencies
npm install

# Start the dev server (default: http://localhost:5173)
npm run dev
```

The frontend dev server proxies `/api` requests to `http://localhost:5000`.

### Environment Variables

See [Docs/Deployment/EnvironmentVariables.md](Docs/Deployment/EnvironmentVariables.md) for the complete reference of all environment variables across development, staging, and production.

---

## Architecture

The backend follows **clean architecture** with four layers:

```
API Layer (Controllers, Middleware, Filters)
    ↓
Application Layer (Services, DTOs, Validators, Interfaces)
    ↓
Core Layer (Entities, Enums, Domain Interfaces)
    ↓
Infrastructure Layer (DbContext, Repositories, Migrations, External Services)
```

### Key Entities

| Entity         | Description                                      |
|----------------|--------------------------------------------------|
| User           | Authentication, preferences, roles               |
| Note           | Core content with position, size, color, rotation |
| IndexCard      | Extended note with tables, checklists            |
| Board          | Visual workspace containing notes and cards      |
| Project        | Collaborative projects with members              |
| Tag / NoteTag  | Categorization (many-to-many)                    |
| Folder         | Hierarchical organization                        |
| CalendarEvent  | Scheduled events and deadlines                   |
| Notification   | User notifications                               |
| AuditLog       | Activity tracking                                |
| RefreshToken   | JWT refresh token storage                        |
| ExternalLogin  | Google OAuth account linking                     |
| EmailVerificationToken | Email verification flow                   |

### Frontend State Management

- **React Context API** for global state (auth, theme, preferences)
- **Component-level useState** for UI state
- **Optimistic updates** with background API persistence
- **Axios interceptors** for automatic token attachment and refresh
- **No global store library** -- state is co-located with the components that use it

---

## API Endpoints

| Area           | Endpoints                                         |
|----------------|---------------------------------------------------|
| Auth           | `POST /auth/login`, `/register`, `/refresh`, `/logout`, `/google`, `/verify-email`, `/resend-verification` |
| Notes          | `GET/POST /notes`, `GET/PATCH/DELETE /notes/:id`  |
| Index Cards    | `GET/POST /index-cards`, `PATCH/DELETE /index-cards/:id` |
| Boards         | `GET/POST /boards`, `GET/PUT/DELETE /boards/:id`  |
| Projects       | `GET/POST /projects`, `GET/PUT/DELETE /projects/:id` |
| Folders        | `GET/POST /folders`, `GET/PUT/DELETE /folders/:id` |
| Tags           | `GET/POST /tags`, `GET/PUT/DELETE /tags/:id`      |
| Calendar Events| `GET/POST /calendar-events`, `GET/PUT/DELETE /calendar-events/:id` |
| Notifications  | `GET /notifications`, `PATCH /notifications/:id`  |
| Admin          | `GET /admin/users`, `GET /admin/notes`            |
| Health         | `GET /health/live`, `GET /health/ready`           |

Full API documentation is available via Swagger at `/swagger` when the backend is running in Development or Staging mode.

---

## Deployment

ASideNote is deployed on **Render** with auto-deploy from the `main` branch.

| Service | Type | URL |
|---------|------|-----|
| Frontend | Static Site | [https://asidenote.net](https://asidenote.net) |
| API | Web Service (Docker) | [https://api.asidenote.net](https://api.asidenote.net) |
| Database | Managed PostgreSQL | Internal connection |

### How to Deploy Changes

1. Make changes locally and test.
2. Commit and push to the `main` branch.
3. Render auto-deploys both services (frontend: 1-3 min, backend: 2-5 min).
4. Database migrations run automatically via the pre-deploy command.

For the full deployment process, setup instructions, and troubleshooting guide, see [Docs/Deployment/DeploymentProcess.md](Docs/Deployment/DeploymentProcess.md).

---

## CI/CD

### GitHub Actions Pipelines

| Workflow | Trigger | Steps |
|----------|---------|-------|
| Backend CI | Push/PR to `main` affecting `Source/backend/**` | Restore → Build → Migrate → Test |
| Frontend CI | Push/PR to `main` affecting `Source/frontend/**` | Install → Lint → Build |
| CodeQL | Push/PR to `main` | Static analysis security scanning |
| Dependabot | Automated | Weekly dependency update PRs |

### Render Auto-Deploy

Both Render services (frontend static site and API web service) are configured to auto-deploy when the `main` branch receives a push. The API pre-deploy command applies any pending database migrations before the new code starts serving traffic.

---

## Documentation

Detailed documentation is available in the `Docs/` directory:

### Planning

| Document | Description |
|----------|-------------|
| [Project Proposal](Docs/Planning/ProjectProposal.md) | Architecture, data model, API design, UI/UX principles |
| [Project Requirements](Docs/Planning/ProjectRequirements.md) | User stories, functional and non-functional requirements |

### Implementation

| Document | Description |
|----------|-------------|
| [Dashboard Implementation](Docs/Implementations/DashboardImplementationSummary.md) | Cork board, sticky notes, drag/resize, rich text editing |
| [Red String Implementation](Docs/Implementations/RedStringImplementationSummary.md) | Visual connections between notes with SVG rendering |
| [Index Card Implementation](Docs/Implementations/IndexCardImplementaionSummary.md) | Index cards with tables, checklists, ruled lines, sidebar tools |

### Deployment

| Document | Description |
|----------|-------------|
| [Deployment Process](Docs/Deployment/DeploymentProcess.md) | End-to-end deployment walkthrough with troubleshooting |
| [Deployment Runbook](Docs/Deployment/DeploymentRunbook.md) | Standard deploy, rollback, and incident procedures |
| [Render Provisioning](Docs/Deployment/RenderProvisioning.md) | Render service configuration guide |
| [Environment Variables](Docs/Deployment/EnvironmentVariables.md) | Complete environment variable reference |
| [Domain and DNS Setup](Docs/Deployment/DomainDNSSetup.md) | Custom domain and DNS configuration |
| [Email Deliverability](Docs/Deployment/EmailDeliverability.md) | Resend setup with SPF/DKIM/DMARC |
| [Secrets Policy](Docs/Deployment/SecretsPolicy.md) | Secret management and rotation procedures |
| [Launch Checklist](Docs/Deployment/LaunchChecklist.md) | Pre and post-launch verification checklist |
| [Observability Plan](Docs/Deployment/ObservabilityPlan.md) | Logging, monitoring, and SLO targets |
| [Database Hardening](Docs/Deployment/DatabaseHardening.md) | Backup, migration safety, and index review |
| [Data Lifecycle and Privacy](Docs/Deployment/DataLifecyclePrivacy.md) | PII inventory, retention, and compliance baseline |

---

## Future Plans

- Desktop application (Electron or Tauri)
- iOS mobile application
- Real-time collaboration on projects
- Note table view with sorting and filtering
- Full-text search across notes
- Production environment (promote from staging)
- Centralized log drain (Datadog, Better Stack)
- External uptime monitoring
- User data export and account deletion (GDPR)
