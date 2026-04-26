-- ============================================================
-- Warehouse Inventory Management System
-- PostgreSQL Initialization Script (OLTP — Transactional Database)
-- ============================================================
-- Run this on the PostgreSQL instance on Windows Server 2022 (VM2)
-- Database: warehouse
-- Role: app_user
-- ============================================================

-- Create application role
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user WITH LOGIN PASSWORD 'Warehouse@2026!';
    END IF;
END
$$;

-- Create database (run this separately as superuser if needed)
-- CREATE DATABASE warehouse OWNER app_user;

-- Connect to warehouse database before running the rest

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

-- Users table (synced from Active Directory)
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username        VARCHAR(100) NOT NULL UNIQUE,
    email           VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    role            VARCHAR(50) NOT NULL DEFAULT 'Staff'
                        CHECK (role IN ('Admin', 'Manager', 'Staff')),
    ad_username     VARCHAR(100) UNIQUE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_users_role ON users (role);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku             VARCHAR(50) NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
    unit_price      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    weight_kg       DECIMAL(8,3),
    length_cm       DECIMAL(8,2),
    width_cm        DECIMAL(8,2),
    height_cm       DECIMAL(8,2),
    image_url       VARCHAR(500),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_sku ON products (sku);
CREATE INDEX idx_products_category ON products (category_id);
CREATE INDEX idx_products_name ON products (name);

-- Warehouse Zones
CREATE TABLE IF NOT EXISTS warehouse_zones (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100) NOT NULL UNIQUE,
    zone_type       VARCHAR(50) NOT NULL
                        CHECK (zone_type IN ('Receiving', 'Storage', 'Cold Storage', 'Shipping', 'Returns', 'Quarantine')),
    capacity        INTEGER NOT NULL DEFAULT 1000,
    current_utilization INTEGER NOT NULL DEFAULT 0,
    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inventory (stock per product per zone)
CREATE TABLE IF NOT EXISTS inventory (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    zone_id         UUID NOT NULL REFERENCES warehouse_zones(id) ON DELETE CASCADE,
    quantity        INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    min_threshold   INTEGER NOT NULL DEFAULT 10,
    max_threshold   INTEGER DEFAULT NULL,
    last_updated    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(product_id, zone_id)
);

CREATE INDEX idx_inventory_product ON inventory (product_id);
CREATE INDEX idx_inventory_zone ON inventory (zone_id);
CREATE INDEX idx_inventory_low_stock ON inventory (quantity, min_threshold)
    WHERE quantity <= min_threshold;

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    contact_email   VARCHAR(255),
    phone           VARCHAR(50),
    address         TEXT,
    rating          DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inbound Shipments
CREATE TABLE IF NOT EXISTS inbound_shipments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_number VARCHAR(50) NOT NULL UNIQUE,
    supplier_id     UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    expected_date   DATE NOT NULL,
    received_date   DATE,
    status          VARCHAR(30) NOT NULL DEFAULT 'Pending'
                        CHECK (status IN ('Pending', 'In Transit', 'Received', 'Partially Received', 'Cancelled')),
    notes           TEXT,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shipments_status ON inbound_shipments (status);
CREATE INDEX idx_shipments_supplier ON inbound_shipments (supplier_id);
CREATE INDEX idx_shipments_date ON inbound_shipments (expected_date);

-- Inbound Shipment Items
CREATE TABLE IF NOT EXISTS inbound_shipment_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id     UUID NOT NULL REFERENCES inbound_shipments(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    expected_qty    INTEGER NOT NULL CHECK (expected_qty > 0),
    received_qty    INTEGER DEFAULT 0 CHECK (received_qty >= 0),
    zone_id         UUID REFERENCES warehouse_zones(id),
    notes           TEXT
);

CREATE INDEX idx_shipment_items_shipment ON inbound_shipment_items (shipment_id);

-- Outbound Orders
CREATE TABLE IF NOT EXISTS outbound_orders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number    VARCHAR(50) NOT NULL UNIQUE,
    status          VARCHAR(30) NOT NULL DEFAULT 'Pending'
                        CHECK (status IN ('Pending', 'Picking', 'Picked', 'Packing', 'Packed', 'Shipped', 'Delivered', 'Cancelled')),
    destination     TEXT NOT NULL,
    customer_name   VARCHAR(255),
    priority        VARCHAR(20) NOT NULL DEFAULT 'Normal'
                        CHECK (priority IN ('Low', 'Normal', 'High', 'Urgent')),
    notes           TEXT,
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    shipped_at      TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_status ON outbound_orders (status);
CREATE INDEX idx_orders_number ON outbound_orders (order_number);
CREATE INDEX idx_orders_created ON outbound_orders (created_at);

