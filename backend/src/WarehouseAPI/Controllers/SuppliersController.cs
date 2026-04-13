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
public class SuppliersController : ControllerBase
{
    private readonly WarehouseDbContext _db;

    public SuppliersController(WarehouseDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool? activeOnly = true)
    {
        var query = _db.Suppliers.Include(s => s.Shipments).AsQueryable();

        if (activeOnly == true)
            query = query.Where(s => s.IsActive);

        var suppliers = await query
            .OrderBy(s => s.Name)
            .Select(s => new SupplierDto(
                s.Id, s.Name, s.ContactEmail, s.Phone, s.Address,
                s.Rating, s.IsActive, s.Shipments.Count, s.CreatedAt))
            .ToListAsync();

        return Ok(suppliers);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var supplier = await _db.Suppliers
            .Include(s => s.Shipments)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (supplier is null) return NotFound();

        return Ok(new SupplierDto(
            supplier.Id, supplier.Name, supplier.ContactEmail, supplier.Phone,
            supplier.Address, supplier.Rating, supplier.IsActive,
            supplier.Shipments.Count, supplier.CreatedAt));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Create([FromBody] CreateSupplierRequest request)
    {
        var supplier = new Supplier
        {
            Name = request.Name,
            ContactEmail = request.ContactEmail,
            Phone = request.Phone,
            Address = request.Address,
            Rating = request.Rating ?? 0
        };

        _db.Suppliers.Add(supplier);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = supplier.Id },
            new SupplierDto(supplier.Id, supplier.Name, supplier.ContactEmail, supplier.Phone,
                supplier.Address, supplier.Rating, supplier.IsActive, 0, supplier.CreatedAt));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateSupplierRequest request)
    {
        var supplier = await _db.Suppliers.FindAsync(id);
        if (supplier is null) return NotFound();

        if (request.Name is not null) supplier.Name = request.Name;
        if (request.ContactEmail is not null) supplier.ContactEmail = request.ContactEmail;
        if (request.Phone is not null) supplier.Phone = request.Phone;
        if (request.Address is not null) supplier.Address = request.Address;
        if (request.Rating.HasValue) supplier.Rating = request.Rating.Value;
        if (request.IsActive.HasValue) supplier.IsActive = request.IsActive.Value;

        supplier.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        var count = await _db.InboundShipments.CountAsync(s => s.SupplierId == id);
        return Ok(new SupplierDto(supplier.Id, supplier.Name, supplier.ContactEmail, supplier.Phone,
            supplier.Address, supplier.Rating, supplier.IsActive, count, supplier.CreatedAt));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var supplier = await _db.Suppliers.FindAsync(id);
        if (supplier is null) return NotFound();

        supplier.IsActive = false;
        supplier.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
