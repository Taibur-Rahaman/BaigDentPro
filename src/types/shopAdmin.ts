export type ShopAdminStatsPayload = {
  products: { total: number; active: number; lowStock: number };
  orders: { total: number; pending: number; today: number };
  revenue: { total: number; today: number };
  profit: { total: number };
};

export type ShopAdminProductRow = {
  id: string;
  name: string;
  category: string;
  price: number;
  cost: number | null;
  stock: number;
  isActive: boolean;
  sku: string | null;
};

export type ShopAdminOrderItemRow = { name: string; quantity: number; total: number };

export type ShopAdminOrderRow = {
  id: string;
  orderNo: string;
  customerName: string;
  customerPhone: string;
  total: number;
  status: string;
  createdAt: string;
  items: ShopAdminOrderItemRow[];
};

export type ShopAdminProductsListPayload = {
  products: ShopAdminProductRow[];
  total: number;
  page: number;
  limit: number;
};

export type ShopAdminOrdersListPayload = {
  orders: ShopAdminOrderRow[];
  total: number;
  page: number;
  limit: number;
};

export type ShopCategoryRow = { id: string; name: string; icon?: string; count?: number };
