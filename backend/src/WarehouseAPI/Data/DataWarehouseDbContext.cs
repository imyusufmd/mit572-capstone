using Microsoft.EntityFrameworkCore;

namespace WarehouseAPI.Data;

/// <summary>
/// Read-only DbContext for the SQL Server data warehouse.
/// Used by analytics endpoints to query aggregated reporting data.
/// </summary>
public class DataWarehouseDbContext : DbContext
{
    public DataWarehouseDbContext(DbContextOptions<DataWarehouseDbContext> options)
        : base(options) { }

    // Keyless entity types mapped to views/tables
    public DbSet<DimProduct> DimProducts => Set<DimProduct>();
    public DbSet<DimZone> DimZones => Set<DimZone>();
    public DbSet<DimSupplier> DimSuppliers => Set<DimSupplier>();
    public DbSet<DimTime> DimTime => Set<DimTime>();
    public DbSet<FactStockMovement> FactStockMovements => Set<FactStockMovement>();
    public DbSet<FactOrder> FactOrders => Set<FactOrder>();
    public DbSet<FactInventorySnapshot> FactInventorySnapshots => Set<FactInventorySnapshot>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<DimProduct>(e =>
        {
            e.ToTable("dim_products").HasKey(d => d.ProductKey);
            e.Property(d => d.ProductKey).HasColumnName("product_key");
            e.Property(d => d.SourceId).HasColumnName("source_id");
            e.Property(d => d.Sku).HasColumnName("sku");
            e.Property(d => d.Name).HasColumnName("name");
            e.Property(d => d.Category).HasColumnName("category");
            e.Property(d => d.UnitPrice).HasColumnName("unit_price");
            e.Property(d => d.WeightKg).HasColumnName("weight_kg");
            e.Property(d => d.IsCurrent).HasColumnName("is_current");
            e.Property(d => d.EffectiveFrom).HasColumnName("effective_from");
            e.Property(d => d.EffectiveTo).HasColumnName("effective_to");
        });

        modelBuilder.Entity<DimZone>(e =>
        {
            e.ToTable("dim_zones").HasKey(d => d.ZoneKey);
            e.Property(d => d.ZoneKey).HasColumnName("zone_key");
            e.Property(d => d.SourceId).HasColumnName("source_id");
            e.Property(d => d.Name).HasColumnName("name");
            e.Property(d => d.ZoneType).HasColumnName("zone_type");
            e.Property(d => d.Capacity).HasColumnName("capacity");
        });

        modelBuilder.Entity<DimSupplier>(e =>
        {
            e.ToTable("dim_suppliers").HasKey(d => d.SupplierKey);
            e.Property(d => d.SupplierKey).HasColumnName("supplier_key");
            e.Property(d => d.SourceId).HasColumnName("source_id");
            e.Property(d => d.Name).HasColumnName("name");
            e.Property(d => d.ContactEmail).HasColumnName("contact_email");
            e.Property(d => d.Rating).HasColumnName("rating");
        });

        modelBuilder.Entity<DimTime>(e =>
        {
            e.ToTable("dim_time").HasKey(d => d.TimeKey);
            e.Property(d => d.TimeKey).HasColumnName("time_key");
            e.Property(d => d.FullDate).HasColumnName("full_date");
            e.Property(d => d.DayOfWeek).HasColumnName("day_of_week");
            e.Property(d => d.DayName).HasColumnName("day_name");
            e.Property(d => d.DayOfMonth).HasColumnName("day_of_month");
            e.Property(d => d.DayOfYear).HasColumnName("day_of_year");
            e.Property(d => d.WeekOfYear).HasColumnName("week_of_year");
            e.Property(d => d.MonthNumber).HasColumnName("month_number");
            e.Property(d => d.MonthName).HasColumnName("month_name");
            e.Property(d => d.Quarter).HasColumnName("quarter");
            e.Property(d => d.Year).HasColumnName("year");
            e.Property(d => d.IsWeekend).HasColumnName("is_weekend");
        });

        modelBuilder.Entity<FactStockMovement>(e =>
        {
            e.ToTable("fact_stock_movements").HasKey(f => f.MovementKey);
            e.Property(f => f.MovementKey).HasColumnName("movement_key");
            e.Property(f => f.ProductKey).HasColumnName("product_key");
            e.Property(f => f.ZoneKey).HasColumnName("zone_key");
            e.Property(f => f.TimeKey).HasColumnName("time_key");
            e.Property(f => f.SupplierKey).HasColumnName("supplier_key");
            e.Property(f => f.MovementType).HasColumnName("movement_type");
            e.Property(f => f.QtyIn).HasColumnName("qty_in");
            e.Property(f => f.QtyOut).HasColumnName("qty_out");
            e.Property(f => f.NetChange).HasColumnName("net_change");
            e.Property(f => f.ReferenceNumber).HasColumnName("reference_number");
        });

