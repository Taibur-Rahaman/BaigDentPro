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
import { resolveTenantClinicId, scopeProductWhere } from '../utils/tenantScope.js';
import { writeAuditLog } from '../services/auditLogService.js';
import { productCreateBodySchema, productUpdateBodySchema } from '../validation/schemas.js';
import { requireCapability } from '../middleware/requireCapability.js';

const router = Router();

router.use(requireRole('SAAS_TENANT'));
router.use(requireTenantIsolation);
router.use(requireSaaSClinicScopeAlignment);

const productSelect = {
  id: true,
  name: true,
  price: true,
  costPrice: true,
  imageUrl: true,
  clinicId: true,
  createdAt: true,
  updatedAt: true,
} as const;

router.get(
  '/',
  requireFeature('products.read'),
  requireCapability('shop:products:read'),
  asyncRoute('products.list', async (req: AuthRequest, res: Response) => {
    const clinicId = resolveTenantClinicId(req);
    const rows = await prisma.product.findMany({
      where: scopeProductWhere(clinicId),
      orderBy: { updatedAt: 'desc' },
      select: productSelect,
    });
    res.json({ success: true, data: rows });
  })
);

router.post(
  '/',
  requireFeature('products.write'),
  requireCapability('shop:products:manage'),
  validateBody(productCreateBodySchema),
  asyncRoute('products.create', async (req: AuthRequest, res: Response) => {
    const clinicId = resolveTenantClinicId(req);
    const plan = req.clinicSubscription!.effectivePlan;

    if (plan === 'FREE') {
      const n = await prisma.product.count({ where: scopeProductWhere(clinicId) });
      if (n >= 10) {
        res.status(403).json({
          success: false,
          error: 'Free plan limit reached (10 products). Upgrade to Pro for unlimited catalog.',
        });
        return;
      }
    }

    const { name, price, costPrice, imageUrl } = req.body as {
      name: string;
      price: number;
      costPrice?: number;
      imageUrl?: string | null;
    };
    const cost = costPrice ?? 0;

    const created = await prisma.product.create({
      data: {
        name: name.trim(),
        price,
        costPrice: cost,
        clinicId,
        ...(imageUrl !== undefined && imageUrl !== null && String(imageUrl).trim() !== ''
          ? { imageUrl: String(imageUrl).trim() }
          : {}),
      },
      select: productSelect,
    });
    void writeAuditLog({
      userId: req.user!.id,
      action: 'CREATE_PRODUCT',
      entityId: created.id,
      metadata: { clinicId, name: created.name },
    });
    res.status(201).json({ success: true, data: created });
  })
);

router.get(
  '/:id',
  requireFeature('products.read'),
  requireCapability('shop:products:read'),
  asyncRoute('products.get', async (req: AuthRequest, res: Response) => {
    const clinicId = resolveTenantClinicId(req);
    const row = await prisma.product.findFirst({
      where: scopeProductWhere(clinicId, { id: req.params.id }),
      select: productSelect,
    });
    if (!row) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }
    res.json({ success: true, data: row });
  })
);

router.put(
  '/:id',
  requireFeature('products.write'),
  requireCapability('shop:products:manage'),
  validateBody(productUpdateBodySchema),
  asyncRoute('products.update', async (req: AuthRequest, res: Response) => {
    const clinicId = resolveTenantClinicId(req);
    const existing = await prisma.product.findFirst({
      where: scopeProductWhere(clinicId, { id: req.params.id }),
    });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    const body = req.body as {
      name?: string;
      price?: number;
      costPrice?: number;
      imageUrl?: string | null;
    };
    const name = body.name !== undefined ? body.name.trim() : existing.name;
    const price = body.price !== undefined ? body.price : existing.price;
    const costPrice = body.costPrice !== undefined ? body.costPrice : existing.costPrice;
    if (!name) {
      res.status(400).json({ success: false, error: 'name cannot be empty' });
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      res.status(400).json({ success: false, error: 'price must be a non-negative number' });
      return;
    }
    if (!Number.isFinite(costPrice) || costPrice < 0) {
      res.status(400).json({ success: false, error: 'costPrice must be a non-negative number' });
      return;
    }

    const updated = await prisma.product.update({
      where: { id: existing.id },
      data: {
        name,
        price,
        costPrice,
        ...(body.imageUrl !== undefined
          ? {
              imageUrl:
                body.imageUrl === null || String(body.imageUrl).trim() === ''
                  ? null
                  : String(body.imageUrl).trim(),
            }
          : {}),
      },
      select: productSelect,
    });
    void writeAuditLog({
      userId: req.user!.id,
      action: 'UPDATE_PRODUCT',
      entityId: updated.id,
      metadata: { clinicId, name: updated.name },
    });
    res.json({ success: true, data: updated });
  })
);

router.delete(
  '/:id',
  requireFeature('products.write'),
  requireCapability('shop:products:manage'),
  asyncRoute('products.delete', async (req: AuthRequest, res: Response) => {
    const clinicId = resolveTenantClinicId(req);
    const existing = await prisma.product.findFirst({
      where: scopeProductWhere(clinicId, { id: req.params.id }),
      select: { id: true, name: true, price: true, costPrice: true, imageUrl: true, clinicId: true },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }
    await prisma.product.delete({ where: { id: existing.id } });
    void writeAuditLog({
      userId: req.user!.id,
      action: 'DELETE_PRODUCT',
      entityId: existing.id,
      metadata: { clinicId, name: existing.name },
    });
    res.json({ success: true, data: existing });
  })
);

export default router;
