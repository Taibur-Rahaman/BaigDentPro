import { Router } from 'express';
import {
  createTestRecord,
  readTestRecords,
  updateTestRecord,
  deleteTestRecord,
  testSystemStatus,
} from '../controllers/testController.js';

const router = Router();

router.get('/status', testSystemStatus);
router.post('/create', createTestRecord);
router.get('/read', readTestRecords);
router.put('/update/:id', updateTestRecord);
router.delete('/delete/:id', deleteTestRecord);

export default router;
