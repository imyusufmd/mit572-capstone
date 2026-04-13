-- ============================================================
-- Warehouse Inventory Management System
-- SQL Server Data Warehouse Initialization Script (OLAP — Star Schema)
-- ============================================================
-- Run this on the SQL Server container on Linux VM (VM1)
-- Database: WarehouseDW
-- ============================================================

-- Create database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'WarehouseDW')
BEGIN
    CREATE DATABASE WarehouseDW;
END
GO

USE WarehouseDW;
GO

-- ============================================================
-- DIMENSION TABLES
-- ============================================================

-- dim_time — Calendar dimension
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'dim_time')
BEGIN
    CREATE TABLE dim_time (
        time_key        INT PRIMARY KEY IDENTITY(1,1),
        full_date       DATE NOT NULL UNIQUE,
        day_of_week     TINYINT NOT NULL,
        day_name        VARCHAR(10) NOT NULL,
        day_of_month    TINYINT NOT NULL,
        day_of_year     SMALLINT NOT NULL,
        week_of_year    TINYINT NOT NULL,
        month_number    TINYINT NOT NULL,
        month_name      VARCHAR(10) NOT NULL,
        quarter         TINYINT NOT NULL,
        year            SMALLINT NOT NULL,
        is_weekend      BIT NOT NULL DEFAULT 0
    );
END
GO

-- dim_products — Product dimension
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'dim_products')
BEGIN
    CREATE TABLE dim_products (
        product_key     INT PRIMARY KEY IDENTITY(1,1),
        source_id       VARCHAR(50) NOT NULL,       -- UUID from PostgreSQL
        sku             VARCHAR(50) NOT NULL,
        name            VARCHAR(255) NOT NULL,
        category        VARCHAR(100),
        unit_price      DECIMAL(12,2),
        weight_kg       DECIMAL(8,3),
        is_current      BIT NOT NULL DEFAULT 1,     -- SCD Type 2 support
        effective_from  DATETIME2 NOT NULL DEFAULT GETDATE(),
        effective_to    DATETIME2 NULL
    );

    CREATE INDEX idx_dim_products_sku ON dim_products (sku);
    CREATE INDEX idx_dim_products_source ON dim_products (source_id);
END
GO

-- dim_zones — Warehouse zone dimension
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'dim_zones')
BEGIN
    CREATE TABLE dim_zones (
        zone_key        INT PRIMARY KEY IDENTITY(1,1),
        source_id       VARCHAR(50) NOT NULL,
        name            VARCHAR(100) NOT NULL,
        zone_type       VARCHAR(50) NOT NULL,
        capacity        INT NOT NULL
    );

    CREATE INDEX idx_dim_zones_source ON dim_zones (source_id);
END
GO

-- dim_suppliers — Supplier dimension
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'dim_suppliers')
BEGIN
    CREATE TABLE dim_suppliers (
        supplier_key    INT PRIMARY KEY IDENTITY(1,1),
        source_id       VARCHAR(50) NOT NULL,
        name            VARCHAR(255) NOT NULL,
        contact_email   VARCHAR(255),
        rating          DECIMAL(3,2)
    );

    CREATE INDEX idx_dim_suppliers_source ON dim_suppliers (source_id);
END
GO

-- ============================================================
-- FACT TABLES
-- ============================================================

