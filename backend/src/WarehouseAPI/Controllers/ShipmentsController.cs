using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WarehouseAPI.DTOs;
using WarehouseAPI.Services;

namespace WarehouseAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ShipmentsController : ControllerBase
{
    private readonly IShipmentService _shipments;

    public ShipmentsController(IShipmentService shipments) => _shipments = shipments;

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<InboundShipmentDto>), 200)]
    public async Task<IActionResult> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? status = null)
    {
        var result = await _shipments.GetAllAsync(page, pageSize, status);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(InboundShipmentDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var shipment = await _shipments.GetByIdAsync(id);
        return shipment is null ? NotFound() : Ok(shipment);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Manager")]
    [ProducesResponseType(typeof(InboundShipmentDto), 201)]
    public async Task<IActionResult> Create([FromBody] CreateShipmentRequest request)
    {
        // TODO: Extract user ID from JWT claims
        var shipment = await _shipments.CreateAsync(request, null);
        return CreatedAtAction(nameof(GetById), new { id = shipment.Id }, shipment);
    }

    [HttpPost("{id:guid}/receive")]
    [Authorize(Roles = "Admin,Manager,Staff")]
    [ProducesResponseType(typeof(InboundShipmentDto), 200)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Receive(Guid id, [FromBody] ReceiveShipmentRequest request)
    {
        var shipment = await _shipments.ReceiveAsync(id, request);
        return shipment is null ? NotFound() : Ok(shipment);
    }

    [HttpPost("{id:guid}/cancel")]
    [Authorize(Roles = "Admin,Manager")]
    [ProducesResponseType(typeof(InboundShipmentDto), 200)]
    [ProducesResponseType(typeof(ApiError), 400)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var shipment = await _shipments.CancelAsync(id);
        return shipment is null ? NotFound() : Ok(shipment);
    }
}
