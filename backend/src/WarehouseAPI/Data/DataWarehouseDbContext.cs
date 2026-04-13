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
        modelBuilder.Entity<DimProduct>().ToTable("dim_products").HasKey(d => d.ProductKey);
        modelBuilder.Entity<DimZone>().ToTable("dim_zones").HasKey(d => d.ZoneKey);
        modelBuilder.Entity<DimSupplier>().ToTable("dim_suppliers").HasKey(d => d.SupplierKey);
        modelBuilder.Entity<DimTime>().ToTable("dim_time").HasKey(d => d.TimeKey);
        modelBuilder.Entity<FactStockMovement>().ToTable("fact_stock_movements").HasKey(f => f.MovementKey);
        modelBuilder.Entity<FactOrder>().ToTable("fact_orders").HasKey(f => f.OrderKey);
        modelBuilder.Entity<FactInventorySnapshot>().ToTable("fact_inventory_snapshots").HasKey(f => f.SnapshotKey);
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
