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

## Key Files Reference

| File | Purpose |
|---|---|
| `backend/src/WarehouseAPI/Program.cs` | API entry point |
| `backend/src/WarehouseAPI/Data/WarehouseDbContext.cs` | EF Core DbContext |
| `frontend/src/App.tsx` | React app entry |
| `database/postgres-init.sql` | PostgreSQL schema + seed data |
| `database/sqlserver-warehouse-init.sql` | SQL Server star schema |
| `infra/docker-compose.yml` | Container orchestration |
| `etl/node-red-flows.json` | ETL pipeline definition |
