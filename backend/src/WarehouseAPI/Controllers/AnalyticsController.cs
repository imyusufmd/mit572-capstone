using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WarehouseAPI.Data;
using WarehouseAPI.DTOs;

namespace WarehouseAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AnalyticsController : ControllerBase
{
    private readonly DataWarehouseDbContext _dw;
    private readonly ILogger<AnalyticsController> _logger;

    public AnalyticsController(DataWarehouseDbContext dw, ILogger<AnalyticsController> logger)
    {
        _dw = dw;
        _logger = logger;
    }

    [HttpGet("stock-value-by-category")]
    [ProducesResponseType(typeof(List<StockValueByCategoryDto>), 200)]
    public async Task<IActionResult> GetStockValueByCategory()
    {
        try
        {
            var rows = await _dw.FactInventorySnapshots
                .Join(_dw.DimProducts, s => s.ProductKey, p => p.ProductKey, (s, p) => new
                {
                    p.Category,
                    p.IsCurrent,
                    s.ProductKey,
                    s.QuantityOnHand,
                    s.StockValue
                })
                .Where(x => x.IsCurrent)
                .ToListAsync();

            var data = rows
                .GroupBy(x => x.Category ?? "Uncategorized")
                .Select(g => new StockValueByCategoryDto(
                    g.Key,
                    g.Select(x => x.ProductKey).Distinct().Count(),
                    g.Sum(x => x.QuantityOnHand),
                    g.Sum(x => x.StockValue)))
                .OrderByDescending(x => x.TotalValue)
                .ToList();

            return Ok(data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching stock value by category from data warehouse");
            return Ok(new List<StockValueByCategoryDto>());
        }
    }

    [HttpGet("inventory-turnover")]
    [ProducesResponseType(typeof(List<InventoryTurnoverDto>), 200)]
    public async Task<IActionResult> GetInventoryTurnover([FromQuery] int? year = null)
    {
        try
        {
            var targetYear = year ?? DateTime.UtcNow.Year;

            var rows = await _dw.FactStockMovements
                .Join(_dw.DimTime, m => m.TimeKey, t => t.TimeKey, (m, t) => new
                {
                    t.Year,
                    t.MonthNumber,
                    t.MonthName,
                    m.QtyIn,
                    m.QtyOut,
                    m.NetChange
                })
                .Where(x => x.Year == targetYear)
                .ToListAsync();

            var data = rows
                .GroupBy(x => new { x.MonthName, x.MonthNumber, x.Year })
                .Select(g => new InventoryTurnoverDto(
                    g.Key.MonthName,
                    g.Key.Year,
                    g.Sum(x => x.QtyIn),
                    g.Sum(x => x.QtyOut),
                    g.Sum(x => x.NetChange)))
                .OrderBy(x => x.Year).ThenBy(x => x.Month)
                .ToList();

            return Ok(data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching inventory turnover from data warehouse");
            return Ok(new List<InventoryTurnoverDto>());
        }
    }

    [HttpGet("supplier-performance")]
    [ProducesResponseType(typeof(List<SupplierPerformanceDto>), 200)]
    public async Task<IActionResult> GetSupplierPerformance()
    {
        try
        {
            var rows = await _dw.FactOrders
                .Where(o => o.OrderType == "Inbound" && o.SupplierKey != null)
                .Join(_dw.DimSuppliers, o => o.SupplierKey, s => s.SupplierKey, (o, s) => new
                {
                    s.Name,
                    s.Rating,
                    o.OrderReference,
                    o.Quantity,
                    o.FulfillmentDays
                })
                .ToListAsync();

            var data = rows
                .GroupBy(x => new { x.Name, x.Rating })
                .Select(g => new SupplierPerformanceDto(
                    g.Key.Name,
                    g.Key.Rating ?? 0,
                    g.Select(x => x.OrderReference).Distinct().Count(),
                    g.Sum(x => x.Quantity),
                    g.Where(x => x.FulfillmentDays != null).Select(x => (double?)x.FulfillmentDays).Average()))
                .OrderByDescending(x => x.Rating)
                .ToList();

            return Ok(data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching supplier performance from data warehouse");
            return Ok(new List<SupplierPerformanceDto>());
        }
    }

    [HttpGet("zone-utilization")]
    [ProducesResponseType(typeof(List<ZoneUtilizationDto>), 200)]
    public async Task<IActionResult> GetZoneUtilization()
    {
        try
        {
            var rows = await _dw.FactInventorySnapshots
                .Join(_dw.DimZones, s => s.ZoneKey, z => z.ZoneKey, (s, z) => new
                {
                    z.Name,
                    z.ZoneType,
                    z.Capacity,
                    s.QuantityOnHand,
                    s.StockValue
                })
                .ToListAsync();

            var data = rows
                .GroupBy(x => new { x.Name, x.ZoneType, x.Capacity })
                .Select(g => new ZoneUtilizationDto(
                    g.Key.Name,
                    g.Key.ZoneType,
                    g.Key.Capacity,
                    g.Sum(x => x.QuantityOnHand),
                    g.Key.Capacity > 0
                        ? (double)g.Sum(x => x.QuantityOnHand) / g.Key.Capacity * 100
                        : 0,
                    g.Sum(x => x.StockValue)))
                .OrderByDescending(x => x.UtilizationPercent)
                .ToList();

            return Ok(data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching zone utilization from data warehouse");
            return Ok(new List<ZoneUtilizationDto>());
        }
    }

    [HttpGet("order-fulfillment")]
    [ProducesResponseType(typeof(List<OrderFulfillmentDto>), 200)]
    public async Task<IActionResult> GetOrderFulfillment([FromQuery] int? year = null)
    {
        try
        {
            var targetYear = year ?? DateTime.UtcNow.Year;

            var rows = await _dw.FactOrders
                .Join(_dw.DimTime, o => o.TimeKey, t => t.TimeKey, (o, t) => new
                {
                    t.Year,
                    t.FullDate,
                    o.OrderType,
                    o.Quantity,
                    o.FulfillmentDays,
                    o.Status
                })
                .Where(x => x.Year == targetYear)
                .ToListAsync();

            var data = rows
                .GroupBy(x => new { Date = x.FullDate.ToString("yyyy-MM-dd"), x.OrderType })
                .Select(g => new OrderFulfillmentDto(
                    g.Key.Date,
                    g.Key.OrderType,
                    g.Count(),
                    g.Sum(x => x.Quantity),
                    g.Where(x => x.FulfillmentDays != null).Select(x => (double?)x.FulfillmentDays).Average(),
                    g.Count(x => x.Status == "Shipped" || x.Status == "Delivered" || x.Status == "Received"),
                    g.Count(x => x.Status == "Pending" || x.Status == "Picking")))
                .OrderBy(x => x.Date)
                .ToList();

            return Ok(data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching order fulfillment from data warehouse");
            return Ok(new List<OrderFulfillmentDto>());
        }
    }
}