-- Outbound Order Items
CREATE TABLE IF NOT EXISTS outbound_order_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id        UUID NOT NULL REFERENCES outbound_orders(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity        INTEGER NOT NULL CHECK (quantity > 0),
    zone_id         UUID REFERENCES warehouse_zones(id),
    picked_at       TIMESTAMPTZ,
    packed_at       TIMESTAMPTZ
);

CREATE INDEX idx_order_items_order ON outbound_order_items (order_id);

-- Stock Adjustments (audit trail for manual corrections)
CREATE TABLE IF NOT EXISTS stock_adjustments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    zone_id         UUID NOT NULL REFERENCES warehouse_zones(id) ON DELETE CASCADE,
    qty_change      INTEGER NOT NULL,  -- positive = add, negative = remove
    reason          VARCHAR(50) NOT NULL
                        CHECK (reason IN ('Damaged', 'Expired', 'Lost', 'Found', 'Correction', 'Return', 'Other')),
    notes           TEXT,
    adjusted_by     UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_adjustments_product ON stock_adjustments (product_id);
CREATE INDEX idx_adjustments_date ON stock_adjustments (created_at);

-- ============================================================
-- TRIGGER: Auto-update `updated_at` timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipments_updated_at
    BEFORE UPDATE ON inbound_shipments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON outbound_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SEED DATA
-- ============================================================

-- Users
INSERT INTO users (id, username, email, full_name, role, ad_username) VALUES
    ('a0000001-0000-0000-0000-000000000001', 'admin', 'admin@capstone.local', 'System Administrator', 'Admin', 'admin'),
    ('a0000001-0000-0000-0000-000000000002', 'jsmith', 'jsmith@capstone.local', 'John Smith', 'Manager', 'jsmith'),
    ('a0000001-0000-0000-0000-000000000003', 'mjones', 'mjones@capstone.local', 'Maria Jones', 'Manager', 'mjones'),
    ('a0000001-0000-0000-0000-000000000004', 'bwilson', 'bwilson@capstone.local', 'Bob Wilson', 'Staff', 'bwilson'),
    ('a0000001-0000-0000-0000-000000000005', 'alee', 'alee@capstone.local', 'Alice Lee', 'Staff', 'alee')
ON CONFLICT (username) DO NOTHING;

-- Categories
INSERT INTO categories (id, name, description) VALUES
    ('c0000001-0000-0000-0000-000000000001', 'Electronics', 'Electronic components, devices, and accessories'),
    ('c0000001-0000-0000-0000-000000000002', 'Raw Materials', 'Base materials for manufacturing and assembly'),
    ('c0000001-0000-0000-0000-000000000003', 'Packaging', 'Boxes, tape, bubble wrap, and packing materials'),
    ('c0000001-0000-0000-0000-000000000004', 'Office Supplies', 'Stationery, printer supplies, and office equipment'),
    ('c0000001-0000-0000-0000-000000000005', 'Safety Equipment', 'PPE, fire extinguishers, and safety gear')
ON CONFLICT (name) DO NOTHING;

-- Warehouse Zones
INSERT INTO warehouse_zones (id, name, zone_type, capacity, current_utilization, description) VALUES
    ('b0000001-0000-0000-0000-000000000001', 'Receiving Dock',  'Receiving',     500,  120, 'Primary receiving area for inbound shipments'),
    ('b0000001-0000-0000-0000-000000000002', 'Storage Zone A',  'Storage',      2000,  850, 'Main storage area — general merchandise'),
    ('b0000001-0000-0000-0000-000000000003', 'Storage Zone B',  'Storage',      1500,  430, 'Secondary storage — overflow and bulk items'),
    ('b0000001-0000-0000-0000-000000000004', 'Cold Storage',    'Cold Storage',  300,   95, 'Temperature-controlled storage for sensitive items'),
    ('b0000001-0000-0000-0000-000000000005', 'Shipping Dock',   'Shipping',      400,   75, 'Outbound staging and shipping area')
ON CONFLICT (name) DO NOTHING;

