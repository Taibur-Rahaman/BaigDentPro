/** Minimal shop row shape for landing product grid (aligned with API + demo fallback). */
export interface LandingProductRow {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  price: number;
  category?: string;
  stock: number;
  isFeatured?: boolean;
  comparePrice?: number;
}

export interface LandingCategory {
  id: string;
  name: string;
  icon: string;
  count: number;
}
