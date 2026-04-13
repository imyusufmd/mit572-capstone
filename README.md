# Warehouse Inventory Management System

**MCIT Capstone Project — Elmhurst University (MIT 572)**

A full-stack warehouse/logistics inventory management system that tracks products, stock levels, warehouse zones, incoming shipments, outgoing orders, and generates analytics/reports.

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | .NET 10 — ASP.NET Core Web API |
| **Frontend** | React 19 + TypeScript + Vite |
| **OLTP Database** | PostgreSQL |
| **Data Warehouse** | Microsoft SQL Server (Star Schema) |
| **ETL Pipeline** | Node-RED |
| **Containerization** | Docker + Docker Compose |
| **Authentication** | Active Directory (LDAP) + JWT |
| **Reporting** | Recharts (in-app dashboards) |

## Project Structure

```
├── backend/             # .NET 10 Web API (Clean Architecture)
│   ├── src/WarehouseAPI/
│   └── Dockerfile
├── frontend/            # React 19 + Vite + TypeScript
│   └── Dockerfile
├── database/            # SQL initialization scripts
│   ├── postgres-init.sql
│   └── sqlserver-warehouse-init.sql
├── etl/                 # Node-RED ETL flows
├── infra/               # Docker Compose + Azure setup
│   └── docker-compose.yml
└── docs/                # Project documentation
```

## Quick Start (Local Development)

### Prerequisites
- .NET 10 SDK
- Node.js 22+
- PostgreSQL (or Docker)

### Backend
```bash
cd backend
dotnet restore
dotnet run --project src/WarehouseAPI
```
API runs at `http://localhost:5000` with Swagger UI at `/swagger`.

### Frontend
```bash
cd frontend
npm install
npm run dev
```
App runs at `http://localhost:5173`.

### Login (Dev Mode)
When no AD server is configured, the API runs in dev mode — any non-empty username/password will authenticate.

**Seed Users:**
| Username | Role | Full Name |
|---|---|---|
| admin | Admin | System Administrator |
| jsmith | Manager | John Smith |
| bwilson | Staff | Bob Wilson |

## Azure Deployment

The system is deployed across 4 Azure VMs:
- **VM1 (Ubuntu 22.04)** — Docker host running API, frontend, SQL Server, Node-RED
- **VM2 (Windows Server 2022)** — Active Directory + PostgreSQL
- **VM3 (Windows 11)** — Management workstation (SSMS, pgAdmin)
- **VM4 (Linux)** — Monitoring (Grafana + Prometheus)

See `infra/azure-setup-notes.md` for detailed setup instructions.

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Authenticate (LDAP/JWT) |
| GET/POST | `/api/products` | Product management |
| GET/POST | `/api/categories` | Category management |
| GET | `/api/inventory` | Stock levels |
| POST | `/api/inventory/adjust` | Stock adjustments |
| GET | `/api/inventory/alerts` | Low stock alerts |
| GET/POST | `/api/zones` | Warehouse zones |
| GET/POST | `/api/suppliers` | Supplier management |
| GET/POST | `/api/shipments` | Inbound shipments |
| POST | `/api/shipments/{id}/receive` | Receive shipment |
| GET/POST | `/api/orders` | Outbound orders |
| PUT | `/api/orders/{id}/status` | Update order status |
| GET | `/api/dashboard/summary` | Dashboard stats |
| GET | `/api/analytics/*` | Data warehouse analytics |

## License

MIT