-- Suppliers
INSERT INTO suppliers (id, name, contact_email, phone, address, rating) VALUES
    ('10000001-0000-0000-0000-000000000001', 'Acme Corporation',     'orders@acmecorp.com',      '+1-555-0101', '123 Industrial Blvd, Chicago, IL 60601',    4.50),
    ('10000001-0000-0000-0000-000000000002', 'GlobalParts Inc',      'sales@globalparts.com',    '+1-555-0202', '456 Commerce Dr, Dallas, TX 75201',         3.80),
    ('10000001-0000-0000-0000-000000000003', 'FastShip Logistics',   'contact@fastship.com',     '+1-555-0303', '789 Warehouse Row, Atlanta, GA 30301',      4.20)
ON CONFLICT DO NOTHING;

-- Products (25 items across 5 categories)
INSERT INTO products (id, sku, name, description, category_id, unit_price, weight_kg) VALUES
    -- Electronics (5)
    ('d0000001-0000-0000-0000-000000000001', 'ELEC-001', 'USB-C Cable 6ft',         'Braided USB-C to USB-C cable, 6 feet',                  'c0000001-0000-0000-0000-000000000001', 12.99,  0.08),
    ('d0000001-0000-0000-0000-000000000002', 'ELEC-002', 'Wireless Mouse',          'Ergonomic wireless mouse, 2.4GHz',                      'c0000001-0000-0000-0000-000000000001', 24.99,  0.15),
    ('d0000001-0000-0000-0000-000000000003', 'ELEC-003', 'HDMI Cable 10ft',         'High-speed HDMI 2.1 cable, 10 feet',                    'c0000001-0000-0000-0000-000000000001', 18.50,  0.20),
    ('d0000001-0000-0000-0000-000000000004', 'ELEC-004', 'Power Strip 6-Outlet',    'Surge protector power strip, 6 outlets, 4ft cord',      'c0000001-0000-0000-0000-000000000001', 29.99,  0.75),
    ('d0000001-0000-0000-0000-000000000005', 'ELEC-005', 'Ethernet Cable Cat6 25ft','Cat6 ethernet cable, 25 feet, blue',                    'c0000001-0000-0000-0000-000000000001', 14.99,  0.30),
    -- Raw Materials (5)
    ('d0000001-0000-0000-0000-000000000006', 'RAW-001',  'Steel Sheet 4x8',         'Cold-rolled steel sheet, 4ft x 8ft, 16 gauge',          'c0000001-0000-0000-0000-000000000002', 89.00,  45.00),
    ('d0000001-0000-0000-0000-000000000007', 'RAW-002',  'Aluminum Extrusion 6ft',  'T-slot aluminum extrusion, 6 feet',                     'c0000001-0000-0000-0000-000000000002', 34.50,  2.50),
    ('d0000001-0000-0000-0000-000000000008', 'RAW-003',  'Copper Wire Spool 100m',  'Copper wire, 14 AWG, 100 meter spool',                  'c0000001-0000-0000-0000-000000000002', 67.00,  4.20),
    ('d0000001-0000-0000-0000-000000000009', 'RAW-004',  'PVC Pipe 10ft',           'Schedule 40 PVC pipe, 2 inch diameter, 10 feet',        'c0000001-0000-0000-0000-000000000002', 12.75,  3.10),
    ('d0000001-0000-0000-0000-000000000010', 'RAW-005',  'Rubber Gasket Set',       'Assorted rubber gaskets, 50-piece set',                 'c0000001-0000-0000-0000-000000000002', 22.00,  0.80),
    -- Packaging (5)
    ('d0000001-0000-0000-0000-000000000011', 'PKG-001',  'Cardboard Box 12x12x12',  'Standard corrugated box, 12" cube',                     'c0000001-0000-0000-0000-000000000003', 2.50,   0.45),
    ('d0000001-0000-0000-0000-000000000012', 'PKG-002',  'Bubble Wrap Roll 100ft',  'Standard bubble wrap, 12" wide, 100 feet',              'c0000001-0000-0000-0000-000000000003', 18.99,  2.00),
    ('d0000001-0000-0000-0000-000000000013', 'PKG-003',  'Packing Tape 6-Pack',     'Clear packing tape, 2" wide, 110 yards, 6 rolls',      'c0000001-0000-0000-0000-000000000003', 15.99,  1.80),
    ('d0000001-0000-0000-0000-000000000014', 'PKG-004',  'Shipping Labels 500ct',   'Self-adhesive shipping labels, 4x6", 500 count',       'c0000001-0000-0000-0000-000000000003', 24.00,  1.20),
    ('d0000001-0000-0000-0000-000000000015', 'PKG-005',  'Packing Peanuts 14cuft',  'Biodegradable packing peanuts, 14 cubic feet bag',     'c0000001-0000-0000-0000-000000000003', 28.50,  1.50),
    -- Office Supplies (5)
    ('d0000001-0000-0000-0000-000000000016', 'OFF-001',  'Copy Paper Ream 500ct',   'White copy paper, letter size, 500 sheets',             'c0000001-0000-0000-0000-000000000004', 8.99,   2.50),
    ('d0000001-0000-0000-0000-000000000017', 'OFF-002',  'Ballpoint Pen Box 12ct',  'Blue ballpoint pens, medium point, 12 pack',           'c0000001-0000-0000-0000-000000000004', 6.49,   0.20),
    ('d0000001-0000-0000-0000-000000000018', 'OFF-003',  'Sticky Notes 12-Pack',    'Yellow sticky notes, 3x3", 100 sheets each, 12 pads', 'c0000001-0000-0000-0000-000000000004', 11.99,  0.60),
    ('d0000001-0000-0000-0000-000000000019', 'OFF-004',  'Binder Clips Assorted',   'Assorted binder clips, small/medium/large, 60 count',  'c0000001-0000-0000-0000-000000000004', 7.49,   0.50),
    ('d0000001-0000-0000-0000-000000000020', 'OFF-005',  'Printer Toner Black',     'Compatible black toner cartridge, high yield',          'c0000001-0000-0000-0000-000000000004', 45.00,  0.80),
    -- Safety Equipment (5)
    ('d0000001-0000-0000-0000-000000000021', 'SAF-001',  'Safety Glasses Clear',    'ANSI Z87.1 rated clear safety glasses',                 'c0000001-0000-0000-0000-000000000005', 8.99,   0.10),
    ('d0000001-0000-0000-0000-000000000022', 'SAF-002',  'Nitrile Gloves Box 100',  'Disposable nitrile gloves, medium, 100 count',          'c0000001-0000-0000-0000-000000000005', 14.99,  0.60),
    ('d0000001-0000-0000-0000-000000000023', 'SAF-003',  'Hard Hat White',          'Type I, Class E hard hat, white, adjustable',           'c0000001-0000-0000-0000-000000000005', 19.99,  0.40),
    ('d0000001-0000-0000-0000-000000000024', 'SAF-004',  'Fire Extinguisher 5lb',   'ABC dry chemical fire extinguisher, 5 lb',              'c0000001-0000-0000-0000-000000000005', 49.99,  3.50),
    ('d0000001-0000-0000-0000-000000000025', 'SAF-005',  'First Aid Kit 50-Person', 'OSHA-compliant first aid kit for 50 persons',           'c0000001-0000-0000-0000-000000000005', 39.99,  2.80)
