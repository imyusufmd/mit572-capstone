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

    /// <summary>
    /// Stock value broken down by product category.
    /// </summary>
    [HttpGet("stock-value-by-category")]
    [ProducesResponseType(typeof(List<StockValueByCategoryDto>), 200)]
    public async Task<IActionResult> GetStockValueByCategory()
    {
        try
        {
            var data = await _dw.FactInventorySnapshots
                .Join(_dw.DimProducts, s => s.ProductKey, p => p.ProductKey, (s, p) => new { s, p })
                .Where(x => x.p.IsCurrent)
                .GroupBy(x => x.p.Category)
                .Select(g => new StockValueByCategoryDto(
                    g.Key ?? "Uncategorized",
                    g.Select(x => x.s.ProductKey).Distinct().Count(),
                    g.Sum(x => x.s.QuantityOnHand),
                    g.Sum(x => x.s.StockValue)))
                .OrderByDescending(x => x.TotalValue)
                .ToListAsync();

            return Ok(data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching stock value by category from data warehouse");
            return Ok(new List<StockValueByCategoryDto>()); // Return empty if DW unavailable
        }
    }

    /// <summary>
    /// Inventory turnover by month.
    /// </summary>
    [HttpGet("inventory-turnover")]
    [ProducesResponseType(typeof(List<InventoryTurnoverDto>), 200)]
    public async Task<IActionResult> GetInventoryTurnover([FromQuery] int? year = null)
    {
        try
        {
            var targetYear = year ?? DateTime.UtcNow.Year;

            var data = await _dw.FactStockMovements
                .Join(_dw.DimTime, m => m.TimeKey, t => t.TimeKey, (m, t) => new { m, t })
                .Where(x => x.t.Year == targetYear)
                .GroupBy(x => new { x.t.MonthName, x.t.MonthNumber, x.t.Year })
                .Select(g => new InventoryTurnoverDto(
                    g.Key.MonthName,
                    g.Key.Year,
                    g.Sum(x => x.m.QtyIn),
                    g.Sum(x => x.m.QtyOut),
                    g.Sum(x => x.m.NetChange)))
                .OrderBy(x => x.Year)
                .ToListAsync();

            return Ok(data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching inventory turnover from data warehouse");
            return Ok(new List<InventoryTurnoverDto>());
        }
    }

    /// <summary>
    /// Supplier performance metrics.
    /// </summary>
    [HttpGet("supplier-performance")]
    [ProducesResponseType(typeof(List<SupplierPerformanceDto>), 200)]
    public async Task<IActionResult> GetSupplierPerformance()
    {
        try
        {
            var data = await _dw.FactOrders
                .Where(o => o.OrderType == "Inbound" && o.SupplierKey != null)
                .Join(_dw.DimSuppliers, o => o.SupplierKey, s => s.SupplierKey, (o, s) => new { o, s })
                .GroupBy(x => new { x.s.Name, x.s.Rating })
                .Select(g => new SupplierPerformanceDto(
                    g.Key.Name,
                    g.Key.Rating ?? 0,
                    g.Select(x => x.o.OrderReference).Distinct().Count(),
                    g.Sum(x => x.o.Quantity),
                    g.Where(x => x.o.FulfillmentDays != null).Average(x => (double?)x.o.FulfillmentDays)))
                .OrderByDescending(x => x.Rating)
                .ToListAsync();

            return Ok(data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching supplier performance from data warehouse");
            return Ok(new List<SupplierPerformanceDto>());
        }
    }

    /// <summary>
    /// Zone utilization — capacity vs current stock.
    /// </summary>
    [HttpGet("zone-utilization")]
    [ProducesResponseType(typeof(List<ZoneUtilizationDto>), 200)]
    public async Task<IActionResult> GetZoneUtilization()
    {
        try
        {
            var data = await _dw.FactInventorySnapshots
                .Join(_dw.DimZones, s => s.ZoneKey, z => z.ZoneKey, (s, z) => new { s, z })
                .GroupBy(x => new { x.z.Name, x.z.ZoneType, x.z.Capacity })
                .Select(g => new ZoneUtilizationDto(
                    g.Key.Name,
                    g.Key.ZoneType,
                    g.Key.Capacity,
                    g.Sum(x => x.s.QuantityOnHand),
                    g.Key.Capacity > 0
                        ? (double)g.Sum(x => x.s.QuantityOnHand) / g.Key.Capacity * 100
                        : 0,
                    g.Sum(x => x.s.StockValue)))
                .OrderByDescending(x => x.UtilizationPercent)
                .ToListAsync();

            return Ok(data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching zone utilization from data warehouse");
            return Ok(new List<ZoneUtilizationDto>());
        }
    }

    /// <summary>
    /// Order fulfillment metrics — orders per day, avg fulfillment time.
    /// </summary>
    [HttpGet("order-fulfillment")]
    [ProducesResponseType(typeof(List<OrderFulfillmentDto>), 200)]
    public async Task<IActionResult> GetOrderFulfillment([FromQuery] int? year = null)
    {
        try
        {
            var targetYear = year ?? DateTime.UtcNow.Year;

            var data = await _dw.FactOrders
                .Join(_dw.DimTime, o => o.TimeKey, t => t.TimeKey, (o, t) => new { o, t })
                .Where(x => x.t.Year == targetYear)
                .GroupBy(x => new { Date = x.t.FullDate.ToString(), x.o.OrderType })
                .Select(g => new OrderFulfillmentDto(
                    g.Key.Date,
                    g.Key.OrderType,
                    g.Count(),
                    g.Sum(x => x.o.Quantity),
                    g.Where(x => x.o.FulfillmentDays != null).Average(x => (double?)x.o.FulfillmentDays),
                    g.Count(x => x.o.Status == "Shipped" || x.o.Status == "Delivered" || x.o.Status == "Received"),
                    g.Count(x => x.o.Status == "Pending" || x.o.Status == "Picking")))
                .OrderBy(x => x.Date)
                .ToListAsync();

            return Ok(data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching order fulfillment from data warehouse");
            return Ok(new List<OrderFulfillmentDto>());
        }
    }
}
