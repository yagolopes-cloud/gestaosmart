import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'troque-isto';

export interface JwtPayload {
  sub: string;
  login: string;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Middleware que exige JWT válido (cookie ou header Authorization).
 * Protege rotas /api/* exceto /auth/login.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token =
    req.cookies?.token ??
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);

  if (!token) {
    res.status(401).json({ error: 'Não autorizado. Faça login.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}

export function createToken(payload: { sub: string; login: string }): string {
  return jwt.sign(
    { ...payload, exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60 },
    JWT_SECRET
  );
}