-- fact_stock_movements — Tracks all stock in/out
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'fact_stock_movements')
BEGIN
    CREATE TABLE fact_stock_movements (
        movement_key    BIGINT PRIMARY KEY IDENTITY(1,1),
        product_key     INT NOT NULL REFERENCES dim_products(product_key),
        zone_key        INT NOT NULL REFERENCES dim_zones(zone_key),
        time_key        INT NOT NULL REFERENCES dim_time(time_key),
        supplier_key    INT NULL REFERENCES dim_suppliers(supplier_key),
        movement_type   VARCHAR(30) NOT NULL,       -- 'Inbound', 'Outbound', 'Adjustment'
        qty_in          INT NOT NULL DEFAULT 0,
        qty_out         INT NOT NULL DEFAULT 0,
        net_change      INT NOT NULL DEFAULT 0,
        reference_number VARCHAR(50)                 -- Shipment or order reference
    );

    CREATE INDEX idx_fact_movements_product ON fact_stock_movements (product_key);
    CREATE INDEX idx_fact_movements_time ON fact_stock_movements (time_key);
    CREATE INDEX idx_fact_movements_zone ON fact_stock_movements (zone_key);
END
GO

-- fact_orders — Order-level facts
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'fact_orders')
BEGIN
    CREATE TABLE fact_orders (
        order_key       BIGINT PRIMARY KEY IDENTITY(1,1),
        product_key     INT NOT NULL REFERENCES dim_products(product_key),
        time_key        INT NOT NULL REFERENCES dim_time(time_key),
        order_type      VARCHAR(20) NOT NULL,       -- 'Inbound', 'Outbound'
        quantity        INT NOT NULL,
        status          VARCHAR(30) NOT NULL,
        order_reference VARCHAR(50),
        fulfillment_days INT NULL,                   -- Days from creation to ship/receive
        supplier_key    INT NULL REFERENCES dim_suppliers(supplier_key)
    );

    CREATE INDEX idx_fact_orders_product ON fact_orders (product_key);
    CREATE INDEX idx_fact_orders_time ON fact_orders (time_key);
    CREATE INDEX idx_fact_orders_type ON fact_orders (order_type);
END
GO

-- fact_inventory_snapshots — Daily inventory snapshots
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'fact_inventory_snapshots')
BEGIN
    CREATE TABLE fact_inventory_snapshots (
        snapshot_key    BIGINT PRIMARY KEY IDENTITY(1,1),
        product_key     INT NOT NULL REFERENCES dim_products(product_key),
        zone_key        INT NOT NULL REFERENCES dim_zones(zone_key),
        time_key        INT NOT NULL REFERENCES dim_time(time_key),
        quantity_on_hand INT NOT NULL DEFAULT 0,
        min_threshold   INT NOT NULL DEFAULT 0,
        is_below_threshold BIT NOT NULL DEFAULT 0,
        stock_value     DECIMAL(14,2) NOT NULL DEFAULT 0.00,    -- qty * unit_price
        UNIQUE(product_key, zone_key, time_key)
    );

    CREATE INDEX idx_fact_snapshots_time ON fact_inventory_snapshots (time_key);
    CREATE INDEX idx_fact_snapshots_product ON fact_inventory_snapshots (product_key);
END
GO

-- ============================================================
-- POPULATE dim_time (2025-01-01 through 2027-12-31)
-- ============================================================
IF NOT EXISTS (SELECT TOP 1 1 FROM dim_time)
BEGIN
    DECLARE @StartDate DATE = '2025-01-01';
    DECLARE @EndDate DATE = '2027-12-31';
    DECLARE @CurrentDate DATE = @StartDate;

    WHILE @CurrentDate <= @EndDate
    BEGIN
        INSERT INTO dim_time (full_date, day_of_week, day_name, day_of_month, day_of_year,
                              week_of_year, month_number, month_name, quarter, year, is_weekend)
        VALUES (
            @CurrentDate,
            DATEPART(WEEKDAY, @CurrentDate),
            DATENAME(WEEKDAY, @CurrentDate),
            DAY(@CurrentDate),
            DATEPART(DAYOFYEAR, @CurrentDate),
            DATEPART(WEEK, @CurrentDate),
            MONTH(@CurrentDate),
            DATENAME(MONTH, @CurrentDate),
            DATEPART(QUARTER, @CurrentDate),
            YEAR(@CurrentDate),
            CASE WHEN DATEPART(WEEKDAY, @CurrentDate) IN (1, 7) THEN 1 ELSE 0 END
        );
        SET @CurrentDate = DATEADD(DAY, 1, @CurrentDate);
    END
