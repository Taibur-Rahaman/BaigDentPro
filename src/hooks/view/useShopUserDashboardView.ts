import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/api';
import type { ShopAdminOrderRow, ShopAdminProductRow, ShopAdminStatsPayload } from '@/types/shopAdmin';

export interface ShopUserNewProductForm {
  name: string;
  category: string;
  price: string;
  cost: string;
  stock: string;
  description: string;
}

export interface ShopUserOrderFormState {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;
  notes: string;
}

const defaultNewProduct = (): ShopUserNewProductForm => ({
  name: '',
  category: 'OTHER',
  price: '',
  cost: '',
  stock: '0',
  description: '',
});

const defaultOrderForm = (): ShopUserOrderFormState => ({
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  shippingAddress: '',
  shippingCity: '',
  shippingState: '',
  shippingZip: '',
  notes: '',
});

export function useShopUserDashboardView() {
  const [stats, setStats] = useState<ShopAdminStatsPayload | null>(null);
  const [products, setProducts] = useState<ShopAdminProductRow[]>([]);
  const [orders, setOrders] = useState<ShopAdminOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showPlaceOrder, setShowPlaceOrder] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  const [newProduct, setNewProduct] = useState<ShopUserNewProductForm>(() => defaultNewProduct());

  const [orderForm, setOrderForm] = useState<ShopUserOrderFormState>(() => defaultOrderForm());

  const [orderLines, setOrderLines] = useState<{ productId: string; quantity: string }[]>([
    { productId: '', quantity: '1' },
  ]);

  const loadAll = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [s, po, or] = await Promise.all([
        api.shopAdmin.stats(),
        api.shopAdmin.products({ page: 1, limit: 100 }),
        api.shopAdmin.orders({ page: 1 }),
      ]);
      setStats(s);
      setProducts(po.products);
      setOrders(or.orders);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not load shop data';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    void api.shop
      .categories()
      .then((cats) => {
        setCategories(cats.map((c) => ({ id: c.id, name: c.name })));
      })
      .catch(() => {
        setCategories([{ id: 'OTHER', name: 'Other' }]);
      });
  }, []);

  const orderableProducts = useMemo(
    () => products.filter((p) => p.isActive && p.stock > 0),
    [products],
  );

  const displayProfit = stats?.profit?.total ?? 0;

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProduct(true);
    setBanner(null);
    try {
      const price = parseFloat(newProduct.price);
      if (!newProduct.name.trim() || Number.isNaN(price) || price < 0) {
        setBanner('Enter a valid product name and price.');
        return;
      }
      await api.shopAdmin.createProduct({
        name: newProduct.name.trim(),
        category: newProduct.category,
        price,
        cost: newProduct.cost.trim() === '' ? undefined : parseFloat(newProduct.cost),
        stock: parseInt(newProduct.stock, 10) || 0,
        description: newProduct.description.trim() || undefined,
      });
      setNewProduct({ ...defaultNewProduct(), category: newProduct.category });
      setShowCreateProduct(false);
      setBanner('Product created.');
      await loadAll();
    } catch (err: unknown) {
      setBanner(err instanceof Error ? err.message : 'Could not create product');
    } finally {
      setSavingProduct(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlacingOrder(true);
    setBanner(null);
    try {
      const lines = orderLines.filter((l) => l.productId && Math.max(1, parseInt(l.quantity, 10) || 0) > 0);
      if (lines.length === 0) {
        setBanner('Add at least one product line with quantity.');
        return;
      }
      if (!orderForm.customerName.trim() || !orderForm.customerPhone.trim() || !orderForm.shippingAddress.trim()) {
        setBanner('Customer name, phone, and shipping address are required.');
        return;
      }
      await api.shop.clearCart();
      for (const l of lines) {
        const q = Math.max(1, parseInt(l.quantity, 10) || 1);
        await api.shop.addToCart(l.productId, q);
      }
      await api.shop.checkout({
        customerName: orderForm.customerName.trim(),
        customerEmail: orderForm.customerEmail.trim() || undefined,
        customerPhone: orderForm.customerPhone.trim(),
        shippingAddress: orderForm.shippingAddress.trim(),
        shippingCity: orderForm.shippingCity.trim() || '—',
        shippingState: orderForm.shippingState.trim() || undefined,
        shippingZip: orderForm.shippingZip.trim() || undefined,
        paymentMethod: 'COD',
        notes: orderForm.notes.trim() || undefined,
      });
      setShowPlaceOrder(false);
      setOrderLines([{ productId: '', quantity: '1' }]);
      setOrderForm(defaultOrderForm());
      setBanner('Order placed successfully.');
      await loadAll();
    } catch (err: unknown) {
      setBanner(err instanceof Error ? err.message : 'Could not place order');
    } finally {
      setPlacingOrder(false);
    }
  };

  return {
    stats,
    products,
    orders,
    loading,
    error,
    banner,
    showCreateProduct,
    setShowCreateProduct,
    showPlaceOrder,
    setShowPlaceOrder,
    savingProduct,
    placingOrder,
    categories,
    newProduct,
    setNewProduct,
    orderForm,
    setOrderForm,
    orderLines,
    setOrderLines,
    orderableProducts,
    displayProfit,
    loadAll,
    handleCreateProduct,
    handlePlaceOrder,
    setBanner,
  };
}
