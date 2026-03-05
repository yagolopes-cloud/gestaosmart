import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { criarUsuarioSchema } from '../validators/usuarios.js';

/**
 * GET /api/usuarios - lista usuários (apenas master).
 */
export async function listarUsuarios(_req: Request, res: Response): Promise<void> {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        login: true,
        nome: true,
        grupoId: true,
        fotoUrl: true,
        createdAt: true,
        grupo: { select: { id: true, nome: true } },
      },
      orderBy: { login: 'asc' },
    });
    res.json(
      usuarios.map((u) => ({
        id: u.id,
        login: u.login,
        nome: u.nome,
        grupoId: u.grupoId,
        fotoUrl: u.fotoUrl ?? null,
        grupo: u.grupo?.nome ?? null,
        createdAt: u.createdAt,
      }))
    );
  } catch (err) {
    console.error('listarUsuarios', err);
    res.status(503).json({ error: 'Erro ao listar usuários.' });
  }
}

/**
 * POST /api/usuarios - cria usuário (apenas master).
 */
export async function criarUsuario(req: Request, res: Response): Promise<void> {
  const parsed = criarUsuarioSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() });
    return;
  }
  const { login: loginUser, senha, nome, grupoId, fotoUrl } = parsed.data;
  try {
    const senhaHash = await bcrypt.hash(senha, 10);
    const usuario = await prisma.usuario.create({
      data: {
        login: loginUser,
        senhaHash,
        nome: nome || null,
        grupoId: grupoId ?? null,
        fotoUrl: fotoUrl ?? null,
      },
      select: {
        id: true,
        login: true,
        nome: true,
        grupoId: true,
        fotoUrl: true,
        createdAt: true,
        grupo: { select: { nome: true } },
      },
    });
    res.status(201).json({
      id: usuario.id,
      login: usuario.login,
      nome: usuario.nome,
      grupoId: usuario.grupoId,
      fotoUrl: usuario.fotoUrl ?? null,
      grupo: usuario.grupo?.nome ?? null,
      createdAt: usuario.createdAt,
    });
  } catch (err) {
    const e = err as { code?: string };
    if (e.code === 'P2002') {
      res.status(400).json({ error: 'Login já existe.' });
      return;
    }
    console.error('criarUsuario', err);
    res.status(503).json({ error: 'Erro ao criar usuário.' });
  }
}