END
GO

-- ============================================================
-- SEED DIMENSION DATA (matches PostgreSQL seed data)
-- ============================================================

-- dim_products
IF NOT EXISTS (SELECT TOP 1 1 FROM dim_products)
BEGIN
    INSERT INTO dim_products (source_id, sku, name, category, unit_price, weight_kg) VALUES
        ('p0000001-0000-0000-0000-000000000001', 'ELEC-001', 'USB-C Cable 6ft',         'Electronics',       12.99,  0.08),
        ('p0000001-0000-0000-0000-000000000002', 'ELEC-002', 'Wireless Mouse',          'Electronics',       24.99,  0.15),
        ('p0000001-0000-0000-0000-000000000003', 'ELEC-003', 'HDMI Cable 10ft',         'Electronics',       18.50,  0.20),
        ('p0000001-0000-0000-0000-000000000004', 'ELEC-004', 'Power Strip 6-Outlet',    'Electronics',       29.99,  0.75),
        ('p0000001-0000-0000-0000-000000000005', 'ELEC-005', 'Ethernet Cable Cat6 25ft','Electronics',       14.99,  0.30),
        ('p0000001-0000-0000-0000-000000000006', 'RAW-001',  'Steel Sheet 4x8',         'Raw Materials',     89.00,  45.00),
        ('p0000001-0000-0000-0000-000000000007', 'RAW-002',  'Aluminum Extrusion 6ft',  'Raw Materials',     34.50,  2.50),
        ('p0000001-0000-0000-0000-000000000008', 'RAW-003',  'Copper Wire Spool 100m',  'Raw Materials',     67.00,  4.20),
        ('p0000001-0000-0000-0000-000000000009', 'RAW-004',  'PVC Pipe 10ft',           'Raw Materials',     12.75,  3.10),
        ('p0000001-0000-0000-0000-000000000010', 'RAW-005',  'Rubber Gasket Set',       'Raw Materials',     22.00,  0.80),
        ('p0000001-0000-0000-0000-000000000011', 'PKG-001',  'Cardboard Box 12x12x12',  'Packaging',         2.50,   0.45),
        ('p0000001-0000-0000-0000-000000000012', 'PKG-002',  'Bubble Wrap Roll 100ft',  'Packaging',         18.99,  2.00),
        ('p0000001-0000-0000-0000-000000000013', 'PKG-003',  'Packing Tape 6-Pack',     'Packaging',         15.99,  1.80),
        ('p0000001-0000-0000-0000-000000000014', 'PKG-004',  'Shipping Labels 500ct',   'Packaging',         24.00,  1.20),
        ('p0000001-0000-0000-0000-000000000015', 'PKG-005',  'Packing Peanuts 14cuft',  'Packaging',         28.50,  1.50),
        ('p0000001-0000-0000-0000-000000000016', 'OFF-001',  'Copy Paper Ream 500ct',   'Office Supplies',   8.99,   2.50),
        ('p0000001-0000-0000-0000-000000000017', 'OFF-002',  'Ballpoint Pen Box 12ct',  'Office Supplies',   6.49,   0.20),
        ('p0000001-0000-0000-0000-000000000018', 'OFF-003',  'Sticky Notes 12-Pack',    'Office Supplies',   11.99,  0.60),
        ('p0000001-0000-0000-0000-000000000019', 'OFF-004',  'Binder Clips Assorted',   'Office Supplies',   7.49,   0.50),
        ('p0000001-0000-0000-0000-000000000020', 'OFF-005',  'Printer Toner Black',     'Office Supplies',   45.00,  0.80),
        ('p0000001-0000-0000-0000-000000000021', 'SAF-001',  'Safety Glasses Clear',    'Safety Equipment',  8.99,   0.10),
        ('p0000001-0000-0000-0000-000000000022', 'SAF-002',  'Nitrile Gloves Box 100',  'Safety Equipment',  14.99,  0.60),
        ('p0000001-0000-0000-0000-000000000023', 'SAF-003',  'Hard Hat White',          'Safety Equipment',  19.99,  0.40),
        ('p0000001-0000-0000-0000-000000000024', 'SAF-004',  'Fire Extinguisher 5lb',   'Safety Equipment',  49.99,  3.50),
        ('p0000001-0000-0000-0000-000000000025', 'SAF-005',  'First Aid Kit 50-Person', 'Safety Equipment',  39.99,  2.80);
