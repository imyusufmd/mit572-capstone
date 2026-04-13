using Microsoft.EntityFrameworkCore;
using WarehouseAPI.Data;
using WarehouseAPI.DTOs;

namespace WarehouseAPI.Services;

public interface IDashboardService
{
    Task<DashboardSummaryDto> GetSummaryAsync();
}

public class DashboardService : IDashboardService
{
    private readonly WarehouseDbContext _db;

    public DashboardService(WarehouseDbContext db) => _db = db;

    public async Task<DashboardSummaryDto> GetSummaryAsync()
    {
        var today = DateTime.UtcNow.Date;

        var totalProducts = await _db.Products.CountAsync(p => p.IsActive);

        var inventoryData = await _db.Inventory
            .Include(i => i.Product)
            .Where(i => i.Product.IsActive)
            .ToListAsync();

        var totalStock = inventoryData.Sum(i => i.Quantity);
        var totalStockValue = inventoryData.Sum(i => i.Quantity * i.Product.UnitPrice);
        var lowStockCount = inventoryData.Count(i => i.Quantity <= i.MinThreshold);

        var pendingShipments = await _db.InboundShipments
            .CountAsync(s => s.Status == "Pending" || s.Status == "In Transit");

        var pendingOrders = await _db.OutboundOrders
            .CountAsync(o => o.Status != "Shipped" && o.Status != "Delivered" && o.Status != "Cancelled");

        var shippedToday = await _db.OutboundOrders
            .CountAsync(o => o.ShippedAt != null && o.ShippedAt.Value.Date == today);

        var receivedToday = await _db.InboundShipments
            .CountAsync(s => s.ReceivedDate == DateOnly.FromDateTime(today));

        return new DashboardSummaryDto(
            totalProducts, totalStock, totalStockValue, lowStockCount,
            pendingShipments, pendingOrders, shippedToday, receivedToday);
    }
}
