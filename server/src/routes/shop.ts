/**
 * @domain RETAIL (shop ecommerce)
 * ShopProduct catalog stock — not clinical consumables inventory.
 */
import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../index.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

function assertSuperAdmin(req: AuthRequest, res: any): boolean {
  if (req.user?.role === 'SUPER_ADMIN') return true;
  (res as any).status(403).json({ error: 'Forbidden' });
  return false;
}

// ============== ADMIN ROUTES ==============

// Admin: Get shop statistics
router.get('/admin/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!assertSuperAdmin(req as AuthRequest, res as any)) return;
    const [
      totalProducts,
      activeProducts,
      lowStockProducts,
      totalOrders,
      pendingOrders,
      todayOrders,
      totalRevenue,
      todayRevenue,
      orderItemsForProfit,
    ] = await Promise.all([
      prisma.shopProduct.count(),
      prisma.shopProduct.count({ where: { isActive: true } }),
      prisma.shopProduct.count({ where: { stock: { lte: 5 }, isActive: true } }),
      prisma.shopOrder.count(),
      prisma.shopOrder.count({ where: { status: 'PENDING' } }),
      prisma.shopOrder.count({
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
      prisma.shopOrder.aggregate({ _sum: { total: true } }),
      prisma.shopOrder.aggregate({
        where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
        _sum: { total: true },
      }),
      prisma.shopOrderItem.findMany({
        select: {
          quantity: true,
          total: true,
          product: { select: { cost: true } },
        },
      }),
    ]);

    const totalProfit = orderItemsForProfit.reduce((sum, row) => {
      const unitCost = row.product.cost != null ? Number(row.product.cost) : 0;
      return sum + (Number(row.total) - unitCost * row.quantity);
    }, 0);

    res.json({
      products: { total: totalProducts, active: activeProducts, lowStock: lowStockProducts },
      orders: { total: totalOrders, pending: pendingOrders, today: todayOrders },
      revenue: { 
        total: Number(totalRevenue._sum.total) || 0, 
        today: Number(todayRevenue._sum.total) || 0 
      },
      profit: { total: Math.round(totalProfit * 100) / 100 },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: List all orders with filters
router.get('/admin/orders', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!assertSuperAdmin(req as AuthRequest, res as any)) return;
    const { status, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.shopOrder.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      prisma.shopOrder.count({ where }),
    ]);

    res.json({ orders, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update order status
router.put('/admin/orders/:id/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!assertSuperAdmin(req as AuthRequest, res as any)) return;
    const { status, trackingNumber } = req.body;

    const order = await prisma.shopOrder.update({
      where: { id: req.params.id },
      data: { 
        status, 
        ...(trackingNumber && { trackingNumber }),
        updatedAt: new Date(),
      },
      include: { items: true },
    });

    res.json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Create product
router.post('/admin/products', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!assertSuperAdmin(req as AuthRequest, res as any)) return;
    const { name, description, shortDesc, price, comparePrice, cost, sku, barcode, category, images, stock, isFeatured } = req.body;

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const uniqueSlug = `${slug}-${Date.now().toString(36)}`;

    const product = await prisma.shopProduct.create({
      data: {
        name,
        slug: uniqueSlug,
        description,
        shortDesc,
        price,
        comparePrice,
        cost,
        sku,
        barcode,
        category,
        images: images || [],
        stock: stock || 0,
        isFeatured: isFeatured || false,
      },
    });

    res.status(201).json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Update product
router.put('/admin/products/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!assertSuperAdmin(req as AuthRequest, res as any)) return;
    const { name, description, shortDesc, price, comparePrice, cost, sku, barcode, category, images, stock, isActive, isFeatured } = req.body;

    const product = await prisma.shopProduct.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(shortDesc !== undefined && { shortDesc }),
        ...(price !== undefined && { price }),
        ...(comparePrice !== undefined && { comparePrice }),
        ...(cost !== undefined && { cost }),
        ...(sku !== undefined && { sku }),
        ...(barcode !== undefined && { barcode }),
        ...(category && { category }),
        ...(images && { images }),
        ...(stock !== undefined && { stock }),
        ...(isActive !== undefined && { isActive }),
        ...(isFeatured !== undefined && { isFeatured }),
      },
    });

    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Delete product
router.delete('/admin/products/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!assertSuperAdmin(req as AuthRequest, res as any)) return;
    await prisma.shopProduct.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get all products (including inactive)
router.get('/admin/products', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!assertSuperAdmin(req as AuthRequest, res as any)) return;
    const { category, search, page = '1', limit = '50' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {};
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { sku: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.shopProduct.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.shopProduct.count({ where }),
    ]);

    res.json({ products, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============== PUBLIC ROUTES ==============

async function generateOrderNo(): Promise<string> {
  const date = new Date();
  const prefix = `ORD${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const count = await prisma.shopOrder.count({
    where: { orderNo: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(4, '0')}`;
}

router.get('/products', async (req, res) => {
  try {
    const { category, search, featured, page = '1', limit = '20' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = { isActive: true };
    if (category) where.category = category;
    if (featured === 'true') where.isFeatured = true;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.shopProduct.findMany({
        where,
        skip,
        take: parseInt(limit as string),
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.shopProduct.count({ where }),
    ]);

    res.json({ products, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/products/categories', async (req, res) => {
  try {
    const categories = [
      { id: 'TOOTHBRUSH', name: 'Toothbrush', icon: '🪥' },
      { id: 'TOOTHPASTE', name: 'Toothpaste', icon: '🦷' },
      { id: 'MOUTHWASH', name: 'Mouthwash', icon: '🧴' },
      { id: 'DENTAL_FLOSS', name: 'Dental Floss', icon: '🧵' },
      { id: 'WHITENING', name: 'Whitening Kits', icon: '✨' },
      { id: 'DENTAL_TOOLS', name: 'Dental Tools', icon: '🔧' },
      { id: 'CLINIC_SUPPLIES', name: 'Clinic Supplies', icon: '🏥' },
      { id: 'ORTHODONTIC', name: 'Orthodontic', icon: '😁' },
      { id: 'KIDS_DENTAL', name: 'Kids Dental', icon: '👶' },
      { id: 'OTHER', name: 'Other', icon: '📦' },
    ];

    const counts = await prisma.shopProduct.groupBy({
      by: ['category'],
      where: { isActive: true },
      _count: { id: true },
    });

    const categoriesWithCount = categories.map(cat => ({
      ...cat,
      count: counts.find(c => c.category === cat.id)?._count.id || 0,
    }));

    res.json(categoriesWithCount);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/products/:slug', async (req, res) => {
  try {
    const product = await prisma.shopProduct.findFirst({
      where: { slug: req.params.slug, isActive: true },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/cart', async (req, res) => {
  try {
    let sessionId = req.headers['x-session-id'] as string;
    
    if (!sessionId) {
      sessionId = uuidv4();
    }

    const cart = await prisma.cart.findUnique({
      where: { sessionId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    res.json({
      sessionId,
      items: cart?.items || [],
      total: cart?.items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0) || 0,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/cart/add', async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    let sessionId = req.headers['x-session-id'] as string;

    if (!sessionId) {
      sessionId = uuidv4();
    }

    const product = await prisma.shopProduct.findUnique({ where: { id: productId } });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    let cart = await prisma.cart.findUnique({ where: { sessionId } });
    
    if (!cart) {
      cart = await prisma.cart.create({ data: { sessionId } });
    }

    const existingItem = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
      });
    } else {
      await prisma.cartItem.create({
        data: { cartId: cart.id, productId, quantity },
      });
    }

    const updatedCart = await prisma.cart.findUnique({
      where: { sessionId },
      include: { items: { include: { product: true } } },
    });

    res.json({
      sessionId,
      items: updatedCart?.items || [],
      total: updatedCart?.items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0) || 0,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/cart/update', async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const sessionId = req.headers['x-session-id'] as string;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const cart = await prisma.cart.findUnique({ where: { sessionId } });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    if (quantity <= 0) {
      await prisma.cartItem.delete({
        where: { cartId_productId: { cartId: cart.id, productId } },
      });
    } else {
      await prisma.cartItem.update({
        where: { cartId_productId: { cartId: cart.id, productId } },
        data: { quantity },
      });
    }

    const updatedCart = await prisma.cart.findUnique({
      where: { sessionId },
      include: { items: { include: { product: true } } },
    });

    res.json({
      sessionId,
      items: updatedCart?.items || [],
      total: updatedCart?.items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0) || 0,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/cart/remove/:productId', async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] as string;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const cart = await prisma.cart.findUnique({ where: { sessionId } });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    await prisma.cartItem.delete({
      where: { cartId_productId: { cartId: cart.id, productId: req.params.productId } },
    });

    const updatedCart = await prisma.cart.findUnique({
      where: { sessionId },
      include: { items: { include: { product: true } } },
    });

    res.json({
      sessionId,
      items: updatedCart?.items || [],
      total: updatedCart?.items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0) || 0,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/cart/clear', async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] as string;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const cart = await prisma.cart.findUnique({ where: { sessionId } });
    if (cart) {
      await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }

    res.json({ sessionId, items: [], total: 0 });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/checkout', async (req, res) => {
  try {
    const { customerName, customerEmail, customerPhone, shippingAddress, shippingCity, shippingState, shippingZip, paymentMethod = 'COD', notes } = req.body;
    const sessionId = req.headers['x-session-id'] as string;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const cart = await prisma.cart.findUnique({
      where: { sessionId },
      include: { items: { include: { product: true } } },
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const subtotal = cart.items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
    const shipping = subtotal >= 500 ? 0 : 50;
    const total = subtotal + shipping;

    const orderNo = await generateOrderNo();

    const order = await prisma.shopOrder.create({
      data: {
        orderNo,
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress,
        shippingCity,
        shippingState,
        shippingZip,
        subtotal,
        shipping,
        total,
        paymentMethod,
        notes,
        items: {
          create: cart.items.map(item => ({
            productId: item.productId,
            name: item.product.name,
            price: item.product.price,
            quantity: item.quantity,
            total: Number(item.product.price) * item.quantity,
          })),
        },
      },
      include: { items: true },
    });

    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    for (const item of cart.items) {
      await prisma.shopProduct.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    res.status(201).json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/orders/:orderNo', async (req, res) => {
  try {
    const order = await prisma.shopOrder.findUnique({
      where: { orderNo: req.params.orderNo },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/orders/phone/:phone', async (req, res) => {
  try {
    const orders = await prisma.shopOrder.findMany({
      where: { customerPhone: req.params.phone },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });

    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