ON CONFLICT (sku) DO NOTHING;

-- Inventory (stock levels — distribute products across zones)
INSERT INTO inventory (product_id, zone_id, quantity, min_threshold) VALUES
    -- Electronics in Storage Zone A
    ('d0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000002', 250, 50),
    ('d0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000002', 120, 25),
    ('d0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000002', 85,  20),
    ('d0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000002', 60,  15),
    ('d0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000002', 180, 30),
    -- Raw Materials in Storage Zone B
    ('d0000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000003', 30,  10),
    ('d0000001-0000-0000-0000-000000000007', 'b0000001-0000-0000-0000-000000000003', 75,  20),
    ('d0000001-0000-0000-0000-000000000008', 'b0000001-0000-0000-0000-000000000003', 40,  15),
    ('d0000001-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000003', 100, 25),
    ('d0000001-0000-0000-0000-000000000010', 'b0000001-0000-0000-0000-000000000003', 200, 30),
    -- Packaging in Storage Zone A
    ('d0000001-0000-0000-0000-000000000011', 'b0000001-0000-0000-0000-000000000002', 500, 100),
    ('d0000001-0000-0000-0000-000000000012', 'b0000001-0000-0000-0000-000000000002', 45,  20),
    ('d0000001-0000-0000-0000-000000000013', 'b0000001-0000-0000-0000-000000000002', 80,  25),
    ('d0000001-0000-0000-0000-000000000014', 'b0000001-0000-0000-0000-000000000002', 15,  20),  -- LOW STOCK!
    ('d0000001-0000-0000-0000-000000000015', 'b0000001-0000-0000-0000-000000000002', 35,  15),
    -- Office Supplies in Storage Zone A
    ('d0000001-0000-0000-0000-000000000016', 'b0000001-0000-0000-0000-000000000002', 300, 50),
    ('d0000001-0000-0000-0000-000000000017', 'b0000001-0000-0000-0000-000000000002', 150, 30),
    ('d0000001-0000-0000-0000-000000000018', 'b0000001-0000-0000-0000-000000000002', 90,  25),
    ('d0000001-0000-0000-0000-000000000019', 'b0000001-0000-0000-0000-000000000002', 200, 40),
    ('d0000001-0000-0000-0000-000000000020', 'b0000001-0000-0000-0000-000000000002', 8,   10),  -- LOW STOCK!
    -- Safety Equipment in Cold Storage (temperature sensitive items) and Storage Zone B
    ('d0000001-0000-0000-0000-000000000021', 'b0000001-0000-0000-0000-000000000003', 400, 50),
    ('d0000001-0000-0000-0000-000000000022', 'b0000001-0000-0000-0000-000000000004', 75,  30),
    ('d0000001-0000-0000-0000-000000000023', 'b0000001-0000-0000-0000-000000000003', 60,  15),
    ('d0000001-0000-0000-0000-000000000024', 'b0000001-0000-0000-0000-000000000003', 25,  10),
    ('d0000001-0000-0000-0000-000000000025', 'b0000001-0000-0000-0000-000000000003', 5,   10)  -- LOW STOCK!
