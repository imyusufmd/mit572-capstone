# MCIT Capstone — Warehouse Inventory Management System

## Project Tracking (claude.md)

> This file tracks all progress, decisions, and context so any future session can pick up where we left off.

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Backend API | .NET 10 (ASP.NET Core Web API, Clean Architecture) |
| Frontend | React 19 + TypeScript + Vite |
| Transactional DB | PostgreSQL (on Windows Server VM) |
| Data Warehouse | SQL Server (Linux VM, Docker container) |
| Containerization | Docker + Docker Compose on Linux VM |
| ETL | Node-RED (Docker container) |
| Reporting | React in-app dashboards (Recharts) |
| Auth | Active Directory on Windows Server 2022 |

## Azure Infrastructure (4 VMs)

- **VM1**: Ubuntu 22.04 — Docker host (API, Frontend, SQL Server, Node-RED containers)
- **VM2**: Windows Server 2022 — AD DS + PostgreSQL
- **VM3**: Windows 11 — Management workstation (SSMS, pgAdmin, optional Power BI)
- **VM4**: Flex VM — Monitoring (Grafana + Prometheus recommended)

## Project Structure

```
/
├── backend/           # .NET 10 Web API
├── frontend/          # React 19 + TypeScript + Vite
├── etl/               # Node-RED flows
├── infra/             # Docker Compose, Azure setup notes
├── database/          # SQL init scripts (PostgreSQL + SQL Server)
├── docs/              # Project documentation
├── claude.md          # THIS FILE — progress tracker
└── README.md
```

---

## Progress Log

### Session 1 — 2026-04-11

**Status**: Phase 1 + Phase 2 COMPLETE, Phase 4 started

**Environment**:
- .NET 10.0.101 ✅
- Node.js v22.18.0 ✅
- npm 10.9.3 ✅

**Completed**:
- [x] Created `claude.md` (this file)
- [x] Created implementation plan
- [x] `database/postgres-init.sql` — Full OLTP schema (11 tables, indexes, triggers, 25+ products, 5 zones, 3 suppliers, 5 shipments, 3 orders, seed data)
- [x] `database/sqlserver-warehouse-init.sql` — Star schema (3 dims, 3 facts, calendar 2025-2027, 5 reporting views, seed data)
- [x] Backend API scaffolded (.NET 10 Web API)
- [x] 11 entity models (User, Category, Product, WarehouseZone, Inventory, Supplier, InboundShipment/Item, OutboundOrder/Item, StockAdjustment)
- [x] Complete DTOs (auth, products, categories, zones, inventory, suppliers, shipments, orders, analytics, common)
- [x] WarehouseDbContext (PostgreSQL, snake_case mapping)
- [x] DataWarehouseDbContext (SQL Server, read-only)
- [x] Auth: JwtService + LdapService + DevAuthService (dev mode bypasses LDAP)
- [x] 10 Controllers: Auth, Products, Categories, Inventory, Zones, Suppliers, Shipments, Orders, Dashboard, Analytics
- [x] 5 Services: Product, Inventory, Shipment, Order, Dashboard
- [x] Backend Dockerfile (multi-stage build)
- [x] Docker Compose (API, frontend, SQL Server, Node-RED)
- [x] .gitignore, README.md
- [x] **BUILD SUCCEEDED** — 0 warnings, 0 errors

**NuGet Packages Installed**:
- Npgsql.EntityFrameworkCore.PostgreSQL 10.0.0-preview.3
- Microsoft.EntityFrameworkCore.SqlServer 10.0.5
- Microsoft.EntityFrameworkCore.Design 10.0.5
- Microsoft.AspNetCore.Authentication.JwtBearer 10.0.5
- System.DirectoryServices.Protocols 10.0.5
- Swashbuckle.AspNetCore (latest)

**Next Steps**:
- Phase 3: Frontend (React 19 + Vite + TypeScript)
- Phase 5: ETL (Node-RED flows)
- Phase 6: Documentation (architecture diagrams, security notes, project plan)
- Phase 4: Infrastructure docs (Azure setup notes)
- Unit tests for backend services

**Decisions Made**:
- Start with local development (code first, deploy to Azure later)
- Use Clean Architecture for backend
- Dev auth mode: any non-empty username/password works when no AD server configured
- SQL Server DW context falls back to localhost when not configured (analytics endpoints return empty arrays gracefully)
- Soft delete for products, suppliers, zones (IsActive flag)
- Order status workflow: Pending → Picking → Picked → Packing → Packed → Shipped → Delivered
- Stock auto-deducted on Shipped status, auto-added on shipment receive

**Known Issues / Blockers**:
- None

---

### Session 2 — 2026-04-17

**Status**: Frontend Batch 1 COMPLETE (Login + Dashboard)

