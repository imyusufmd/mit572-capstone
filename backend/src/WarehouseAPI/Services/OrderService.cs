using Microsoft.EntityFrameworkCore;
using WarehouseAPI.Data;
using WarehouseAPI.DTOs;
using WarehouseAPI.Models;

namespace WarehouseAPI.Services;

public interface IOrderService
{
    Task<PagedResult<OutboundOrderDto>> GetAllAsync(int page, int pageSize, string? status);
    Task<OutboundOrderDto?> GetByIdAsync(Guid id);
    Task<OutboundOrderDto> CreateAsync(CreateOrderRequest request, Guid? userId);
    Task<OutboundOrderDto?> UpdateStatusAsync(Guid id, UpdateOrderStatusRequest request);
}

public class OrderService : IOrderService
{
    private readonly WarehouseDbContext _db;
    private readonly IInventoryService _inventory;

    public OrderService(WarehouseDbContext db, IInventoryService inventory)
    {
        _db = db;
        _inventory = inventory;
    }

    public async Task<PagedResult<OutboundOrderDto>> GetAllAsync(int page, int pageSize, string? status)
    {
        var query = _db.OutboundOrders
            .Include(o => o.Creator)
            .Include(o => o.Items).ThenInclude(i => i.Product)
            .Include(o => o.Items).ThenInclude(i => i.Zone)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(o => o.Status == status);

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var dtos = items.Select(MapToDto).ToList();
        return new PagedResult<OutboundOrderDto>(dtos, totalCount, page, pageSize, (int)Math.Ceiling(totalCount / (double)pageSize));
    }

    public async Task<OutboundOrderDto?> GetByIdAsync(Guid id)
    {
        var order = await _db.OutboundOrders
            .Include(o => o.Creator)
            .Include(o => o.Items).ThenInclude(i => i.Product)
            .Include(o => o.Items).ThenInclude(i => i.Zone)
            .FirstOrDefaultAsync(o => o.Id == id);

        return order is null ? null : MapToDto(order);
    }

    public async Task<OutboundOrderDto> CreateAsync(CreateOrderRequest request, Guid? userId)
    {
        var count = await _db.OutboundOrders.CountAsync() + 1;
        var orderNumber = $"ORD-{DateTime.UtcNow:yyyy}-{count:D3}";

        var order = new OutboundOrder
        {
            OrderNumber = orderNumber,
            Destination = request.Destination,
            CustomerName = request.CustomerName,
            Priority = request.Priority ?? "Normal",
            Notes = request.Notes,
            CreatedBy = userId,
            Items = request.Items.Select(i => new OutboundOrderItem
            {
                ProductId = i.ProductId,
                Quantity = i.Quantity,
                ZoneId = i.ZoneId
            }).ToList()
        };

        _db.OutboundOrders.Add(order);
        await _db.SaveChangesAsync();

        return await GetByIdAsync(order.Id) ?? MapToDto(order);
    }

    public async Task<OutboundOrderDto?> UpdateStatusAsync(Guid id, UpdateOrderStatusRequest request)
    {
        var order = await _db.OutboundOrders
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order is null) return null;

        var validTransitions = GetValidTransitions(order.Status);
        if (!validTransitions.Contains(request.Status))
            throw new InvalidOperationException(
                $"Cannot transition from '{order.Status}' to '{request.Status}'. Valid transitions: {string.Join(", ", validTransitions)}");

        order.Status = request.Status;
        order.UpdatedAt = DateTime.UtcNow;

        switch (request.Status)
        {
            case "Picking":
                // Mark items as being picked
                break;

            case "Picked":
                foreach (var item in order.Items)
                    item.PickedAt = DateTime.UtcNow;
                break;

            case "Packed":
                foreach (var item in order.Items)
                    item.PackedAt = DateTime.UtcNow;
                break;

            case "Shipped":
                order.ShippedAt = DateTime.UtcNow;
                // Deduct stock
                foreach (var item in order.Items.Where(i => i.ZoneId.HasValue))
                    await _inventory.UpdateStockAsync(item.ProductId, item.ZoneId!.Value, -item.Quantity);
                break;

            case "Delivered":
                order.DeliveredAt = DateTime.UtcNow;
                break;

            case "Cancelled":
                // If already shipped, we'd need to re-add stock (return flow)
                break;
        }

        await _db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    private static List<string> GetValidTransitions(string currentStatus) => currentStatus switch
    {
        "Pending" => ["Picking", "Cancelled"],
        "Picking" => ["Picked", "Cancelled"],
        "Picked" => ["Packing", "Cancelled"],
        "Packing" => ["Packed", "Cancelled"],
        "Packed" => ["Shipped", "Cancelled"],
        "Shipped" => ["Delivered"],
        _ => []
    };

    private static OutboundOrderDto MapToDto(OutboundOrder o) => new(
        o.Id, o.OrderNumber, o.Status,
        o.Destination, o.CustomerName, o.Priority, o.Notes,
        o.Creator?.FullName,
        o.Items.Select(i => new OutboundOrderItemDto(
            i.Id, i.ProductId, i.Product?.Name ?? "", i.Product?.Sku ?? "",
            i.Quantity, i.ZoneId, i.Zone?.Name,
            i.PickedAt, i.PackedAt
        )).ToList(),
        o.CreatedAt, o.ShippedAt, o.DeliveredAt);
}
