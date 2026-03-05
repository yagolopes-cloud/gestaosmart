import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateCsrf } from '../middleware/csrf.js';
import { requireMasterOrAdmin } from '../middleware/requireMasterOrAdmin.js';
import {
  getMotivosSugestao,
  postMotivoSugestao,
  putMotivoSugestao,
  deleteMotivoSugestao,
} from '../controllers/motivosSugestaoController.js';

const router = Router();
router.use(requireAuth);

router.get('/', getMotivosSugestao);
router.post('/', validateCsrf, requireMasterOrAdmin, postMotivoSugestao);
router.put('/:id', validateCsrf, requireMasterOrAdmin, putMotivoSugestao);
router.delete('/:id', validateCsrf, requireMasterOrAdmin, deleteMotivoSugestao);

export default router;