ON CONFLICT (product_id, zone_id) DO NOTHING;

-- Inbound Shipments (5 historical)
INSERT INTO inbound_shipments (id, reference_number, supplier_id, expected_date, received_date, status, notes, created_by) VALUES
    ('e0000001-0000-0000-0000-000000000001', 'SHP-2026-001', '10000001-0000-0000-0000-000000000001', '2026-03-01', '2026-03-02', 'Received',           'Regular monthly order from Acme',         'a0000001-0000-0000-0000-000000000002'),
    ('e0000001-0000-0000-0000-000000000002', 'SHP-2026-002', '10000001-0000-0000-0000-000000000002', '2026-03-10', '2026-03-12', 'Received',           'Bulk raw materials order',                'a0000001-0000-0000-0000-000000000002'),
    ('e0000001-0000-0000-0000-000000000003', 'SHP-2026-003', '10000001-0000-0000-0000-000000000003', '2026-03-15', '2026-03-15', 'Received',           'Rush order — packaging supplies',         'a0000001-0000-0000-0000-000000000003'),
    ('e0000001-0000-0000-0000-000000000004', 'SHP-2026-004', '10000001-0000-0000-0000-000000000001', '2026-04-01', '2026-04-02', 'Partially Received', 'Some items backordered',                  'a0000001-0000-0000-0000-000000000002'),
    ('e0000001-0000-0000-0000-000000000005', 'SHP-2026-005', '10000001-0000-0000-0000-000000000002', '2026-04-15', NULL,         'Pending',            'Upcoming order — electronics restock',    'a0000001-0000-0000-0000-000000000003')
ON CONFLICT (reference_number) DO NOTHING;

