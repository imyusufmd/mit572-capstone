using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using WarehouseAPI.Data;
using WarehouseAPI.DTOs;
using WarehouseAPI.Models;

namespace WarehouseAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ZonesController : ControllerBase
{
    private readonly WarehouseDbContext _db;

    public ZonesController(WarehouseDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var zones = await _db.WarehouseZones
            .Include(z => z.InventoryRecords)
            .OrderBy(z => z.Name)
            .Select(z => new WarehouseZoneDto(
                z.Id, z.Name, z.ZoneType,
                z.Capacity, z.InventoryRecords.Sum(i => i.Quantity),
                z.Capacity > 0 ? (double)z.InventoryRecords.Sum(i => i.Quantity) / z.Capacity * 100 : 0,
                z.Description, z.IsActive, z.CreatedAt))
            .ToListAsync();

        return Ok(zones);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var zone = await _db.WarehouseZones
            .Include(z => z.InventoryRecords)
            .FirstOrDefaultAsync(z => z.Id == id);

        if (zone is null) return NotFound();

        var utilization = zone.InventoryRecords.Sum(i => i.Quantity);
        return Ok(new WarehouseZoneDto(
            zone.Id, zone.Name, zone.ZoneType,
            zone.Capacity, utilization,
            zone.Capacity > 0 ? (double)utilization / zone.Capacity * 100 : 0,
            zone.Description, zone.IsActive, zone.CreatedAt));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Create([FromBody] CreateZoneRequest request)
    {
        var zone = new WarehouseZone
        {
            Name = request.Name,
            ZoneType = request.ZoneType,
            Capacity = request.Capacity,
            Description = request.Description
        };

        _db.WarehouseZones.Add(zone);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = zone.Id },
            new WarehouseZoneDto(zone.Id, zone.Name, zone.ZoneType, zone.Capacity, 0, 0, zone.Description, zone.IsActive, zone.CreatedAt));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateZoneRequest request)
    {
        var zone = await _db.WarehouseZones.FindAsync(id);
        if (zone is null) return NotFound();

        if (request.Name is not null) zone.Name = request.Name;
        if (request.ZoneType is not null) zone.ZoneType = request.ZoneType;
        if (request.Capacity.HasValue) zone.Capacity = request.Capacity.Value;
        if (request.Description is not null) zone.Description = request.Description;
        if (request.IsActive.HasValue) zone.IsActive = request.IsActive.Value;

        await _db.SaveChangesAsync();

        return Ok(new WarehouseZoneDto(zone.Id, zone.Name, zone.ZoneType, zone.Capacity,
            zone.CurrentUtilization, zone.Capacity > 0 ? (double)zone.CurrentUtilization / zone.Capacity * 100 : 0,
            zone.Description, zone.IsActive, zone.CreatedAt));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var zone = await _db.WarehouseZones.FindAsync(id);
        if (zone is null) return NotFound();

        zone.IsActive = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
