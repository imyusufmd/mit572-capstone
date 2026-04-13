using Microsoft.EntityFrameworkCore;
using WarehouseAPI.Data;
using WarehouseAPI.DTOs;
using WarehouseAPI.Models;

namespace WarehouseAPI.Services;

public interface IInventoryService
{
    Task<PagedResult<InventoryDto>> GetAllAsync(int page, int pageSize, Guid? zoneId, bool? lowStockOnly);
    Task<InventoryDto?> GetByIdAsync(Guid id);
    Task<List<LowStockAlertDto>> GetLowStockAlertsAsync();
    Task<StockAdjustmentDto> AdjustStockAsync(StockAdjustmentRequest request, Guid? userId);
    Task<PagedResult<StockAdjustmentDto>> GetAdjustmentHistoryAsync(int page, int pageSize, Guid? productId);
    Task UpdateStockAsync(Guid productId, Guid zoneId, int quantityChange);
}

public class InventoryService : IInventoryService
{
    private readonly WarehouseDbContext _db;

    public InventoryService(WarehouseDbContext db) => _db = db;

    public async Task<PagedResult<InventoryDto>> GetAllAsync(int page, int pageSize, Guid? zoneId, bool? lowStockOnly)
    {
        var query = _db.Inventory
            .Include(i => i.Product)
            .Include(i => i.Zone)
            .AsQueryable();

        if (zoneId.HasValue)
            query = query.Where(i => i.ZoneId == zoneId.Value);

        if (lowStockOnly == true)
            query = query.Where(i => i.Quantity <= i.MinThreshold);

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderBy(i => i.Product.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(i => new InventoryDto(
                i.Id, i.ProductId, i.Product.Name, i.Product.Sku,
                i.ZoneId, i.Zone.Name,
                i.Quantity, i.MinThreshold, i.MaxThreshold,
                i.Quantity <= i.MinThreshold,
                i.Quantity * i.Product.UnitPrice,
                i.LastUpdated))
            .ToListAsync();

        return new PagedResult<InventoryDto>(items, totalCount, page, pageSize, (int)Math.Ceiling(totalCount / (double)pageSize));
    }

    public async Task<InventoryDto?> GetByIdAsync(Guid id)
    {
        var i = await _db.Inventory
            .Include(x => x.Product)
            .Include(x => x.Zone)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (i is null) return null;

        return new InventoryDto(
            i.Id, i.ProductId, i.Product.Name, i.Product.Sku,
            i.ZoneId, i.Zone.Name,
            i.Quantity, i.MinThreshold, i.MaxThreshold,
            i.Quantity <= i.MinThreshold,
            i.Quantity * i.Product.UnitPrice,
            i.LastUpdated);
    }

    public async Task<List<LowStockAlertDto>> GetLowStockAlertsAsync()
    {
        return await _db.Inventory
            .Include(i => i.Product)
            .Include(i => i.Zone)
            .Where(i => i.Quantity <= i.MinThreshold)
            .Select(i => new LowStockAlertDto(
                i.ProductId, i.Product.Name, i.Product.Sku,
                i.Zone.Name, i.Quantity, i.MinThreshold,
                i.MinThreshold - i.Quantity))
            .OrderByDescending(a => a.Deficit)
            .ToListAsync();
    }

    public async Task<StockAdjustmentDto> AdjustStockAsync(StockAdjustmentRequest request, Guid? userId)
    {
        // Find or create inventory record
        var inventory = await _db.Inventory
            .FirstOrDefaultAsync(i => i.ProductId == request.ProductId && i.ZoneId == request.ZoneId);

        if (inventory is null)
        {
            inventory = new Inventory
            {
                ProductId = request.ProductId,
                ZoneId = request.ZoneId,
                Quantity = 0
            };
            _db.Inventory.Add(inventory);
        }

        var newQty = inventory.Quantity + request.QtyChange;
        if (newQty < 0)
            throw new InvalidOperationException($"Adjustment would result in negative stock ({newQty}). Current: {inventory.Quantity}, Change: {request.QtyChange}");

        inventory.Quantity = newQty;
        inventory.LastUpdated = DateTime.UtcNow;

        // Create adjustment record
        var adjustment = new StockAdjustment
        {
            ProductId = request.ProductId,
            ZoneId = request.ZoneId,
            QtyChange = request.QtyChange,
            Reason = request.Reason,
            Notes = request.Notes,
            AdjustedBy = userId
        };
        _db.StockAdjustments.Add(adjustment);

        await _db.SaveChangesAsync();

        // Return DTO
        var product = await _db.Products.FindAsync(request.ProductId);
        var zone = await _db.WarehouseZones.FindAsync(request.ZoneId);
        var adjuster = userId.HasValue ? await _db.Users.FindAsync(userId.Value) : null;

        return new StockAdjustmentDto(
            adjustment.Id, adjustment.ProductId, product?.Name ?? "", product?.Sku ?? "",
            adjustment.ZoneId, zone?.Name ?? "",
            adjustment.QtyChange, adjustment.Reason, adjustment.Notes,
            adjuster?.FullName, adjustment.CreatedAt);
    }

    public async Task<PagedResult<StockAdjustmentDto>> GetAdjustmentHistoryAsync(int page, int pageSize, Guid? productId)
    {
        var query = _db.StockAdjustments
            .Include(sa => sa.Product)
            .Include(sa => sa.Zone)
            .Include(sa => sa.Adjuster)
            .AsQueryable();

        if (productId.HasValue)
            query = query.Where(sa => sa.ProductId == productId.Value);

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(sa => sa.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(sa => new StockAdjustmentDto(
                sa.Id, sa.ProductId, sa.Product.Name, sa.Product.Sku,
                sa.ZoneId, sa.Zone.Name,
                sa.QtyChange, sa.Reason, sa.Notes,
                sa.Adjuster != null ? sa.Adjuster.FullName : null,
                sa.CreatedAt))
            .ToListAsync();

        return new PagedResult<StockAdjustmentDto>(items, totalCount, page, pageSize, (int)Math.Ceiling(totalCount / (double)pageSize));
    }

    public async Task UpdateStockAsync(Guid productId, Guid zoneId, int quantityChange)
    {
        var inventory = await _db.Inventory
            .FirstOrDefaultAsync(i => i.ProductId == productId && i.ZoneId == zoneId);

        if (inventory is null)
        {
            inventory = new Inventory
            {
                ProductId = productId,
                ZoneId = zoneId,
                Quantity = Math.Max(0, quantityChange)
            };
            _db.Inventory.Add(inventory);
        }
        else
        {
            inventory.Quantity = Math.Max(0, inventory.Quantity + quantityChange);
            inventory.LastUpdated = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync();
    }
}