-- Inbound Shipment Items
INSERT INTO inbound_shipment_items (shipment_id, product_id, expected_qty, received_qty, zone_id) VALUES
    -- SHP-2026-001 (Acme — electronics)
    ('e0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 100, 100, 'b0000001-0000-0000-0000-000000000001'),
    ('e0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000002', 50,  50,  'b0000001-0000-0000-0000-000000000001'),
    ('e0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000004', 30,  30,  'b0000001-0000-0000-0000-000000000001'),
    -- SHP-2026-002 (GlobalParts — raw materials)
    ('e0000001-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000006', 20,  20,  'b0000001-0000-0000-0000-000000000001'),
    ('e0000001-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000007', 40,  40,  'b0000001-0000-0000-0000-000000000001'),
    ('e0000001-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000008', 25,  25,  'b0000001-0000-0000-0000-000000000001'),
    -- SHP-2026-003 (FastShip — packaging)
    ('e0000001-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000011', 200, 200, 'b0000001-0000-0000-0000-000000000001'),
    ('e0000001-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000012', 30,  30,  'b0000001-0000-0000-0000-000000000001'),
    -- SHP-2026-004 (Acme — partial)
    ('e0000001-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000003', 50,  35,  'b0000001-0000-0000-0000-000000000001'),
    ('e0000001-0000-0000-0000-000000000004', 'd0000001-0000-0000-0000-000000000005', 100, 100, 'b0000001-0000-0000-0000-000000000001'),
    -- SHP-2026-005 (pending — nothing received yet)
    ('e0000001-0000-0000-0000-000000000005', 'd0000001-0000-0000-0000-000000000001', 150, 0,   NULL),
    ('e0000001-0000-0000-0000-000000000005', 'd0000001-0000-0000-0000-000000000002', 75,  0,   NULL)
ON CONFLICT DO NOTHING;

-- Outbound Orders (3 in various statuses)
INSERT INTO outbound_orders (id, order_number, status, destination, customer_name, priority, notes, created_by, created_at, shipped_at) VALUES
    ('f0000001-0000-0000-0000-000000000001', 'ORD-2026-001', 'Shipped',  '1000 Main St, Elmhurst, IL 60126', 'Elmhurst Industries',  'Normal', 'Regular monthly fulfilment',    'a0000001-0000-0000-0000-000000000002', '2026-03-20 09:00:00+00', '2026-03-22 14:30:00+00'),
    ('f0000001-0000-0000-0000-000000000002', 'ORD-2026-002', 'Picking',  '250 Oak Ave, Chicago, IL 60601',   'Chicago Supply Co',     'High',   'Urgent — client needs by Friday','a0000001-0000-0000-0000-000000000003', '2026-04-08 10:00:00+00', NULL),
    ('f0000001-0000-0000-0000-000000000003', 'ORD-2026-003', 'Pending',  '500 Lake Shore Dr, Chicago, IL',   'Lakeshore Distribution','Normal', 'New order — awaiting approval', 'a0000001-0000-0000-0000-000000000002', '2026-04-10 08:00:00+00', NULL)
ON CONFLICT (order_number) DO NOTHING;

-- Outbound Order Items
INSERT INTO outbound_order_items (order_id, product_id, quantity, zone_id, picked_at, packed_at) VALUES
    -- ORD-2026-001 (Shipped)
    ('f0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000001', 25, 'b0000001-0000-0000-0000-000000000002', '2026-03-20 11:00:00+00', '2026-03-21 09:00:00+00'),
    ('f0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000016', 50, 'b0000001-0000-0000-0000-000000000002', '2026-03-20 11:30:00+00', '2026-03-21 09:30:00+00'),
    ('f0000001-0000-0000-0000-000000000001', 'd0000001-0000-0000-0000-000000000021', 100,'b0000001-0000-0000-0000-000000000003', '2026-03-20 12:00:00+00', '2026-03-21 10:00:00+00'),
    -- ORD-2026-002 (Picking in progress)
    ('f0000001-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000011', 100,'b0000001-0000-0000-0000-000000000002', '2026-04-09 09:00:00+00', NULL),
    ('f0000001-0000-0000-0000-000000000002', 'd0000001-0000-0000-0000-000000000013', 20, 'b0000001-0000-0000-0000-000000000002', NULL, NULL),
    -- ORD-2026-003 (Pending — nothing picked)
    ('f0000001-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000002', 10, NULL, NULL, NULL),
    ('f0000001-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000022', 50, NULL, NULL, NULL),
    ('f0000001-0000-0000-0000-000000000003', 'd0000001-0000-0000-0000-000000000024', 5,  NULL, NULL, NULL)
ON CONFLICT DO NOTHING;

-- Stock Adjustments (historical)
INSERT INTO stock_adjustments (product_id, zone_id, qty_change, reason, notes, adjusted_by) VALUES
    ('d0000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000003', -2, 'Damaged',    'Two steel sheets arrived bent, returned to supplier',        'a0000001-0000-0000-0000-000000000004'),
    ('d0000001-0000-0000-0000-000000000022', 'b0000001-0000-0000-0000-000000000004', -5, 'Expired',    'Gloves past expiration date, disposed',                      'a0000001-0000-0000-0000-000000000004'),
    ('d0000001-0000-0000-0000-000000000017', 'b0000001-0000-0000-0000-000000000002', 12, 'Found',      'Found extra box during annual inventory count',              'a0000001-0000-0000-0000-000000000005'),
    ('d0000001-0000-0000-0000-000000000011', 'b0000001-0000-0000-0000-000000000002', -10,'Correction', 'Physical count mismatch — adjusted to actual',               'a0000001-0000-0000-0000-000000000003'),
    ('d0000001-0000-0000-0000-000000000025', 'b0000001-0000-0000-0000-000000000003', -3, 'Damaged',    'First aid kits water damaged in storage',                    'a0000001-0000-0000-0000-000000000004')
ON CONFLICT DO NOTHING;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_user;
