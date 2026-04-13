using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WarehouseAPI.DTOs;
using WarehouseAPI.Services;

namespace WarehouseAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InventoryController : ControllerBase
{
    private readonly IInventoryService _inventory;

    public InventoryController(IInventoryService inventory) => _inventory = inventory;

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<InventoryDto>), 200)]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] Guid? zoneId = null,
        [FromQuery] bool? lowStockOnly = false)
    {
        var result = await _inventory.GetAllAsync(page, pageSize, zoneId, lowStockOnly);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var item = await _inventory.GetByIdAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    [HttpGet("alerts")]
    [ProducesResponseType(typeof(List<LowStockAlertDto>), 200)]
    public async Task<IActionResult> GetLowStockAlerts()
    {
        var alerts = await _inventory.GetLowStockAlertsAsync();
        return Ok(alerts);
    }

    [HttpPost("adjust")]
    [Authorize(Roles = "Admin,Manager")]
    [ProducesResponseType(typeof(StockAdjustmentDto), 200)]
    [ProducesResponseType(typeof(ApiError), 400)]
    public async Task<IActionResult> AdjustStock([FromBody] StockAdjustmentRequest request)
    {
        try
        {
            // TODO: Extract user ID from JWT claims
            var adjustment = await _inventory.AdjustStockAsync(request, null);
            return Ok(adjustment);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ApiError(ex.Message));
        }
    }

    [HttpGet("adjustments")]
    [ProducesResponseType(typeof(PagedResult<StockAdjustmentDto>), 200)]
    public async Task<IActionResult> GetAdjustmentHistory(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] Guid? productId = null)
    {
        var result = await _inventory.GetAdjustmentHistoryAsync(page, pageSize, productId);
        return Ok(result);
    }
}
