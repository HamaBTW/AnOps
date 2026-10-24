import type { UnitOfMeasure } from "@/shared/domain/units";

/** Public DTOs. Identifiers are hex strings. Money and quantities are display decimal strings. */

export type PageInfo = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type Paged<T> = { items: T[] } & PageInfo;

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock" | "not_stored";

export type CategoryDto = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  productCount: number;
};

export type ProductDto = {
  id: string;
  sku: string;
  name: string;
  description: string;
  categoryId: string | null;
  categoryName: string | null;
  unitOfMeasure: UnitOfMeasure;
  isStorable: boolean;
  isActive: boolean;
  /** Standard cost, display decimal (three places). */
  cost: string;
  /** Sale price, display decimal (three places). */
  salePrice: string;
  /** Reorder point, display decimal (trimmed). */
  reorderPoint: string;
  onHand: string;
  onHandMicro: number;
  reorderPointMicro: number;
  stockStatus: StockStatus;
  version: number;
  updatedAt: string;
};

export type WarehouseDto = {
  id: string;
  name: string;
  code: string;
  address: string;
  isActive: boolean;
  onHand: string;
  onHandMicro: number;
  updatedAt: string;
};

export type StockBalanceDto = {
  productId: string;
  productSku: string;
  productName: string;
  unitOfMeasure: UnitOfMeasure;
  warehouseId: string;
  warehouseCode: string;
  warehouseName: string;
  onHand: string;
  onHandMicro: number;
  reorderPoint: string;
  reorderPointMicro: number;
  stockStatus: StockStatus;
};

export type StockMovementDto = {
  id: string;
  productId: string;
  productSku: string;
  warehouseId: string;
  warehouseCode: string;
  movementType: string;
  quantity: string;
  deltaMicro: number;
  sourceType: string;
  reason: string;
  createdAt: string;
};

export type InventoryOverviewDto = {
  activeProducts: number;
  categories: number;
  activeWarehouses: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  stockValueMilli: number;
  pendingPurchaseOrders: number;
  goodsReceiptsAwaitingPosting: number;
  openWorkOrders: number;
  recentMovements: StockMovementDto[];
  currencyCode: string;
};
