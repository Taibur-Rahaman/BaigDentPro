import { Router } from 'express';
import type { Response } from 'express';
import { prisma } from '../index.js';
import type { AuthRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { requireSaaSClinicScopeAlignment } from '../middleware/tenantClinicGuard.js';
import { requireTenantIsolation } from '../middleware/requireTenantIsolation.js';
import { validateBody } from '../middleware/validateBody.js';
import { asyncRoute } from '../utils/routeErrors.js';
import { requireFeature } from '../middleware/requireFeature.js';
import { resolveTenantClinicId, scopeOrderWhere, scopeProductWhere } from '../utils/tenantScope.js';
import { writeAuditLog } from '../services/auditLogService.js';
import { orderCreateBodySchema, type OrderCreateBody } from '../validation/schemas.js';

const router = Router();

router.use(requireRole('SAAS_TENANT'));
router.use(requireTenantIsolation);
router.use(requireSaaSClinicScopeAlignment);

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

const orderInclude = {
  items: {
    orderBy: { createdAt: 'asc' as const },
    include: {
      product: { select: { id: true, name: true, price: true, costPrice: true, imageUrl: true } },
    },
  },
  profit: { select: { id: true, amount: true, createdAt: true } },
  transactions: { select: { id: true, amount: true, status: true, currency: true, createdAt: true } },
} as const;

function linesFromOrderBody(body: OrderCreateBody): { productId: string; quantity: number }[] {
  if ('items' in body && Array.isArray(body.items)) {
    return body.items.map((i) => ({ productId: i.productId, quantity: i.quantity }));
  }
  if ('productId' in body) {
    return [{ productId: body.productId, quantity: body.quantity }];
  }
  return [];
}

router.get(
  '/',
  requireFeature('orders.read'),
  asyncRoute('orders.list', async (req: AuthRequest, res: Response) => {
    const clinicId = resolveTenantClinicId(req);
    const rows = await prisma.order.findMany({
      where: scopeOrderWhere(clinicId),
      orderBy: { createdAt: 'desc' },
      include: orderInclude,
    });
    res.json({ success: true, data: rows });
  })
);

router.post(
  '/',
  requireFeature('orders.write'),
  validateBody(orderCreateBodySchema),
  asyncRoute('orders.create', async (req: AuthRequest, res: Response) => {
    const clinicId = resolveTenantClinicId(req);
    const lines = linesFromOrderBody(req.body as OrderCreateBody);

    const productIds = [...new Set(lines.map((l) => l.productId))];
    const products = await prisma.product.findMany({
      where: { ...scopeProductWhere(clinicId), id: { in: productIds } },
      select: { id: true, name: true, price: true, costPrice: true },
    });
    if (products.length !== productIds.length) {
      res.status(404).json({ success: false, error: 'One or more products were not found' });
      return;
    }
    const byId = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    let profitAmount = 0;
    const itemCreates = lines.map((line) => {
      const p = byId.get(line.productId)!;
      const unitPrice = roundMoney(p.price);
      const lineTotal = roundMoney(unitPrice * line.quantity);
      subtotal = roundMoney(subtotal + lineTotal);
      profitAmount = roundMoney(profitAmount + (p.price - p.costPrice) * line.quantity);
      return {
        productId: p.id,
        quantity: line.quantity,
        unitPrice,
        lineTotal,
        productName: p.name,
      };
    });

    const created = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          clinicId,
          subtotal,
          total: subtotal,
          items: { create: itemCreates },
        },
      });
      await tx.profit.create({
        data: {
          orderId: order.id,
          clinicId,
          amount: profitAmount,
        },
      });
      return tx.order.findFirst({
        where: scopeOrderWhere(clinicId, { id: order.id }),
        include: orderInclude,
      });
    });

    if (!created) {
      res.status(500).json({ success: false, error: 'Order could not be loaded after create' });
      return;
    }
    void writeAuditLog({
      userId: req.user!.id,
      action: 'CREATE_ORDER',
      entityId: created.id,
      metadata: { clinicId, total: created.total, itemCount: created.items?.length ?? 0 },
    });
    res.status(201).json({ success: true, data: created });
  })
);

router.get(
  '/:id',
  requireFeature('orders.read'),
  asyncRoute('orders.get', async (req: AuthRequest, res: Response) => {
    const clinicId = resolveTenantClinicId(req);
    const row = await prisma.order.findFirst({
      where: scopeOrderWhere(clinicId, { id: req.params.id }),
      include: orderInclude,
    });
    if (!row) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }
    res.json({ success: true, data: row });
  })
);

router.delete(
  '/:id',
  requireFeature('orders.write'),
  asyncRoute('orders.delete', async (req: AuthRequest, res: Response) => {
    const clinicId = resolveTenantClinicId(req);
    const existing = await prisma.order.findFirst({
      where: scopeOrderWhere(clinicId, { id: req.params.id }),
      include: orderInclude,
    });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }
    await prisma.order.delete({ where: { id: existing.id } });
    void writeAuditLog({
      userId: req.user!.id,
      action: 'DELETE_ORDER',
      entityId: existing.id,
      metadata: { clinicId, total: existing.total },
    });
    res.json({ success: true, data: existing });
  })
);

export default router;
