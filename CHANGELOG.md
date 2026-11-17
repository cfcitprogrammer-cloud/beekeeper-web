# Changelog

All notable changes to this project are documented here. Entries are grouped by feature area.

## [Unreleased] — Workspace, usage lifecycle, account & UX

### Workspace switching
- Workspace switcher in the app shell is now functional instead of cosmetic.
- Active workspace is persisted in an `active_workspace_id` cookie (1-year lifetime) and honored by `getAccessContext`.
- Switching workspaces triggers a full reload so all server data refreshes.
- Active workspace is restored on page refresh (no longer resets to the first workspace).
- Production pipelines, stages, usage, expenses, visits, outlets, bookings, attendance, leave requests, employee schedules, approval templates, and master data (SKUs, SKU categories, inventory UOMs, departments, positions, shifts, leave types, expense categories, production stages/stage-SKUs, production usage settings) are now scoped by the active workspace. Company-wide rows (`workspace_id IS NULL`) remain visible in every workspace.
- Reads and create actions tag new records with the active workspace where applicable.

### Production usage lifecycle
- Replaced hard deletes with a lifecycle `status`: `submitted`, `completed` (derived once the cutoff passes), `cancelled`.
- Usage editor (`/production/usage-editor`) gained a critical-module warning banner, status badges/column, cancel/restore actions (with BOM cascade), bulk cancel/restore, and a per-line changelog history dialog.
- Submitted usage can be edited by its submitter before the cutoff when `allow_submitter_edit` is enabled (quantities, date, notes, or marking as cancellation).
- Duplicate submissions for the same stage + SKU + usage date are blocked unless `allow_duplicates` is enabled; cancelled usage no longer blocks a new submission.
- Import now updates existing lines **and** adds non-existent lines, subject to the configured rules, and writes `import` changelog entries. Import conflicts offer "Mark cancellation" instead of delete.
- CSV export/import headers include `status`; a downloadable import template is available.
- `completed` is derived from the configured cutoff (days + time).

### Production usage settings (`/production/usage-settings`)
- New configuration module guarded by `production.editor`: cutoff days, cutoff time, allow submitter edit, allow duplicates.
- Sidebar, global search, breadcrumb, and route-permission entries added.

### Usage audit trail
- New `production_usage_changelog` table records `created`, `updated`, `cancelled`, `restored`, `import`, `submitter_updated`, and `submitter_cancelled` actions with previous/new values, actor, timestamp, and reason.
- `getProductionUsageChangelog` action and a history dialog in the editor.

### Account settings
- New `/account` page with change-password form and theme selector (Light / Dark / System).
- `changePassword` server action via Supabase `auth.updateUser`.

### Navigation & UX
- Full-page loading overlay on navigational link clicks (`NavigationLoader`).
- Dashboard gained recharts graphs (booking pipeline bar chart, outlet coverage pie chart).
- Toast system supports `type: "loading"` for long-running actions.

### Permission & schema
- Added `production.editor` permission with migration and route/sidebar/search wiring.
- Migrations: `20261119_production_editor_permission.sql`, `20261120_production_usage_lifecycle.sql`, `20261121_sku_workspace.sql`, `20261122_workspace_scoping.sql`.
- `db/reset.sql` updated with the new migration order.

### Notes
- Next.js build reports a known security vulnerability in the installed version and recommends upgrading; run `next upgrade --agent=security` if desired.
- Some modules still query directly in pages/actions and may need the same workspace-scoping treatment; reads in `lib/data` are scoped.
- Create actions for a few entities still default `workspace_id` to `null` (company-wide) until updated.
