using Microsoft.EntityFrameworkCore;
using WarehouseAPI.Models;

namespace WarehouseAPI.Data;

public class WarehouseDbContext : DbContext
{
    public WarehouseDbContext(DbContextOptions<WarehouseDbContext> options)
        : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<WarehouseZone> WarehouseZones => Set<WarehouseZone>();
    public DbSet<Inventory> Inventory => Set<Inventory>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<InboundShipment> InboundShipments => Set<InboundShipment>();
    public DbSet<InboundShipmentItem> InboundShipmentItems => Set<InboundShipmentItem>();
    public DbSet<OutboundOrder> OutboundOrders => Set<OutboundOrder>();
    public DbSet<OutboundOrderItem> OutboundOrderItems => Set<OutboundOrderItem>();
    public DbSet<StockAdjustment> StockAdjustments => Set<StockAdjustment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Table name mapping (snake_case to match PostgreSQL conventions)
        modelBuilder.Entity<User>().ToTable("users");
        modelBuilder.Entity<Category>().ToTable("categories");
        modelBuilder.Entity<Product>().ToTable("products");
        modelBuilder.Entity<WarehouseZone>().ToTable("warehouse_zones");
        modelBuilder.Entity<Inventory>().ToTable("inventory");
        modelBuilder.Entity<Supplier>().ToTable("suppliers");
        modelBuilder.Entity<InboundShipment>().ToTable("inbound_shipments");
        modelBuilder.Entity<InboundShipmentItem>().ToTable("inbound_shipment_items");
        modelBuilder.Entity<OutboundOrder>().ToTable("outbound_orders");
        modelBuilder.Entity<OutboundOrderItem>().ToTable("outbound_order_items");
        modelBuilder.Entity<StockAdjustment>().ToTable("stock_adjustments");

        // Column name mapping (snake_case)
        ConfigureSnakeCaseColumns(modelBuilder);

        // Unique constraints
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username).IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => u.AdUsername).IsUnique()
            .HasFilter("ad_username IS NOT NULL");

        modelBuilder.Entity<Category>()
            .HasIndex(c => c.Name).IsUnique();

        modelBuilder.Entity<Product>()
            .HasIndex(p => p.Sku).IsUnique();

        modelBuilder.Entity<WarehouseZone>()
            .HasIndex(z => z.Name).IsUnique();

        modelBuilder.Entity<Inventory>()
            .HasIndex(i => new { i.ProductId, i.ZoneId }).IsUnique();

        modelBuilder.Entity<InboundShipment>()
            .HasIndex(s => s.ReferenceNumber).IsUnique();

        modelBuilder.Entity<OutboundOrder>()
            .HasIndex(o => o.OrderNumber).IsUnique();

        // Relationships
        modelBuilder.Entity<Product>()
            .HasOne(p => p.Category)
            .WithMany(c => c.Products)
            .HasForeignKey(p => p.CategoryId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Inventory>()
            .HasOne(i => i.Product)
            .WithMany(p => p.InventoryRecords)
            .HasForeignKey(i => i.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Inventory>()
            .HasOne(i => i.Zone)
            .WithMany(z => z.InventoryRecords)
            .HasForeignKey(i => i.ZoneId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<InboundShipment>()
            .HasOne(s => s.Supplier)
            .WithMany(sup => sup.Shipments)
            .HasForeignKey(s => s.SupplierId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<InboundShipmentItem>()
            .HasOne(si => si.Shipment)
            .WithMany(s => s.Items)
            .HasForeignKey(si => si.ShipmentId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<InboundShipmentItem>()
            .HasOne(si => si.Product)
            .WithMany()
            .HasForeignKey(si => si.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<OutboundOrderItem>()
            .HasOne(oi => oi.Order)
            .WithMany(o => o.Items)
            .HasForeignKey(oi => oi.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<OutboundOrderItem>()
            .HasOne(oi => oi.Product)
            .WithMany()
            .HasForeignKey(oi => oi.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<StockAdjustment>()
            .HasOne(sa => sa.Product)
            .WithMany()
            .HasForeignKey(sa => sa.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<StockAdjustment>()
            .HasOne(sa => sa.Zone)
            .WithMany()
            .HasForeignKey(sa => sa.ZoneId)
            .OnDelete(DeleteBehavior.Cascade);
    }

    private static void ConfigureSnakeCaseColumns(ModelBuilder modelBuilder)
    {
        foreach (var entity in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entity.GetProperties())
            {
                // Convert PascalCase to snake_case
                var snakeCaseName = ToSnakeCase(property.Name);
                property.SetColumnName(snakeCaseName);
            }
        }
    }

    private static string ToSnakeCase(string input)
    {
        if (string.IsNullOrEmpty(input)) return input;

        var result = new System.Text.StringBuilder();
        result.Append(char.ToLower(input[0]));

        for (int i = 1; i < input.Length; i++)
        {
            if (char.IsUpper(input[i]))
            {
                result.Append('_');
                result.Append(char.ToLower(input[i]));
            }
            else
            {
                result.Append(input[i]);
            }
        }

        return result.ToString();
    }
}
