# Warehouse ETL — Node-RED Pipeline

Moves data from the PostgreSQL OLTP database (VM2) into the SQL Server data warehouse (VM1 Docker container) so the Analytics page populates with real data.

## Architecture

```
PostgreSQL (VM2 :5432)
  products, categories, warehouse_zones, suppliers
  inbound_shipments/items, outbound_orders/items, stock_adjustments
        |
        |  Node-RED (VM1 :1880)
        |  warehouse-nodered container
        v
SQL Server DW (VM1 sqlserver:1433)
  dim_products, dim_zones, dim_suppliers  ← MERGE (upsert)
  fact_stock_movements, fact_orders       ← TRUNCATE + full reload
  fact_inventory_snapshots                ← daily replace-by-date
        |
        v
  API analytics endpoints → React Analytics page
```

## Flows

| Flow | Tab | Schedule | What it does |
|---|---|---|---|
| **Dims + Facts** | "Dims + Facts" | Every 15 min | MERGE dimensions, reload stock movement + order facts |
| **Daily Snapshot** | "Daily Snapshot" | Daily 00:05 CST (06:05 UTC) | Replace today's inventory snapshot in fact_inventory_snapshots |

The "Dims + Facts" flow also runs once at container startup (5-second delay) so data is available immediately after deploy.

## Environment Variables

These must be set in `infra/.env` on VM1 (they're already there if you followed the setup guide):

| Variable | Used for |
|---|---|
| `POSTGRES_HOST` | PostgreSQL IP (default: `10.0.1.4` = VM2 internal) |
| `POSTGRES_PASSWORD` | Password for `app_user` on PostgreSQL |
| `SA_PASSWORD` | SQL Server `sa` user password |

## Deploy

On VM1:

```bash
cd ~/mit572-capstone/infra

# First deploy (builds custom Node-RED image with ETL nodes)
docker compose up -d --build nodered

# Watch startup logs
docker logs -f warehouse-nodered
```

Expected output:
```
[ETL] Writing credentials from environment...
[ETL] Installing initial flows...
[ETL] Starting Node-RED...
...
[info] Started flows
```

## Verify

1. Browse to `http://<vm1-public-ip>:1880`
2. You should see two flow tabs: **Dims + Facts** and **Daily Snapshot**
3. The "Dims + Facts" flow auto-triggers 5 seconds after startup — watch the Debug pane (right sidebar → bug icon) for the run
4. Click any **inject** button (blue square left side of the inject node) to trigger a manual run

### Check DW data via SSMS (VM3)

```sql
-- Dimensions loaded?
SELECT COUNT(*) FROM dim_products;   -- expect 25
SELECT COUNT(*) FROM dim_zones;      -- expect 5
SELECT COUNT(*) FROM dim_suppliers;  -- expect 3

-- Facts loaded?
SELECT COUNT(*) FROM fact_stock_movements;   -- expect ~18-25
SELECT COUNT(*) FROM fact_orders;            -- expect ~10-15

-- Snapshot for today?
SELECT COUNT(*) FROM fact_inventory_snapshots
WHERE time_key = (SELECT time_key FROM dim_time WHERE full_date = CAST(GETDATE() AS DATE));
-- expect 25 (all product×zone combos)
```

### Check Analytics page

Browse `http://<vm1-public-ip>/analytics` — all four chart panels should render:
- Pie chart: Stock Value by Category
- Line chart: Inventory Turnover
- Bar chart: Zone Utilization
- Table: Supplier Performance

## Troubleshooting

**Container fails to start / missing modules:**
```bash
docker logs warehouse-nodered
# If "Cannot find module" errors:
docker exec -it warehouse-nodered npm install --prefix /data node-red-contrib-postgresql node-red-contrib-mssql-plus
docker restart warehouse-nodered
```

**Flows show red triangles (connection errors):**
- PostgreSQL: verify `POSTGRES_HOST` env var is set and `POSTGRES_PASSWORD` matches VM2
- SQL Server: verify `SA_PASSWORD` matches what's in `infra/.env`
- Check `docker logs warehouse-nodered` for credential errors

**Analytics page still shows "No data":**
1. Check that nodered ran at least once: Node-RED UI → Debug pane should show "ETL Complete"
2. Verify SQL Server has data (SSMS query above)
3. Check API logs: `docker logs warehouse-api` — look for errors in analytics endpoints

**Snapshot flow errors with "No time_key found for today":**
- The `dim_time` calendar only covers 2025–2027. If today is outside that range, the snapshot will fail. Re-seed `dim_time` for more years.

**To reset and reload from scratch:**
```bash
# Connect via SSMS and run:
TRUNCATE TABLE fact_stock_movements;
TRUNCATE TABLE fact_orders;
TRUNCATE TABLE fact_inventory_snapshots;
# Then trigger ETL manually in Node-RED UI
```

## Modifying Flows

1. Edit flows in the Node-RED UI at `http://<vm1-public-ip>:1880`
2. Deploy (red Deploy button top right)
3. Export the updated flows: hamburger menu → Export → Download
4. Copy `flows.json` back to `etl/flows.json` in the repo and commit

The `nodered-data` Docker volume persists flows across container restarts. The `flows.json` in this repo is the **canonical source** — it's baked into the Docker image and installed on a fresh container start if no flows exist yet.