END
GO

-- dim_zones
IF NOT EXISTS (SELECT TOP 1 1 FROM dim_zones)
BEGIN
    INSERT INTO dim_zones (source_id, name, zone_type, capacity) VALUES
        ('z0000001-0000-0000-0000-000000000001', 'Receiving Dock',  'Receiving',     500),
        ('z0000001-0000-0000-0000-000000000002', 'Storage Zone A',  'Storage',      2000),
        ('z0000001-0000-0000-0000-000000000003', 'Storage Zone B',  'Storage',      1500),
        ('z0000001-0000-0000-0000-000000000004', 'Cold Storage',    'Cold Storage',  300),
        ('z0000001-0000-0000-0000-000000000005', 'Shipping Dock',   'Shipping',      400);
END
GO

-- dim_suppliers
IF NOT EXISTS (SELECT TOP 1 1 FROM dim_suppliers)
BEGIN
    INSERT INTO dim_suppliers (source_id, name, contact_email, rating) VALUES
        ('s0000001-0000-0000-0000-000000000001', 'Acme Corporation',   'orders@acmecorp.com',   4.50),
        ('s0000001-0000-0000-0000-000000000002', 'GlobalParts Inc',    'sales@globalparts.com', 3.80),
        ('s0000001-0000-0000-0000-000000000003', 'FastShip Logistics', 'contact@fastship.com',  4.20);
END
GO

-- ============================================================
-- SEED FACT DATA (sample historical data for analytics)
-- ============================================================