        modelBuilder.Entity<FactOrder>(e =>
        {
            e.ToTable("fact_orders").HasKey(f => f.OrderKey);
            e.Property(f => f.OrderKey).HasColumnName("order_key");
            e.Property(f => f.ProductKey).HasColumnName("product_key");
            e.Property(f => f.TimeKey).HasColumnName("time_key");
            e.Property(f => f.SupplierKey).HasColumnName("supplier_key");
            e.Property(f => f.OrderType).HasColumnName("order_type");
            e.Property(f => f.Quantity).HasColumnName("quantity");
            e.Property(f => f.Status).HasColumnName("status");
            e.Property(f => f.OrderReference).HasColumnName("order_reference");
            e.Property(f => f.FulfillmentDays).HasColumnName("fulfillment_days");
        });

        modelBuilder.Entity<FactInventorySnapshot>(e =>
        {
            e.ToTable("fact_inventory_snapshots").HasKey(f => f.SnapshotKey);
            e.Property(f => f.SnapshotKey).HasColumnName("snapshot_key");
            e.Property(f => f.ProductKey).HasColumnName("product_key");
            e.Property(f => f.ZoneKey).HasColumnName("zone_key");
            e.Property(f => f.TimeKey).HasColumnName("time_key");
            e.Property(f => f.QuantityOnHand).HasColumnName("quantity_on_hand");
            e.Property(f => f.MinThreshold).HasColumnName("min_threshold");
            e.Property(f => f.IsBelowThreshold).HasColumnName("is_below_threshold");
            e.Property(f => f.StockValue).HasColumnName("stock_value");
        });
    }
}

// Data warehouse entity types (read-only projections)

public class DimProduct
{
    public int ProductKey { get; set; }
    public string SourceId { get; set; } = string.Empty;
    public string Sku { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Category { get; set; }
    public decimal? UnitPrice { get; set; }
    public decimal? WeightKg { get; set; }
    public bool IsCurrent { get; set; }
    public DateTime EffectiveFrom { get; set; }
    public DateTime? EffectiveTo { get; set; }
}

public class DimZone
{
    public int ZoneKey { get; set; }
    public string SourceId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string ZoneType { get; set; } = string.Empty;
    public int Capacity { get; set; }
}

public class DimSupplier
{
    public int SupplierKey { get; set; }
    public string SourceId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? ContactEmail { get; set; }
    public decimal? Rating { get; set; }
}

public class DimTime
{
    public int TimeKey { get; set; }
    public DateOnly FullDate { get; set; }
    public byte DayOfWeek { get; set; }
    public string DayName { get; set; } = string.Empty;
    public byte DayOfMonth { get; set; }
    public short DayOfYear { get; set; }
    public byte WeekOfYear { get; set; }
    public byte MonthNumber { get; set; }
    public string MonthName { get; set; } = string.Empty;
    public byte Quarter { get; set; }
    public short Year { get; set; }
    public bool IsWeekend { get; set; }
}

public class FactStockMovement
{
    public long MovementKey { get; set; }
    public int ProductKey { get; set; }
    public int ZoneKey { get; set; }
    public int TimeKey { get; set; }
    public int? SupplierKey { get; set; }
    public string MovementType { get; set; } = string.Empty;
    public int QtyIn { get; set; }
    public int QtyOut { get; set; }
    public int NetChange { get; set; }
    public string? ReferenceNumber { get; set; }
}

public class FactOrder
{
    public long OrderKey { get; set; }
    public int ProductKey { get; set; }
    public int TimeKey { get; set; }
    public string OrderType { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? OrderReference { get; set; }
    public int? FulfillmentDays { get; set; }
    public int? SupplierKey { get; set; }
}

public class FactInventorySnapshot
{
    public long SnapshotKey { get; set; }
    public int ProductKey { get; set; }
    public int ZoneKey { get; set; }
    public int TimeKey { get; set; }
    public int QuantityOnHand { get; set; }
    public int MinThreshold { get; set; }
    public bool IsBelowThreshold { get; set; }
    public decimal StockValue { get; set; }
}
