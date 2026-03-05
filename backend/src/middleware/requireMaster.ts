import type { Request, Response, NextFunction } from 'express';

/**
 * Exige que o usuário autenticado seja o master.
 * Deve ser usado após requireAuth.
 */
export function requireMaster(req: Request, res: Response, next: NextFunction): void {
  const login = req.user?.login;
  if (login !== 'master') {
    res.status(403).json({ error: 'Apenas o usuário master pode realizar esta ação.' });
    return;
  }
  next();
}
