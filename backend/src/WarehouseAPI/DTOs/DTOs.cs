using System.ComponentModel.DataAnnotations;

namespace WarehouseAPI.DTOs;

// ============================================================
// AUTH
// ============================================================

public record LoginRequest(
    [Required] string Username,
    [Required] string Password
);

public record LoginResponse(
    string Token,
    string Username,
    string FullName,
    string Role,
    DateTime ExpiresAt
);

// ============================================================
// PRODUCTS
// ============================================================

public record ProductDto(
    Guid Id,
    string Sku,
    string Name,
    string? Description,
    Guid? CategoryId,
    string? CategoryName,
    decimal UnitPrice,
    decimal? WeightKg,
    decimal? LengthCm,
    decimal? WidthCm,
    decimal? HeightCm,
    string? ImageUrl,
    bool IsActive,
    int TotalStock,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

public record CreateProductRequest(
    [Required, MaxLength(50)] string Sku,
    [Required, MaxLength(255)] string Name,
    string? Description,
    Guid? CategoryId,
    [Range(0, double.MaxValue)] decimal UnitPrice,
    decimal? WeightKg,
    decimal? LengthCm,
    decimal? WidthCm,
    decimal? HeightCm,
    string? ImageUrl
);

public record UpdateProductRequest(
    [MaxLength(255)] string? Name,
    string? Description,
    Guid? CategoryId,
    [Range(0, double.MaxValue)] decimal? UnitPrice,
    decimal? WeightKg,
    decimal? LengthCm,
    decimal? WidthCm,
    decimal? HeightCm,
    string? ImageUrl,
    bool? IsActive
);

// ============================================================
// CATEGORIES
// ============================================================

public record CategoryDto(
    Guid Id,
    string Name,
    string? Description,
    int ProductCount,
    DateTime CreatedAt
);

public record CreateCategoryRequest(
    [Required, MaxLength(100)] string Name,
    string? Description
);

public record UpdateCategoryRequest(
    [MaxLength(100)] string? Name,
    string? Description
);

// ============================================================
// WAREHOUSE ZONES
// ============================================================

public record WarehouseZoneDto(
    Guid Id,
    string Name,
    string ZoneType,
    int Capacity,
    int CurrentUtilization,
    double UtilizationPercent,
    string? Description,
    bool IsActive,
    DateTime CreatedAt
);

public record CreateZoneRequest(
    [Required, MaxLength(100)] string Name,
    [Required, MaxLength(50)] string ZoneType,
    [Range(1, int.MaxValue)] int Capacity,
    string? Description
);

public record UpdateZoneRequest(
    [MaxLength(100)] string? Name,
    [MaxLength(50)] string? ZoneType,
    [Range(1, int.MaxValue)] int? Capacity,
    string? Description,
    bool? IsActive
);

// ============================================================
// INVENTORY
// ============================================================

public record InventoryDto(
    Guid Id,
    Guid ProductId,
    string ProductName,
    string ProductSku,
    Guid ZoneId,
    string ZoneName,
    int Quantity,
    int MinThreshold,
    int? MaxThreshold,
    bool IsLowStock,
    decimal StockValue,
    DateTime LastUpdated
);

public record StockAdjustmentRequest(
    [Required] Guid ProductId,
    [Required] Guid ZoneId,
    [Required] int QtyChange,
    [Required, MaxLength(50)] string Reason,
    string? Notes
);

public record StockAdjustmentDto(
    Guid Id,
    Guid ProductId,
    string ProductName,
    string ProductSku,
    Guid ZoneId,
    string ZoneName,
    int QtyChange,
    string Reason,
    string? Notes,
    string? AdjustedByName,
    DateTime CreatedAt
);

public record LowStockAlertDto(
    Guid ProductId,
    string ProductName,
    string ProductSku,
    string ZoneName,
    int Quantity,
    int MinThreshold,
    int Deficit
);

// ============================================================
// SUPPLIERS
// ============================================================

public record SupplierDto(
    Guid Id,
    string Name,
    string? ContactEmail,
    string? Phone,
    string? Address,
    decimal Rating,
    bool IsActive,
    int ShipmentCount,
    DateTime CreatedAt
);

public record CreateSupplierRequest(
    [Required, MaxLength(255)] string Name,
    [MaxLength(255)] string? ContactEmail,
    [MaxLength(50)] string? Phone,
    string? Address,
    [Range(0, 5)] decimal? Rating
);

public record UpdateSupplierRequest(
    [MaxLength(255)] string? Name,
    [MaxLength(255)] string? ContactEmail,
    [MaxLength(50)] string? Phone,
    string? Address,
    [Range(0, 5)] decimal? Rating,
    bool? IsActive
);

// ============================================================
// INBOUND SHIPMENTS
// ============================================================

public record InboundShipmentDto(
    Guid Id,
    string ReferenceNumber,
    Guid SupplierId,
    string SupplierName,
    DateOnly ExpectedDate,
    DateOnly? ReceivedDate,
    string Status,
    string? Notes,
    string? CreatedByName,
    List<InboundShipmentItemDto> Items,
    DateTime CreatedAt
);

public record InboundShipmentItemDto(
    Guid Id,
    Guid ProductId,
    string ProductName,
    string ProductSku,
    int ExpectedQty,
    int ReceivedQty,
    Guid? ZoneId,
    string? ZoneName,
    string? Notes
);

public record CreateShipmentRequest(
    [Required] Guid SupplierId,
    [Required] DateOnly ExpectedDate,
    string? Notes,
    [Required, MinLength(1)] List<CreateShipmentItemRequest> Items
);

public record CreateShipmentItemRequest(
    [Required] Guid ProductId,
    [Required, Range(1, int.MaxValue)] int ExpectedQty,
    Guid? ZoneId
);

public record ReceiveShipmentRequest(
    [Required, MinLength(1)] List<ReceiveShipmentItemRequest> Items,
    string? Notes
);

public record ReceiveShipmentItemRequest(
    [Required] Guid ItemId,
    [Required, Range(0, int.MaxValue)] int ReceivedQty,
    Guid? ZoneId
);

// ============================================================
// OUTBOUND ORDERS
// ============================================================

public record OutboundOrderDto(
    Guid Id,
    string OrderNumber,
    string Status,
    string Destination,
    string? CustomerName,
    string Priority,
    string? Notes,
    string? CreatedByName,
    List<OutboundOrderItemDto> Items,
    DateTime CreatedAt,
    DateTime? ShippedAt,
    DateTime? DeliveredAt
);

public record OutboundOrderItemDto(
    Guid Id,
    Guid ProductId,
    string ProductName,
    string ProductSku,
    int Quantity,
    Guid? ZoneId,
    string? ZoneName,
    DateTime? PickedAt,
    DateTime? PackedAt
);

public record CreateOrderRequest(
    [Required] string Destination,
    [MaxLength(255)] string? CustomerName,
    [MaxLength(20)] string? Priority,
    string? Notes,
    [Required, MinLength(1)] List<CreateOrderItemRequest> Items
);

public record CreateOrderItemRequest(
    [Required] Guid ProductId,
    [Required, Range(1, int.MaxValue)] int Quantity,
    Guid? ZoneId
);

public record UpdateOrderStatusRequest(
    [Required] string Status // Picking, Picked, Packing, Packed, Shipped, Delivered, Cancelled
);

// ============================================================
// ANALYTICS / DASHBOARD
// ============================================================

public record DashboardSummaryDto(
    int TotalProducts,
    int TotalStock,
    decimal TotalStockValue,
    int LowStockCount,
    int PendingShipments,
    int PendingOrders,
    int ShippedToday,
    int ReceivedToday
);

public record StockValueByCategoryDto(
    string Category,
    int ProductCount,
    int TotalQuantity,
    decimal TotalValue
);

public record InventoryTurnoverDto(
    string Month,
    int Year,
    int TotalIn,
    int TotalOut,
    int NetChange
);

public record SupplierPerformanceDto(
    string SupplierName,
    decimal Rating,
    int TotalOrders,
    int TotalQuantity,
    double? AvgFulfillmentDays
);

public record ZoneUtilizationDto(
    string ZoneName,
    string ZoneType,
    int Capacity,
    int CurrentStock,
    double UtilizationPercent,
    decimal StockValue
);

public record OrderFulfillmentDto(
    string Date,
    string OrderType,
    int OrderCount,
    int TotalQuantity,
    double? AvgFulfillmentDays,
    int CompletedCount,
    int PendingCount
);

// ============================================================
// COMMON
// ============================================================

public record PagedResult<T>(
    List<T> Items,
    int TotalCount,
    int Page,
    int PageSize,
    int TotalPages
);

public record ApiError(
    string Message,
    string? Detail = null,
    Dictionary<string, string[]>? Errors = null
);
