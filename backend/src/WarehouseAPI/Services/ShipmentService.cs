using Microsoft.EntityFrameworkCore;
using WarehouseAPI.Data;
using WarehouseAPI.DTOs;
using WarehouseAPI.Models;

namespace WarehouseAPI.Services;

public interface IShipmentService
{
    Task<PagedResult<InboundShipmentDto>> GetAllAsync(int page, int pageSize, string? status);
    Task<InboundShipmentDto?> GetByIdAsync(Guid id);
    Task<InboundShipmentDto> CreateAsync(CreateShipmentRequest request, Guid? userId);
    Task<InboundShipmentDto?> ReceiveAsync(Guid id, ReceiveShipmentRequest request);
    Task<InboundShipmentDto?> CancelAsync(Guid id);
}

public class ShipmentService : IShipmentService
{
    private readonly WarehouseDbContext _db;
    private readonly IInventoryService _inventory;

    public ShipmentService(WarehouseDbContext db, IInventoryService inventory)
    {
        _db = db;
        _inventory = inventory;
    }

    public async Task<PagedResult<InboundShipmentDto>> GetAllAsync(int page, int pageSize, string? status)
    {
        var query = _db.InboundShipments
            .Include(s => s.Supplier)
            .Include(s => s.Creator)
            .Include(s => s.Items).ThenInclude(i => i.Product)
            .Include(s => s.Items).ThenInclude(i => i.Zone)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(s => s.Status == status);

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(s => s.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = items.Select(MapToDto).ToList();
        return new PagedResult<InboundShipmentDto>(dtos, totalCount, page, pageSize, (int)Math.Ceiling(totalCount / (double)pageSize));
    }

    public async Task<InboundShipmentDto?> GetByIdAsync(Guid id)
    {
        var shipment = await _db.InboundShipments
            .Include(s => s.Supplier)
            .Include(s => s.Creator)
            .Include(s => s.Items).ThenInclude(i => i.Product)
            .Include(s => s.Items).ThenInclude(i => i.Zone)
            .FirstOrDefaultAsync(s => s.Id == id);

        return shipment is null ? null : MapToDto(shipment);
    }

    public async Task<InboundShipmentDto> CreateAsync(CreateShipmentRequest request, Guid? userId)
    {
        // Generate reference number
        var count = await _db.InboundShipments.CountAsync() + 1;
        var refNumber = $"SHP-{DateTime.UtcNow:yyyy}-{count:D3}";

        var shipment = new InboundShipment
        {
            ReferenceNumber = refNumber,
            SupplierId = request.SupplierId,
            ExpectedDate = request.ExpectedDate,
            Status = "Pending",
            Notes = request.Notes,
            CreatedBy = userId,
            Items = request.Items.Select(i => new InboundShipmentItem
            {
                ProductId = i.ProductId,
                ExpectedQty = i.ExpectedQty,
                ZoneId = i.ZoneId,
                ReceivedQty = 0
            }).ToList()
        };

        _db.InboundShipments.Add(shipment);
        await _db.SaveChangesAsync();

        return await GetByIdAsync(shipment.Id) ?? MapToDto(shipment);
    }

    public async Task<InboundShipmentDto?> ReceiveAsync(Guid id, ReceiveShipmentRequest request)
    {
        var shipment = await _db.InboundShipments
            .Include(s => s.Items)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (shipment is null) return null;

        bool allReceived = true;
        bool anyReceived = false;

        foreach (var receiveItem in request.Items)
        {
            var item = shipment.Items.FirstOrDefault(i => i.Id == receiveItem.ItemId);
            if (item is null) continue;

            item.ReceivedQty = receiveItem.ReceivedQty;
            if (receiveItem.ZoneId.HasValue)
                item.ZoneId = receiveItem.ZoneId.Value;

            if (item.ReceivedQty > 0 && item.ZoneId.HasValue)
            {
                anyReceived = true;
                // Update stock levels
                await _inventory.UpdateStockAsync(item.ProductId, item.ZoneId.Value, item.ReceivedQty);
            }

            if (item.ReceivedQty < item.ExpectedQty)
                allReceived = false;
        }

        shipment.Status = allReceived ? "Received" : (anyReceived ? "Partially Received" : shipment.Status);
        shipment.ReceivedDate = allReceived ? DateOnly.FromDateTime(DateTime.UtcNow) : shipment.ReceivedDate;
        shipment.UpdatedAt = DateTime.UtcNow;

        if (!string.IsNullOrWhiteSpace(request.Notes))
            shipment.Notes = request.Notes;

        await _db.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public async Task<InboundShipmentDto?> CancelAsync(Guid id)
    {
        var shipment = await _db.InboundShipments.FirstOrDefaultAsync(s => s.Id == id);
        if (shipment is null) return null;

        if (!new[] { "Pending", "In Transit" }.Contains(shipment.Status))
            throw new InvalidOperationException($"Cannot cancel a shipment in '{shipment.Status}' status.");

        shipment.Status = "Cancelled";
        shipment.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    private static InboundShipmentDto MapToDto(InboundShipment s) => new(
        s.Id, s.ReferenceNumber,
        s.SupplierId, s.Supplier?.Name ?? "",
        s.ExpectedDate, s.ReceivedDate,
        s.Status, s.Notes,
        s.Creator?.FullName,
        s.Items.Select(i => new InboundShipmentItemDto(
            i.Id, i.ProductId, i.Product?.Name ?? "", i.Product?.Sku ?? "",
            i.ExpectedQty, i.ReceivedQty,
            i.ZoneId, i.Zone?.Name, i.Notes
        )).ToList(),
        s.CreatedAt);
}
