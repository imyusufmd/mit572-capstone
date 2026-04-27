import apiClient from './client';
import type {
  LoginRequest,
  LoginResponse,
  ProductDto,
  CreateProductRequest,
  UpdateProductRequest,
  CategoryDto,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  WarehouseZoneDto,
  CreateZoneRequest,
  UpdateZoneRequest,
  InventoryDto,
  StockAdjustmentRequest,
  StockAdjustmentDto,
  LowStockAlertDto,
  SupplierDto,
  CreateSupplierRequest,
  UpdateSupplierRequest,
  InboundShipmentDto,
  CreateShipmentRequest,
  ReceiveShipmentRequest,
  OutboundOrderDto,
  CreateOrderRequest,
  UpdateOrderStatusRequest,
  DashboardSummaryDto,
  StockValueByCategoryDto,
  InventoryTurnoverDto,
  SupplierPerformanceDto,
  ZoneUtilizationDto,
  OrderFulfillmentDto,
  PagedResult,
} from '../types';

// Auth
export const authApi = {
  login: (data: LoginRequest) =>
    apiClient.post<LoginResponse>('/auth/login', data),
  status: () =>
    apiClient.get<{ ldapAvailable: boolean; mode: string }>('/auth/status'),
};

// Dashboard
export const dashboardApi = {
  summary: () => apiClient.get<DashboardSummaryDto>('/dashboard/summary'),
};

// Products
export interface ProductListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  categoryId?: string;
  activeOnly?: boolean;
}

export const productsApi = {
  list: (params?: ProductListParams) =>
    apiClient.get<PagedResult<ProductDto>>('/products', { params }),
  get: (id: string) => apiClient.get<ProductDto>(`/products/${id}`),
  create: (data: CreateProductRequest) =>
    apiClient.post<ProductDto>('/products', data),
  update: (id: string, data: UpdateProductRequest) =>
    apiClient.put<ProductDto>(`/products/${id}`, data),
  delete: (id: string) => apiClient.delete(`/products/${id}`),
};

// Categories
export const categoriesApi = {
  list: () => apiClient.get<CategoryDto[]>('/categories'),
  get: (id: string) => apiClient.get<CategoryDto>(`/categories/${id}`),
  create: (data: CreateCategoryRequest) =>
    apiClient.post<CategoryDto>('/categories', data),
  update: (id: string, data: UpdateCategoryRequest) =>
    apiClient.put<CategoryDto>(`/categories/${id}`, data),
  delete: (id: string) => apiClient.delete(`/categories/${id}`),
};

// Zones
export const zonesApi = {
  list: () => apiClient.get<WarehouseZoneDto[]>('/zones'),
  get: (id: string) => apiClient.get<WarehouseZoneDto>(`/zones/${id}`),
  create: (data: CreateZoneRequest) =>
    apiClient.post<WarehouseZoneDto>('/zones', data),
  update: (id: string, data: UpdateZoneRequest) =>
    apiClient.put<WarehouseZoneDto>(`/zones/${id}`, data),
  delete: (id: string) => apiClient.delete(`/zones/${id}`),
};

// Inventory — GET /inventory returns PagedResult, GET /inventory/alerts returns array
export const inventoryApi = {
  list: (params?: { lowStockOnly?: boolean; zoneId?: string; productId?: string }) =>
    apiClient.get<PagedResult<InventoryDto>>('/inventory', { params }),
  adjust: (data: StockAdjustmentRequest) =>
    apiClient.post<StockAdjustmentDto>('/inventory/adjust', data),
  lowStock: () => apiClient.get<LowStockAlertDto[]>('/inventory/alerts'),
  adjustments: (params?: { productId?: string; pageSize?: number }) =>
    apiClient.get<PagedResult<StockAdjustmentDto>>('/inventory/adjustments', { params }),
};

// Suppliers
export const suppliersApi = {
  list: (activeOnly = true) =>
    apiClient.get<SupplierDto[]>('/suppliers', { params: { activeOnly } }),
  get: (id: string) => apiClient.get<SupplierDto>(`/suppliers/${id}`),
  create: (data: CreateSupplierRequest) =>
    apiClient.post<SupplierDto>('/suppliers', data),
  update: (id: string, data: UpdateSupplierRequest) =>
    apiClient.put<SupplierDto>(`/suppliers/${id}`, data),
  delete: (id: string) => apiClient.delete(`/suppliers/${id}`),
};

// Shipments — GET /shipments returns PagedResult
export const shipmentsApi = {
  list: (params?: { status?: string }) =>
    apiClient.get<PagedResult<InboundShipmentDto>>('/shipments', { params }),
  get: (id: string) => apiClient.get<InboundShipmentDto>(`/shipments/${id}`),
  create: (data: CreateShipmentRequest) =>
    apiClient.post<InboundShipmentDto>('/shipments', data),
  receive: (id: string, data: ReceiveShipmentRequest) =>
    apiClient.post<InboundShipmentDto>(`/shipments/${id}/receive`, data),
  cancel: (id: string) => apiClient.post<InboundShipmentDto>(`/shipments/${id}/cancel`),
};

// Orders — GET /orders returns PagedResult
export const ordersApi = {
  list: (params?: { status?: string }) =>
    apiClient.get<PagedResult<OutboundOrderDto>>('/orders', { params }),
  get: (id: string) => apiClient.get<OutboundOrderDto>(`/orders/${id}`),
  create: (data: CreateOrderRequest) =>
    apiClient.post<OutboundOrderDto>('/orders', data),
  updateStatus: (id: string, data: UpdateOrderStatusRequest) =>
    apiClient.put<OutboundOrderDto>(`/orders/${id}/status`, data),
  cancel: (id: string) => apiClient.post<OutboundOrderDto>(`/orders/${id}/cancel`),
};

// Analytics
export const analyticsApi = {
  stockValueByCategory: () =>
    apiClient.get<StockValueByCategoryDto[]>('/analytics/stock-value-by-category'),
  inventoryTurnover: () =>
    apiClient.get<InventoryTurnoverDto[]>('/analytics/inventory-turnover'),
  supplierPerformance: () =>
    apiClient.get<SupplierPerformanceDto[]>('/analytics/supplier-performance'),
  zoneUtilization: () =>
    apiClient.get<ZoneUtilizationDto[]>('/analytics/zone-utilization'),
  orderFulfillment: () =>
    apiClient.get<OrderFulfillmentDto[]>('/analytics/order-fulfillment'),
};