**Completed**:
- [x] Scaffolded Vite + React 19 + TypeScript frontend project
- [x] Installed deps: Tailwind CSS v4, React Router v7, Axios, Recharts, Lucide React
- [x] Dark theme configured (gray-900/950 backgrounds, blue-500 accent, custom Tailwind theme)
- [x] Shared components: AuthContext, ApiClient (Axios + JWT interceptor), AppLayout, Sidebar (responsive w/ hamburger), Header, LoadingSpinner, StatusBadge, EmptyState, Toast notifications
- [x] **Login page** (`/login`) — form with show/hide password, error handling, auto-redirect
- [x] **Dashboard page** (`/`) — 8 KPI cards (responsive grid), quick actions panel
- [x] App router with protected routes (redirects to /login if no JWT)
- [x] All TypeScript types matching backend DTOs
- [x] **BUILD SUCCEEDED** — 0 errors, 0 warnings (289KB JS / 94KB gzipped)

**npm Packages Installed**:
- tailwindcss + @tailwindcss/vite
- react-router-dom
- axios
- recharts
- lucide-react

**Frontend Architecture Decisions**:
- Dark theme only (no light mode toggle for now)
- Custom Tailwind components — no UI library (no shadcn, no MUI)
- Auth via localStorage JWT + Axios interceptor (401 → auto-logout)
- AppLayout wraps all authenticated routes; Login is standalone
- Sidebar nav has all 11 pages pre-wired (pages built incrementally per batch)

**Next Steps**:
- Batch 2: Products List + Product Detail pages
- Remaining batches: Inventory, Zones, Suppliers, Shipments, Orders, Analytics, Categories, Alerts, Settings
- Shared components still needed: DataTable, Modal, FormField, PageHeader (will build as needed in future batches)

**Known Issues / Blockers**:
- None

---

### Session 3 — 2026-04-26

**Status**: Azure Infrastructure ALL PHASES COMPLETE (A–F) + Frontend Batch 2 in progress

**Completed**:
- [x] Created `frontend/Dockerfile` (multi-stage Node 22 build → nginx:1.27-alpine)
- [x] Created `frontend/nginx.conf` (SPA fallback, `/api/` proxy, `/healthz` local endpoint)
- [x] Created `frontend/.dockerignore`
- [x] Created `infra/.env.example` with all required env var documentation
- [x] Fixed `infra/docker-compose.yml` — corrected POSTGRES_HOST default to `10.0.1.5`; disabled frontend healthcheck
- [x] Fixed `infra/azure/00-config.sh` — RG renamed to `MIT572-05`; fixed `check_ip()` `set -e` silent exit bug
- [x] Fixed `infra/azure/01-foundation.sh` — removed `az group create` (MIT572-05 already exists)
- [x] Fixed `infra/azure/04-vm3-workstation.sh` — updated Windows 11 image to `win11-24h2-ent` (pro SKU unavailable)
- [x] Fixed `database/postgres-init.sql` — all UUID prefixes corrected to valid hex (z→b, p→d, i→e, o→f, s→1)
- [x] Fixed `backend/src/WarehouseAPI/Auth/LdapService.cs` — `DevAuthService.IsAvailable()` returns false (fixes /auth/status reporting wrong mode)
- [x] Fixed `backend/src/WarehouseAPI/Program.cs` — startup logging, auth mode detection with `IsNullOrWhiteSpace`, DB verify in all environments
- [x] Fixed `backend/src/WarehouseAPI/Controllers/AuthController.cs` — try/catch with full error detail in 500 response
- [x] Fixed `backend/src/WarehouseAPI/WarehouseAPI.csproj` — Npgsql upgraded from `10.0.0-preview.3` to `10.0.1` (stable, compatible with EF Core 10.0.5 GA)
- [x] **Phase A** (local prep) ✅
- [x] **Phase B** (Azure foundation — RG, VNet, NSG) ✅
- [x] **Phase C** (VM2 — Windows Server + AD DS + PostgreSQL 16 + schema seeded) ✅
- [x] **Phase A** (local prep) ✅
- [x] **Phase B** (Azure foundation — RG, VNet, NSG) ✅
- [x] **Phase C** (VM2 — Windows Server + AD DS + PostgreSQL 16 + schema seeded) ✅
- [x] **Phase D** (VM1 — Ubuntu + Docker + full stack compose up) ✅ — login works, dashboard shows real DB data
- [x] **Phase E** (VM3 — SSMS connected to SQL Server on VM1, pgAdmin connected to PostgreSQL on VM2) ✅
- [x] **Phase F** (VM4 — Grafana + Prometheus running at `http://168.62.51.65:3000`) ✅

**VM IPs (resource group MIT572-05)**:
- VM1 Ubuntu/Docker: `23.100.28.16` (public), `10.0.1.4` internal — app at `http://23.100.28.16/`
- VM2 Windows/AD+PG: `20.127.3.25` (public), PostgreSQL on `10.0.1.4:5432`
- VM3 Windows 11/Workstation: `168.62.56.32` (public) — SSMS + pgAdmin configured
- VM4 Ubuntu/Monitoring: `20.120.98.3` (public) — Grafana at `:3000`, Prometheus running

