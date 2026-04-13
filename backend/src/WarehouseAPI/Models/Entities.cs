using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace WarehouseAPI.Models;

public class User
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(100)]
    public string Username { get; set; } = string.Empty;

    [Required, MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [Required, MaxLength(255)]
    public string FullName { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string Role { get; set; } = "Staff"; // Admin, Manager, Staff

    [MaxLength(100)]
    public string? AdUsername { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class Category
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<Product> Products { get; set; } = [];
}

public class Product
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(50)]
    public string Sku { get; set; } = string.Empty;

    [Required, MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public Guid? CategoryId { get; set; }

    [Column(TypeName = "decimal(12,2)")]
    public decimal UnitPrice { get; set; }

    [Column(TypeName = "decimal(8,3)")]
    public decimal? WeightKg { get; set; }

    [Column(TypeName = "decimal(8,2)")]
    public decimal? LengthCm { get; set; }

    [Column(TypeName = "decimal(8,2)")]
    public decimal? WidthCm { get; set; }

    [Column(TypeName = "decimal(8,2)")]
    public decimal? HeightCm { get; set; }

    [MaxLength(500)]
    public string? ImageUrl { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("CategoryId")]
    public Category? Category { get; set; }
    public ICollection<Inventory> InventoryRecords { get; set; } = [];
}

public class WarehouseZone
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string ZoneType { get; set; } = string.Empty; // Receiving, Storage, Cold Storage, Shipping, Returns, Quarantine

    public int Capacity { get; set; } = 1000;

    public int CurrentUtilization { get; set; }

    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<Inventory> InventoryRecords { get; set; } = [];
}

public class Inventory
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid ProductId { get; set; }

    [Required]
    public Guid ZoneId { get; set; }

    public int Quantity { get; set; }

    public int MinThreshold { get; set; } = 10;

    public int? MaxThreshold { get; set; }

    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("ProductId")]
    public Product Product { get; set; } = null!;

    [ForeignKey("ZoneId")]
    public WarehouseZone Zone { get; set; } = null!;
}

public class Supplier
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(255)]
    public string? ContactEmail { get; set; }

    [MaxLength(50)]
    public string? Phone { get; set; }

    public string? Address { get; set; }

    [Column(TypeName = "decimal(3,2)")]
    public decimal Rating { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<InboundShipment> Shipments { get; set; } = [];
}

public class InboundShipment
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(50)]
    public string ReferenceNumber { get; set; } = string.Empty;

    [Required]
    public Guid SupplierId { get; set; }

    public DateOnly ExpectedDate { get; set; }

    public DateOnly? ReceivedDate { get; set; }

    [Required, MaxLength(30)]
    public string Status { get; set; } = "Pending"; // Pending, In Transit, Received, Partially Received, Cancelled

    public string? Notes { get; set; }

    public Guid? CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("SupplierId")]
    public Supplier Supplier { get; set; } = null!;

    [ForeignKey("CreatedBy")]
    public User? Creator { get; set; }

    public ICollection<InboundShipmentItem> Items { get; set; } = [];
}

public class InboundShipmentItem
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid ShipmentId { get; set; }

    [Required]
    public Guid ProductId { get; set; }

    public int ExpectedQty { get; set; }

    public int ReceivedQty { get; set; }

    public Guid? ZoneId { get; set; }

    public string? Notes { get; set; }

    // Navigation
    [ForeignKey("ShipmentId")]
    public InboundShipment Shipment { get; set; } = null!;

    [ForeignKey("ProductId")]
    public Product Product { get; set; } = null!;

    [ForeignKey("ZoneId")]
    public WarehouseZone? Zone { get; set; }
}

public class OutboundOrder
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required, MaxLength(50)]
    public string OrderNumber { get; set; } = string.Empty;

    [Required, MaxLength(30)]
    public string Status { get; set; } = "Pending"; // Pending, Picking, Picked, Packing, Packed, Shipped, Delivered, Cancelled

    [Required]
    public string Destination { get; set; } = string.Empty;

    [MaxLength(255)]
    public string? CustomerName { get; set; }

    [Required, MaxLength(20)]
    public string Priority { get; set; } = "Normal"; // Low, Normal, High, Urgent

    public string? Notes { get; set; }

    public Guid? CreatedBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ShippedAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("CreatedBy")]
    public User? Creator { get; set; }

    public ICollection<OutboundOrderItem> Items { get; set; } = [];
}

public class OutboundOrderItem
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid OrderId { get; set; }

    [Required]
    public Guid ProductId { get; set; }

    public int Quantity { get; set; }

    public Guid? ZoneId { get; set; }

    public DateTime? PickedAt { get; set; }
    public DateTime? PackedAt { get; set; }

    // Navigation
    [ForeignKey("OrderId")]
    public OutboundOrder Order { get; set; } = null!;

    [ForeignKey("ProductId")]
    public Product Product { get; set; } = null!;

    [ForeignKey("ZoneId")]
    public WarehouseZone? Zone { get; set; }
}

public class StockAdjustment
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid ProductId { get; set; }

    [Required]
    public Guid ZoneId { get; set; }

    public int QtyChange { get; set; }

    [Required, MaxLength(50)]
    public string Reason { get; set; } = string.Empty; // Damaged, Expired, Lost, Found, Correction, Return, Other

    public string? Notes { get; set; }

    public Guid? AdjustedBy { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [ForeignKey("ProductId")]
    public Product Product { get; set; } = null!;

    [ForeignKey("ZoneId")]
    public WarehouseZone Zone { get; set; } = null!;

    [ForeignKey("AdjustedBy")]
    public User? Adjuster { get; set; }
}
