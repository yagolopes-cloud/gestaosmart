import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission } from '../middleware/requirePermission.js';
import { validateCsrf } from '../middleware/csrf.js';
import { PERMISSOES } from '../config/permissoes.js';
import {
  listarGrupos,
  listarPermissoes,
  criarGrupo,
  atualizarGrupo,
  excluirGrupo,
} from '../controllers/gruposController.js';

const router = Router();
router.use(requireAuth);
router.use(requirePermission(PERMISSOES.USUARIOS_GERENCIAR));

router.get('/', listarGrupos);
router.get('/permissoes', listarPermissoes);
router.post('/', validateCsrf, criarGrupo);
router.put('/:id', validateCsrf, atualizarGrupo);
router.delete('/:id', validateCsrf, excluirGrupo);

export default router;