-- fact_stock_movements (sample movements over last 3 months)
IF NOT EXISTS (SELECT TOP 1 1 FROM fact_stock_movements)
BEGIN
    DECLARE @TimeKeyMar01 INT, @TimeKeyMar10 INT, @TimeKeyMar15 INT, @TimeKeyMar20 INT;
    DECLARE @TimeKeyApr01 INT, @TimeKeyApr08 INT;

    SELECT @TimeKeyMar01 = time_key FROM dim_time WHERE full_date = '2026-03-01';
    SELECT @TimeKeyMar10 = time_key FROM dim_time WHERE full_date = '2026-03-10';
    SELECT @TimeKeyMar15 = time_key FROM dim_time WHERE full_date = '2026-03-15';
    SELECT @TimeKeyMar20 = time_key FROM dim_time WHERE full_date = '2026-03-20';
    SELECT @TimeKeyApr01 = time_key FROM dim_time WHERE full_date = '2026-04-01';
    SELECT @TimeKeyApr08 = time_key FROM dim_time WHERE full_date = '2026-04-08';

    -- Inbound movements (shipments received)
    INSERT INTO fact_stock_movements (product_key, zone_key, time_key, supplier_key, movement_type, qty_in, qty_out, net_change, reference_number) VALUES
        (1,  1, @TimeKeyMar01, 1, 'Inbound', 100, 0, 100, 'SHP-2026-001'),
        (2,  1, @TimeKeyMar01, 1, 'Inbound', 50,  0, 50,  'SHP-2026-001'),
        (4,  1, @TimeKeyMar01, 1, 'Inbound', 30,  0, 30,  'SHP-2026-001'),
        (6,  1, @TimeKeyMar10, 2, 'Inbound', 20,  0, 20,  'SHP-2026-002'),
        (7,  1, @TimeKeyMar10, 2, 'Inbound', 40,  0, 40,  'SHP-2026-002'),
        (8,  1, @TimeKeyMar10, 2, 'Inbound', 25,  0, 25,  'SHP-2026-002'),
        (11, 1, @TimeKeyMar15, 3, 'Inbound', 200, 0, 200, 'SHP-2026-003'),
        (12, 1, @TimeKeyMar15, 3, 'Inbound', 30,  0, 30,  'SHP-2026-003'),
        (3,  1, @TimeKeyApr01, 1, 'Inbound', 35,  0, 35,  'SHP-2026-004'),
        (5,  1, @TimeKeyApr01, 1, 'Inbound', 100, 0, 100, 'SHP-2026-004');

    -- Outbound movements (orders shipped)
    INSERT INTO fact_stock_movements (product_key, zone_key, time_key, supplier_key, movement_type, qty_in, qty_out, net_change, reference_number) VALUES
        (1,  2, @TimeKeyMar20, NULL, 'Outbound', 0, 25,  -25,  'ORD-2026-001'),
        (16, 2, @TimeKeyMar20, NULL, 'Outbound', 0, 50,  -50,  'ORD-2026-001'),
        (21, 3, @TimeKeyMar20, NULL, 'Outbound', 0, 100, -100, 'ORD-2026-001');

    -- Adjustment movements
    INSERT INTO fact_stock_movements (product_key, zone_key, time_key, supplier_key, movement_type, qty_in, qty_out, net_change, reference_number) VALUES
        (6,  3, @TimeKeyMar15, NULL, 'Adjustment', 0, 2, -2,  'ADJ-DMG'),
        (22, 4, @TimeKeyMar20, NULL, 'Adjustment', 0, 5, -5,  'ADJ-EXP'),
        (17, 2, @TimeKeyApr01, NULL, 'Adjustment', 12, 0, 12, 'ADJ-FOUND');
END
GO

-- fact_orders (order-product level facts)
IF NOT EXISTS (SELECT TOP 1 1 FROM fact_orders)
BEGIN
    DECLARE @TKMar01 INT, @TKMar20 INT, @TKApr08 INT, @TKApr10 INT;
    SELECT @TKMar01 = time_key FROM dim_time WHERE full_date = '2026-03-01';
    SELECT @TKMar20 = time_key FROM dim_time WHERE full_date = '2026-03-20';
    SELECT @TKApr08 = time_key FROM dim_time WHERE full_date = '2026-04-08';
    SELECT @TKApr10 = time_key FROM dim_time WHERE full_date = '2026-04-10';

    INSERT INTO fact_orders (product_key, time_key, order_type, quantity, status, order_reference, fulfillment_days, supplier_key) VALUES
        -- Inbound orders
        (1,  @TKMar01, 'Inbound', 100, 'Received', 'SHP-2026-001', 1, 1),
        (2,  @TKMar01, 'Inbound', 50,  'Received', 'SHP-2026-001', 1, 1),
        (4,  @TKMar01, 'Inbound', 30,  'Received', 'SHP-2026-001', 1, 1),
        -- Outbound orders
        (1,  @TKMar20, 'Outbound', 25,  'Shipped', 'ORD-2026-001', 2, NULL),
        (16, @TKMar20, 'Outbound', 50,  'Shipped', 'ORD-2026-001', 2, NULL),
        (21, @TKMar20, 'Outbound', 100, 'Shipped', 'ORD-2026-001', 2, NULL),
        (11, @TKApr08, 'Outbound', 100, 'Picking', 'ORD-2026-002', NULL, NULL),
        (13, @TKApr08, 'Outbound', 20,  'Picking', 'ORD-2026-002', NULL, NULL),
        (2,  @TKApr10, 'Outbound', 10,  'Pending', 'ORD-2026-003', NULL, NULL),
        (22, @TKApr10, 'Outbound', 50,  'Pending', 'ORD-2026-003', NULL, NULL),
        (24, @TKApr10, 'Outbound', 5,   'Pending', 'ORD-2026-003', NULL, NULL);