**Key Fixes**:
- `MissingMethodException` on login: `Npgsql 10.0.0-preview.3` called internal EF Core preview API removed in 10.0.5 GA → fixed by upgrading Npgsql to `10.0.1`
- Auth mode showing "Active Directory" in dev: `DevAuthService.IsAvailable()` was returning true → fixed to false
- PostgreSQL connection working: `Host=10.0.1.4;Port=5432;Database=warehouse;Username=app_user;Password=Warehouse@2026!`
- Frontend black screen crashes: `PagedResult<T>` objects passed to `.map()` directly — fixed by extracting `.items` with array guard
- Cancel endpoints missing for shipments/orders — added `POST /{id}/cancel` to both controllers

**Known Issues / Blockers**:
- `libgssapi_krb5.so.2` warning in API container on startup — non-fatal, GSSAPI/Kerberos not needed for password auth
- Auth is in dev mode (any username/password accepted) — AD LDAP not wired up yet

---

### Session 4 — 2026-04-27/28

**Status**: ETL Pipeline COMPLETE — Analytics page showing live data ✅

**Completed**:
- [x] Created `etl/` folder with full Node-RED ETL pipeline
- [x] `etl/Dockerfile` — extends `nodered/node-red:latest`, pre-installs `node-red-contrib-postgresql` + `node-red-contrib-mssql-plus`
- [x] `etl/flows.json` — two flow tabs: "Dims + Facts" (every 15 min + 5s startup) and "Daily Snapshot" (00:05 CST)
- [x] `etl/settings.js` — `credentialSecret: false`, explicit `flowFile: flows.json`
- [x] `etl/entrypoint.sh` — generates `flows_cred.json` from env vars, always overwrites `settings.js`
- [x] `infra/docker-compose.yml` — switched nodered to custom `build: ../etl`, added env vars
- [x] Initialized `WarehouseDW` SQL Server database (star schema) via `sqlcmd` on VM1
- [x] Fixed `DataWarehouseDbContext` — added explicit snake_case column mappings for all 7 DW entities
- [x] Fixed `AnalyticsController` — materialize rows before in-memory aggregation (EF Core LINQ translation fix)
- [x] **Analytics page live**: all 4 charts rendering with real ETL data (25 products, 16 movements, 11 orders, 25 snapshots)
- [x] Merged `dev-etl` → `dev-main`

**ETL Architecture**:
- Source: PostgreSQL `warehouse` DB on VM2 (`10.0.1.4:5432`)
- Target: SQL Server `WarehouseDW` DB on VM1 (`sqlserver:1433`)
- Dims: MERGE (upsert) on `source_id` for products, zones, suppliers
- Facts: TRUNCATE + full reload for stock movements + orders
- Snapshot: DELETE today + INSERT for inventory snapshots
- Schedule: every 15 min for dims+facts, daily 00:05 CST for snapshot
- Manual trigger: inject button in Node-RED UI at `http://23.100.28.16:1880`

**Key Fixes This Session**:
- Node-RED credential encryption: settings.js was not being overwritten from volume → fixed entrypoint to always copy
- Node-RED blank flows: no `flowFile` set → hostname-based file generated → fixed by setting `flowFile: flows.json` in settings.js
- EF Core `Invalid column name 'ProductKey'`: DW tables use snake_case, EF Core expected PascalCase → added explicit `HasColumnName()` mappings
- EF Core LINQ translation errors: `Distinct().Count()` inside GroupBy + conditional cast not translatable → fixed by materializing first then aggregating in-memory

**Next Steps**:
- End-to-end verification of all frontend pages
- Active Directory auth wiring (optional for demo)
- Grafana dashboards on VM4 (optional)

---

## Key Files Reference

| File | Purpose |
|---|---|
| `backend/src/WarehouseAPI/Program.cs` | API entry point |
| `backend/src/WarehouseAPI/Data/WarehouseDbContext.cs` | EF Core DbContext |
| `frontend/src/App.tsx` | React router setup |
| `frontend/src/main.tsx` | Frontend entry point |
| `frontend/src/contexts/AuthContext.tsx` | Auth state (JWT, login/logout) |
| `frontend/src/api/client.ts` | Axios instance + JWT interceptor |
| `frontend/src/api/endpoints.ts` | API endpoint functions |
| `frontend/src/types/index.ts` | TypeScript DTOs (matches backend) |
| `frontend/src/components/layout/AppLayout.tsx` | Main layout (sidebar + header) |
| `frontend/src/components/layout/Sidebar.tsx` | Responsive sidebar navigation |
| `frontend/src/pages/login/LoginPage.tsx` | Login page |
| `frontend/src/pages/dashboard/DashboardPage.tsx` | Dashboard with KPI cards |
| `database/postgres-init.sql` | PostgreSQL schema + seed data |
| `database/sqlserver-warehouse-init.sql` | SQL Server star schema |
| `infra/docker-compose.yml` | Container orchestration |
| `etl/node-red-flows.json` | ETL pipeline definition |
