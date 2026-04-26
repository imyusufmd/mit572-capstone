// Auth
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  username: string;
  fullName: string;
  role: string;
  expiresAt: string;
}

export interface AuthUser {
  username: string;
  fullName: string;
  role: string;
  token: string;
}

// Common
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

// Products
export interface ProductDto {
  id: number;
  sku: string;
  name: string;
  description: string;
  categoryId: number;
  categoryName: string;
  unitPrice: number;
  weightKg: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  imageUrl: string | null;
  isActive: boolean;
  totalStock: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductRequest {
  sku: string;
  name: string;
  description: string;
  categoryId: number;
  unitPrice: number;
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  imageUrl?: string;
}

export interface UpdateProductRequest {
  name: string;
  description: string;
  categoryId: number;
  unitPrice: number;
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  imageUrl?: string;
  isActive: boolean;
}

// Categories
export interface CategoryDto {
  id: number;
  name: string;
  description: string;
  productCount: number;
  createdAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  description: string;
}

export interface UpdateCategoryRequest {
  name: string;
  description: string;
}

// Warehouse Zones
export interface WarehouseZoneDto {
  id: number;
  name: string;
  zoneType: string;
  capacity: number;
  currentUtilization: number;
  utilizationPercent: number;
  description: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateZoneRequest {
  name: string;
  zoneType: string;
  capacity: number;
  description: string;
}

export interface UpdateZoneRequest {
  name: string;
  zoneType: string;
  capacity: number;
  description: string;
  isActive: boolean;
}

// Inventory
export interface InventoryDto {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  zoneId: number;
  zoneName: string;
  quantity: number;
  minThreshold: number;
  maxThreshold: number;
  isLowStock: boolean;
  stockValue: number;
  lastUpdated: string;
}

export interface StockAdjustmentRequest {
  productId: number;
  zoneId: number;
  qtyChange: number;
  reason: string;
  notes: string;
}

export interface StockAdjustmentDto {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  zoneId: number;
  zoneName: string;
  qtyChange: number;
  reason: string;
  notes: string;
  adjustedByName: string;
  createdAt: string;
}

export interface LowStockAlertDto {
  productId: number;
  productName: string;
  productSku: string;
  zoneName: string;
  quantity: number;
  minThreshold: number;
  deficit: number;
}

// Suppliers
export interface SupplierDto {
  id: number;
  name: string;
  contactEmail: string;
  phone: string;
  address: string;
  rating: number;
  isActive: boolean;
  shipmentCount: number;
  createdAt: string;
}

export interface CreateSupplierRequest {
  name: string;
  contactEmail: string;
  phone: string;
  address: string;
  rating: number;
}

export interface UpdateSupplierRequest {
  name: string;
  contactEmail: string;
  phone: string;
  address: string;
  rating: number;
  isActive: boolean;
}

// Inbound Shipments
export interface InboundShipmentItemDto {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  expectedQty: number;
  receivedQty: number;
  zoneId: number;
  zoneName: string;
  notes: string;
}

export interface InboundShipmentDto {
  id: number;
  referenceNumber: string;
  supplierId: number;
  supplierName: string;
  expectedDate: string;
  receivedDate: string | null;
  status: string;
  notes: string;
  createdByName: string;
  items: InboundShipmentItemDto[];
  createdAt: string;
}

export interface CreateShipmentItemRequest {
  productId: number;
  expectedQty: number;
  zoneId: number;
}

export interface CreateShipmentRequest {
  supplierId: number;
  expectedDate: string;
  notes: string;
  items: CreateShipmentItemRequest[];
}

export interface ReceiveShipmentItemRequest {
  itemId: number;
  receivedQty: number;
  zoneId: number;
}

export interface ReceiveShipmentRequest {
  items: ReceiveShipmentItemRequest[];
  notes: string;
}

// Outbound Orders
export interface OutboundOrderItemDto {
  id: number;
  productId: number;
  productName: string;
  productSku: string;
  quantity: number;
  zoneId: number;
  zoneName: string;
  pickedAt: string | null;
  packedAt: string | null;
}

export interface OutboundOrderDto {
  id: number;
  orderNumber: string;
  status: string;
  destination: string;
  customerName: string;
  priority: string;
  notes: string;
  createdByName: string;
  items: OutboundOrderItemDto[];
  createdAt: string;
  shippedAt: string | null;
  deliveredAt: string | null;
}

export interface CreateOrderItemRequest {
  productId: number;
  quantity: number;
  zoneId: number;
}

export interface CreateOrderRequest {
  destination: string;
  customerName: string;
  priority: string;
  notes: string;
  items: CreateOrderItemRequest[];
}

export interface UpdateOrderStatusRequest {
  status: string;
}

// Analytics / Dashboard
export interface DashboardSummaryDto {
  totalProducts: number;
  totalStock: number;
  totalStockValue: number;
  lowStockCount: number;
  pendingShipments: number;
  pendingOrders: number;
  shippedToday: number;
  receivedToday: number;
}

export interface StockValueByCategoryDto {
  category: string;
  productCount: number;
  totalQuantity: number;
  totalValue: number;
}

export interface InventoryTurnoverDto {
  month: number;
  year: number;
  totalIn: number;
  totalOut: number;
  netChange: number;
}

export interface SupplierPerformanceDto {
  supplierName: string;
  rating: number;
  totalOrders: number;
  totalQuantity: number;
  avgFulfillmentDays: number;
}

export interface ZoneUtilizationDto {
  zoneName: string;
  zoneType: string;
  capacity: number;
  currentStock: number;
  utilizationPercent: number;
  stockValue: number;
}

export interface OrderFulfillmentDto {
  date: string;
  orderType: string;
  orderCount: number;
  totalQuantity: number;
  avgFulfillmentDays: number;
  completedCount: number;
  pendingCount: number;
}