END
GO

-- fact_inventory_snapshots (snapshot for today's date)
IF NOT EXISTS (SELECT TOP 1 1 FROM fact_inventory_snapshots)
BEGIN
    DECLARE @TodayKey INT;
    SELECT @TodayKey = time_key FROM dim_time WHERE full_date = CAST(GETDATE() AS DATE);

    -- If today's key doesn't exist yet, use the latest available
    IF @TodayKey IS NULL
        SELECT @TodayKey = MAX(time_key) FROM dim_time;

    INSERT INTO fact_inventory_snapshots (product_key, zone_key, time_key, quantity_on_hand, min_threshold, is_below_threshold, stock_value) VALUES
        (1,  2, @TodayKey, 250, 50,  0, 250 * 12.99),
        (2,  2, @TodayKey, 120, 25,  0, 120 * 24.99),
        (3,  2, @TodayKey, 85,  20,  0, 85 * 18.50),
        (4,  2, @TodayKey, 60,  15,  0, 60 * 29.99),
        (5,  2, @TodayKey, 180, 30,  0, 180 * 14.99),
        (6,  3, @TodayKey, 30,  10,  0, 30 * 89.00),
        (7,  3, @TodayKey, 75,  20,  0, 75 * 34.50),
        (8,  3, @TodayKey, 40,  15,  0, 40 * 67.00),
        (9,  3, @TodayKey, 100, 25,  0, 100 * 12.75),
        (10, 3, @TodayKey, 200, 30,  0, 200 * 22.00),
        (11, 2, @TodayKey, 500, 100, 0, 500 * 2.50),
        (12, 2, @TodayKey, 45,  20,  0, 45 * 18.99),
        (13, 2, @TodayKey, 80,  25,  0, 80 * 15.99),
        (14, 2, @TodayKey, 15,  20,  1, 15 * 24.00),    -- BELOW THRESHOLD
        (15, 2, @TodayKey, 35,  15,  0, 35 * 28.50),
        (16, 2, @TodayKey, 300, 50,  0, 300 * 8.99),
        (17, 2, @TodayKey, 150, 30,  0, 150 * 6.49),
        (18, 2, @TodayKey, 90,  25,  0, 90 * 11.99),
        (19, 2, @TodayKey, 200, 40,  0, 200 * 7.49),
        (20, 2, @TodayKey, 8,   10,  1, 8 * 45.00),     -- BELOW THRESHOLD
        (21, 3, @TodayKey, 400, 50,  0, 400 * 8.99),
        (22, 4, @TodayKey, 75,  30,  0, 75 * 14.99),
        (23, 3, @TodayKey, 60,  15,  0, 60 * 19.99),
        (24, 3, @TodayKey, 25,  10,  0, 25 * 49.99),
        (25, 3, @TodayKey, 5,   10,  1, 5 * 39.99);     -- BELOW THRESHOLD
END
GO

-- ============================================================
-- USEFUL VIEWS FOR REPORTING
-- ============================================================

-- Stock value by category
IF OBJECT_ID('vw_stock_value_by_category', 'V') IS NOT NULL
    DROP VIEW vw_stock_value_by_category;
GO

CREATE VIEW vw_stock_value_by_category AS
SELECT
    p.category,
    COUNT(DISTINCT s.product_key) AS product_count,
    SUM(s.quantity_on_hand) AS total_quantity,
    SUM(s.stock_value) AS total_value,
    SUM(CASE WHEN s.is_below_threshold = 1 THEN 1 ELSE 0 END) AS low_stock_count,
    t.full_date AS snapshot_date
FROM fact_inventory_snapshots s
JOIN dim_products p ON s.product_key = p.product_key
JOIN dim_time t ON s.time_key = t.time_key
WHERE p.is_current = 1
GROUP BY p.category, t.full_date;
GO

-- Inventory turnover
IF OBJECT_ID('vw_inventory_turnover', 'V') IS NOT NULL
    DROP VIEW vw_inventory_turnover;
GO

CREATE VIEW vw_inventory_turnover AS
SELECT
    p.product_key,
    p.sku,
    p.name,
    p.category,
    t.month_name,
    t.month_number,
    t.year,
    SUM(m.qty_in) AS total_in,
    SUM(m.qty_out) AS total_out,
    SUM(m.net_change) AS net_movement
FROM fact_stock_movements m
JOIN dim_products p ON m.product_key = p.product_key
JOIN dim_time t ON m.time_key = t.time_key
GROUP BY p.product_key, p.sku, p.name, p.category, t.month_name, t.month_number, t.year;
GO

-- Supplier performance
IF OBJECT_ID('vw_supplier_performance', 'V') IS NOT NULL
    DROP VIEW vw_supplier_performance;
GO

CREATE VIEW vw_supplier_performance AS
SELECT
    s.supplier_key,
    s.name AS supplier_name,
    s.rating,
    COUNT(DISTINCT o.order_reference) AS total_orders,
    SUM(o.quantity) AS total_quantity,
    AVG(CAST(o.fulfillment_days AS FLOAT)) AS avg_fulfillment_days,
    SUM(CASE WHEN o.status = 'Received' THEN 1 ELSE 0 END) AS completed_orders,
    t.month_name,
    t.year
FROM fact_orders o
JOIN dim_suppliers s ON o.supplier_key = s.supplier_key
JOIN dim_time t ON o.time_key = t.time_key
WHERE o.order_type = 'Inbound'
GROUP BY s.supplier_key, s.name, s.rating, t.month_name, t.year;
GO

-- Zone utilization
IF OBJECT_ID('vw_zone_utilization', 'V') IS NOT NULL
    DROP VIEW vw_zone_utilization;
GO

CREATE VIEW vw_zone_utilization AS
SELECT
    z.zone_key,
    z.name AS zone_name,
    z.zone_type,
    z.capacity,
    SUM(s.quantity_on_hand) AS current_stock,
    CAST(SUM(s.quantity_on_hand) AS FLOAT) / NULLIF(z.capacity, 0) * 100 AS utilization_percent,
    SUM(s.stock_value) AS zone_stock_value,
    t.full_date AS snapshot_date
FROM fact_inventory_snapshots s
JOIN dim_zones z ON s.zone_key = z.zone_key
JOIN dim_time t ON s.time_key = t.time_key
GROUP BY z.zone_key, z.name, z.zone_type, z.capacity, t.full_date;
GO

-- Order fulfillment metrics
IF OBJECT_ID('vw_order_fulfillment', 'V') IS NOT NULL
    DROP VIEW vw_order_fulfillment;
GO

CREATE VIEW vw_order_fulfillment AS
SELECT
    t.full_date,
    t.month_name,
    t.year,
    o.order_type,
    COUNT(*) AS order_line_count,
    SUM(o.quantity) AS total_quantity,
    AVG(CAST(o.fulfillment_days AS FLOAT)) AS avg_fulfillment_days,
    SUM(CASE WHEN o.status IN ('Shipped', 'Delivered', 'Received') THEN 1 ELSE 0 END) AS completed_count,
    SUM(CASE WHEN o.status IN ('Pending', 'Picking') THEN 1 ELSE 0 END) AS pending_count
FROM fact_orders o
JOIN dim_time t ON o.time_key = t.time_key
GROUP BY t.full_date, t.month_name, t.year, o.order_type;
GO

PRINT 'WarehouseDW data warehouse schema created and seeded successfully.';
GO
