-- Use when: API returns 500 on api/v1/projects, api/v1/calendar-events, api/v1/notebooks, or api/v1/admin/users.
-- Cause: __EFMigrationsHistory was updated (e.g. via mark-notebooks-migration-applied.sql) but the actual
-- schema changes were never applied, so the database is missing columns the app expects.
--
-- This script adds the missing columns idempotently. Safe to run multiple times.
--
-- Usage: Connect to database "asidenote" (e.g. pgAdmin Query Tool or psql), then run this script.

-- Projects: show project events on main calendar (default false)
ALTER TABLE "Projects"
ADD COLUMN IF NOT EXISTS "ShowEventsOnMainCalendar" boolean NOT NULL DEFAULT false;

ALTER TABLE "Projects"
ADD COLUMN IF NOT EXISTS "OwnerShowOnPersonalCalendar" boolean NULL;

ALTER TABLE "ProjectMembers"
ADD COLUMN IF NOT EXISTS "ShowOnPersonalCalendar" boolean NULL;

-- Notebooks: TipTap document JSON (replaces NotebookPages)
ALTER TABLE "Notebooks"
ADD COLUMN IF NOT EXISTS "ContentJson" jsonb NOT NULL DEFAULT '{"type":"doc","content":[]}'::jsonb;
