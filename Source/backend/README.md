# ASideNote Backend

ASP.NET Core 8 Web API with PostgreSQL via Entity Framework Core.

## Prerequisites

- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Docker](https://docs.docker.com/get-docker/) (for local PostgreSQL)
- `dotnet-ef` CLI tool: `dotnet tool install --global dotnet-ef`

## Quick Start

### 1. Start PostgreSQL

```bash
# Copy environment defaults
cp .env.example .env

# Start the database container
docker compose up -d

# Verify it is healthy
docker compose ps
```

### 2. Apply Migrations

From `Source/backend/`, run (single line; works in PowerShell and bash):

```bash
dotnet ef database update --project src/TableWorks.Infrastructure/ASideNote.Infrastructure.csproj --startup-project src/TableWorks.API/ASideNote.API.csproj
```

### 3. Run the API

```bash
dotnet run --project src/TableWorks.API/ASideNote.API.csproj
```

The API is available at `https://localhost:5001` (or `http://localhost:5000`).
Swagger UI: `http://localhost:5000/swagger`

### 3b. Playwright (for server-side PDF export on localhost)

Server-side notebook PDF export uses Playwright (Chromium). Install it once after building.

**Important:** All commands below must be run from the backend root (e.g. `d:\Projects\ASideNote\Source\backend`), not from System32 or another folder.

```powershell
# 1. Go to the backend folder (use your actual path)
cd d:\Projects\ASideNote\Source\backend

# 2. Build the API so the Playwright script and DLL are in the output
dotnet build src/TableWorks.API/ASideNote.API.csproj

# 3. Install Chromium (PowerShell Core)
pwsh -File src/TableWorks.API/bin/Debug/net8.0/playwright.ps1 install chromium
```

If you don’t have PowerShell Core (`pwsh`), use Windows PowerShell in step 3:

```powershell
powershell -ExecutionPolicy Bypass -File src/TableWorks.API/bin/Debug/net8.0/playwright.ps1 install chromium
```

On **Linux/macOS**, from the backend root:

```bash
pwsh src/TableWorks.API/bin/Debug/net8.0/playwright.ps1 install --with-deps chromium
```

After this, exporting a notebook as PDF via the API will work locally.

### 4. Seed the Database (optional)

```bash
dotnet run --project src/TableWorks.API/ASideNote.API.csproj -- --seed
```

Seeding creates a legacy admin record (no password login) and, when the app has a password hasher available, **two verified Admin** and **two verified User** accounts for localhost:

| Username   | Email                 | Role  | Password    |
|------------|----------------------|-------|-------------|
| `admin1`   | `admin1@localhost`   | Admin | `Password1!` |
| `admin2`   | `admin2@localhost`   | Admin | `Password1!` |
| `testuser1`| `testuser1@localhost`| User  | `Password1!` |
| `testuser2`| `testuser2@localhost`| User  | `Password1!` |

## Docker Compose Commands

| Action | Command |
|--------|---------|
| Start services | `docker compose up -d` |
| Stop services | `docker compose down` |
| View logs | `docker compose logs -f postgres` |
| Reset database volume | `docker compose down -v` |
| Start with pgAdmin | `docker compose --profile tools up -d` |

## EF Core Migration Commands

All commands run from the `Source/backend/` directory. Use single-line commands in PowerShell (avoid `\` line continuation).

```powershell
# Create a new migration
dotnet ef migrations add <MigrationName> --project src/TableWorks.Infrastructure/ASideNote.Infrastructure.csproj --startup-project src/TableWorks.API/ASideNote.API.csproj --output-dir Data/Migrations

# Apply all pending migrations
dotnet ef database update --project src/TableWorks.Infrastructure/ASideNote.Infrastructure.csproj --startup-project src/TableWorks.API/ASideNote.API.csproj

# List applied and pending migrations
dotnet ef migrations list --project src/TableWorks.Infrastructure/ASideNote.Infrastructure.csproj --startup-project src/TableWorks.API/ASideNote.API.csproj

# Rollback the latest migration
dotnet ef migrations remove --project src/TableWorks.Infrastructure/ASideNote.Infrastructure.csproj --startup-project src/TableWorks.API/ASideNote.API.csproj
```

**If the database isn't updating:**

1. Run from **`Source/backend/`** (the folder that contains `src/`). Paths are relative to the current directory.
2. Check pending migrations: run `dotnet ef migrations list ...` (same project/startup-project). Pending migrations show `(Pending)`.
3. Ensure the startup project uses the same connection as your app (same `appsettings.json` and `.env`; the API loads `.env` from the current directory when you run the command).

## Environment Variables

The API reads from `appsettings.json` but allows env-var overrides:

| Variable | Default | Purpose |
|----------|---------|---------|
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `asidenote` | Database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | `postgres` | Database password |

## Deploying to Render

The API Dockerfile uses the **Playwright .NET** base image (`mcr.microsoft.com/playwright/dotnet:v1.58.0-noble`) so server-side PDF export (notebooks) works without extra install steps. Render runs the container; no per-user install is needed.

1. **Create a Web Service** on [Render](https://render.com), connect your repo, and set:
   - **Root Directory:** `Source/backend`
   - **Environment:** Docker
   - Render will build with the Dockerfile in that directory and run the container.

2. **Environment variables:** Set your production env vars in the Render dashboard (e.g. `DATABASE_URL` or `DB_*`, `JWT_SECRET`, `R2__*` for images, etc.). Use Render’s **Internal Database** or an external PostgreSQL URL.

3. **Optional – if Chromium runs out of memory** during PDF export, add a Docker run option in Render: **Settings → Advanced → Docker Command** (or the equivalent “Docker run arguments”). Add `--ipc=host` if your plan supports it. Otherwise increase the instance size.

4. **Port:** The Dockerfile exposes `10000`; Render’s default for Docker is port 10000, so no change needed unless you override it.

## Development Notes

- In `Development` environment, migrations are auto-applied on startup (`Database:ApplyMigrationsOnStartup`).
- In `Production`, migrations must be applied explicitly via the CLI or CI pipeline.
- The `.env` file is git-ignored. Copy `.env.example` and adjust for your local setup.
