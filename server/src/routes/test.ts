import { Router } from 'express';
import { requireRole } from '../middleware/requireRole.js';
import { testSystemStatus } from '../controllers/testDiagnosticsController.js';

const router = Router();

router.use(requireRole('SAAS_TENANT'));
router.get('/status', testSystemStatus);

export default router;
