using Microsoft.EntityFrameworkCore;
using WarehouseAPI.Data;
using WarehouseAPI.DTOs;
using WarehouseAPI.Models;

namespace WarehouseAPI.Services;

public interface IProductService
{
    Task<PagedResult<ProductDto>> GetAllAsync(int page, int pageSize, string? search, Guid? categoryId, bool? activeOnly);
    Task<ProductDto?> GetByIdAsync(Guid id);
    Task<ProductDto> CreateAsync(CreateProductRequest request);
    Task<ProductDto?> UpdateAsync(Guid id, UpdateProductRequest request);
    Task<bool> DeleteAsync(Guid id);
}

public class ProductService : IProductService
{
    private readonly WarehouseDbContext _db;

    public ProductService(WarehouseDbContext db) => _db = db;

    public async Task<PagedResult<ProductDto>> GetAllAsync(int page, int pageSize, string? search, Guid? categoryId, bool? activeOnly)
    {
        var query = _db.Products
            .Include(p => p.Category)
            .Include(p => p.InventoryRecords)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(p => p.Name.Contains(search) || p.Sku.Contains(search));

        if (categoryId.HasValue)
            query = query.Where(p => p.CategoryId == categoryId.Value);

        if (activeOnly == true)
            query = query.Where(p => p.IsActive);

        var totalCount = await query.CountAsync();
        var items = await query
            .OrderBy(p => p.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => MapToDto(p))
            .ToListAsync();

        return new PagedResult<ProductDto>(items, totalCount, page, pageSize, (int)Math.Ceiling(totalCount / (double)pageSize));
    }

    public async Task<ProductDto?> GetByIdAsync(Guid id)
    {
        var product = await _db.Products
            .Include(p => p.Category)
            .Include(p => p.InventoryRecords)
            .FirstOrDefaultAsync(p => p.Id == id);

        return product is null ? null : MapToDto(product);
    }

    public async Task<ProductDto> CreateAsync(CreateProductRequest request)
    {
        var product = new Product
        {
            Sku = request.Sku,
            Name = request.Name,
            Description = request.Description,
            CategoryId = request.CategoryId,
            UnitPrice = request.UnitPrice,
            WeightKg = request.WeightKg,
            LengthCm = request.LengthCm,
            WidthCm = request.WidthCm,
            HeightCm = request.HeightCm,
            ImageUrl = request.ImageUrl
        };

        _db.Products.Add(product);
        await _db.SaveChangesAsync();

        return await GetByIdAsync(product.Id) ?? MapToDto(product);
    }

    public async Task<ProductDto?> UpdateAsync(Guid id, UpdateProductRequest request)
    {
        var product = await _db.Products.FindAsync(id);
        if (product is null) return null;

        if (request.Name is not null) product.Name = request.Name;
        if (request.Description is not null) product.Description = request.Description;
        if (request.CategoryId.HasValue) product.CategoryId = request.CategoryId;
        if (request.UnitPrice.HasValue) product.UnitPrice = request.UnitPrice.Value;
        if (request.WeightKg.HasValue) product.WeightKg = request.WeightKg;
        if (request.LengthCm.HasValue) product.LengthCm = request.LengthCm;
        if (request.WidthCm.HasValue) product.WidthCm = request.WidthCm;
        if (request.HeightCm.HasValue) product.HeightCm = request.HeightCm;
        if (request.ImageUrl is not null) product.ImageUrl = request.ImageUrl;
        if (request.IsActive.HasValue) product.IsActive = request.IsActive.Value;

        product.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var product = await _db.Products.FindAsync(id);
        if (product is null) return false;

        // Soft delete
        product.IsActive = false;
        product.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return true;
    }

    private static ProductDto MapToDto(Product p) => new(
        p.Id, p.Sku, p.Name, p.Description,
        p.CategoryId, p.Category?.Name,
        p.UnitPrice, p.WeightKg,
        p.LengthCm, p.WidthCm, p.HeightCm,
        p.ImageUrl, p.IsActive,
        p.InventoryRecords?.Sum(i => i.Quantity) ?? 0,
        p.CreatedAt, p.UpdatedAt
    );
}
