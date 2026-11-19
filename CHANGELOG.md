# Changelog

All notable changes to this project are documented here. Entries are grouped by feature area.

## [Unreleased] — Workspace, usage lifecycle, account & UX

### Workspace switching
- Workspace switcher in the app shell is now functional instead of cosmetic.
- Switching workspaces shows a full-page “Changing workspace…” overlay with the target workspace name until the app reloads with the new data.
- If the switch fails, the overlay closes, the previous workspace is restored, and an error toast explains why.
- Active workspace is persisted in an `active_workspace_id` cookie (1-year lifetime) and honored by `getAccessContext`.
- Active workspace is restored on page refresh (no longer resets to the first workspace).
- Non-Super-Admin users can only activate workspaces they are assigned to (or their employee workspace); the server action rejects anything else.
- Production pipelines, stages, usage, expenses, visits, outlets, bookings, attendance, leave requests, employee schedules, approval templates, and master data (SKUs, SKU categories, inventory UOMs, departments, positions, shifts, leave types, expense categories, production stages/stage-SKUs, production usage settings) are now scoped by the active workspace. Company-wide rows (`workspace_id IS NULL`) remain visible in every workspace.
- Reads and create actions tag new records with the active workspace where applicable.

### Workspace visibility (`/workspaces/access`)
- New Super Admin module for assigning which workspaces each user can see and switch to.
- Users are listed with their company role and workspace chips; clicking a chip grants or revokes access immediately.
- Super Admins always have full access and are shown read-only.
- An empty selection means “all workspaces” (legacy default); use “All workspaces” to reset.
- The switcher and `setActiveWorkspace` now enforce the assignment, and the sidebar only lists workspaces the signed-in user may open.

### Production usage lifecycle
- Replaced hard deletes with a lifecycle `status`: `submitted`, `completed` (derived once the cutoff passes), `cancelled`.
- Usage editor (`/production/usage-editor`) gained a critical-module warning banner, status badges/column, cancel/restore actions (with BOM cascade), bulk cancel/restore, and a per-line changelog history dialog.
- The editor table is paginated (10 / 25 / 50 / 100 rows per page) with range and page controls, and the SKU filter is a free-text SKU-code search instead of a SKU dropdown.
- The production audit report now uses the same free-text SKU-code filter (case-insensitive partial match) instead of a SKU dropdown.
- The production audit report now shows each SKU's production warehouse and includes it in CSV, Excel and PDF exports.
- Submitted usage can be edited by its submitter before the cutoff when `allow_submitter_edit` is enabled (quantities, date, notes, or marking as cancellation).
- Duplicate submissions for the same stage + SKU + usage date are blocked unless `allow_duplicates` is enabled; cancelled usage no longer blocks a new submission.
- Import now updates existing lines **and** adds non-existent lines, subject to the configured rules, and writes `import` changelog entries. Import conflicts offer "Mark cancellation" instead of delete.
- CSV export/import headers include `status`; a downloadable import template is available.
- `completed` is derived from the configured cutoff (days + time).

### Production usage settings (`/production/usage-settings`)
- New configuration module guarded by `production.editor`: cutoff days, cutoff time, allow submitter edit, allow duplicates.
- Sidebar, global search, breadcrumb, and route-permission entries added.
- Settings are now loaded for the signed-in user's company, so users who belong to more than one company always see (and edit) the values for the company they saved.
- The cutoff is evaluated in the company's timezone (`companies.timezone`) on both the server and the client, so a “10:25” cutoff no longer fires eight hours late on a UTC server for an `Asia/Manila` company.
- The cutoff now blocks new usage submissions for dates past the cutoff unless the user is a usage editor; usage editors can still backfill and correct completed entries.
- Submitters can no longer move an in-window line to a date that is past the cutoff.
- The usage date on the record form defaults to today in the company timezone (not the server's UTC date) and shows when the selected date is locked.
- The settings form shows the company timezone next to the cutoff time and remounts after a save so the server's normalized values are always displayed.

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

### Inventory warehouses
- New `/inventory/warehouses` module for managing warehouse master data (code, name, address, contact details, notes, status). Warehouses are workspace-scoped and use the existing inventory permissions.
- Added an optional **Production warehouse** field to SKUs. It is a simple label that records which production warehouse an item belongs to and does not affect stock, availability or bookings.
- SKU detail and catalog show the assigned production warehouse, and the SKU form links straight to warehouse management.
- Catalog CSV import/export now includes a `production_warehouse` column; imports match by warehouse code or name and require the warehouse to exist first.
- Migration: `20261123_inventory_warehouses.sql`.

### Warehouse stock management
- Warehouses now hold live stock: on-hand balances per `(warehouse, SKU)` backed by an append-only movement ledger.
- Warehouse detail (`/inventory/warehouses/[id]`) shows stock on hand, movement history, and a record-movement dialog for receipts, issues, adjustments and transfers.
- New `/inventory/stock` overview lists on-hand balances across warehouses with totals, per-warehouse filtering and a record-movement action.
- SKU detail shows stock by warehouse, with links into each warehouse.
- Stock changes require `inventory.update`; viewing requires `inventory.view`. Movements run through atomic Postgres functions so balances and ledger entries stay in sync, and insufficient stock is rejected.
- Warehouses with positive stock or movement history can no longer be deleted; deactivate them instead to preserve the audit trail.
- The production warehouse label on SKUs remains independent of stock and never affects balances.
- Warehouses now support **Import** (CSV) and **Export** (CSV, Excel, PDF) from the warehouse directory, matching the SKU catalog flow.
- Migration: `20261124_warehouse_stock.sql`.

### SKU catalog mass import & export
- The SKU catalog toolbar now has an **Import** menu with two mass-import flows: **SKU catalog** and **BOM & components**.
- SKU catalog import matches rows by `sku_code`; blank cells preserve existing values, new SKUs default to price/tax `0`, active, and `PCS`. Category names resolve automatically and missing categories are created.
- BOM import matches rows by `parent_sku_code` + `component_sku_code`, updates quantities, rejects self-references and non-positive quantities, and reports unknown or cross-workspace SKUs.
- Both imports accept a downloadable CSV template, show created/updated/error counts, and list row-level errors without aborting the rest of the file.
- Added **Export** for both datasets as CSV, Excel (`.xlsx`), and PDF. The catalog export follows the current table filters; the BOM export covers the active workspace plus company-wide SKUs.

### Permission & schema
- Added `production.editor` permission with migration and route/sidebar/search wiring.
- Migrations: `20261119_production_editor_permission.sql`, `20261120_production_usage_lifecycle.sql`, `20261121_sku_workspace.sql`, `20261122_workspace_scoping.sql`.
- `db/reset.sql` updated with the new migration order.

### Notes
- Next.js build reports a known security vulnerability in the installed version and recommends upgrading; run `next upgrade --agent=security` if desired.
- Some modules still query directly in pages/actions and may need the same workspace-scoping treatment; reads in `lib/data` are scoped.
- Create actions for a few entities still default `workspace_id` to `null` (company-wide) until updated.
