import type { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { LABELS_PERMISSOES, type CodigoPermissao } from '../config/permissoes.js';
import { criarGrupoSchema, atualizarGrupoSchema } from '../validators/grupos.js';

function parsePermissoes(json: string): CodigoPermissao[] {
  try {
    const arr = JSON.parse(json) as string[];
    return arr.filter((p): p is CodigoPermissao => typeof p === 'string');
  } catch {
    return [];
  }
}

function serializePermissoes(permissoes: string[]): string {
  return JSON.stringify(Array.isArray(permissoes) ? permissoes : []);
}

/**
 * GET /api/grupos - lista grupos (para quem pode gerenciar usuários).
 */
export async function listarGrupos(_req: Request, res: Response): Promise<void> {
  try {
    const grupos = await prisma.grupoUsuario.findMany({
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, descricao: true, permissoes: true, _count: { select: { usuarios: true } } },
    });
    const withParsed = grupos.map((g) => ({
      id: g.id,
      nome: g.nome,
      descricao: g.descricao,
      permissoes: parsePermissoes(g.permissoes),
      totalUsuarios: g._count.usuarios,
    }));
    res.json(withParsed);
  } catch (err) {
    console.error('listarGrupos', err);
    res.status(503).json({ error: 'Erro ao listar grupos.' });
  }
}

/**
 * GET /api/grupos/permissoes - lista códigos e labels de permissões (para UI).
 */
export function listarPermissoes(_req: Request, res: Response): void {
  const lista = Object.entries(LABELS_PERMISSOES).map(([codigo, label]) => ({ codigo, label }));
  res.json(lista);
}

/**
 * POST /api/grupos - cria grupo.
 */
export async function criarGrupo(req: Request, res: Response): Promise<void> {
  const parsed = criarGrupoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() });
    return;
  }
  const { nome, descricao, permissoes } = parsed.data;
  try {
    const grupo = await prisma.grupoUsuario.create({
      data: {
        nome,
        descricao: descricao ?? null,
        permissoes: serializePermissoes(permissoes),
      },
      select: { id: true, nome: true, descricao: true, permissoes: true },
    });
    res.status(201).json({
      id: grupo.id,
      nome: grupo.nome,
      descricao: grupo.descricao,
      permissoes: parsePermissoes(grupo.permissoes),
      totalUsuarios: 0,
    });
  } catch (err) {
    const e = err as { code?: string };
    if (e.code === 'P2002') {
      res.status(400).json({ error: 'Já existe um grupo com este nome.' });
      return;
    }
    console.error('criarGrupo', err);
    res.status(503).json({ error: 'Erro ao criar grupo.' });
  }
}

/**
 * PUT /api/grupos/:id - atualiza grupo.
 */
export async function atualizarGrupo(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: 'ID inválido.' });
    return;
  }
  const parsed = atualizarGrupoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Dados inválidos', details: parsed.error.flatten() });
    return;
  }
  try {
    const existente = await prisma.grupoUsuario.findUnique({ where: { id } });
    if (!existente) {
      res.status(404).json({ error: 'Grupo não encontrado.' });
      return;
    }
    const data: { nome?: string; descricao?: string | null; permissoes?: string } = {};
    if (parsed.data.nome !== undefined) data.nome = parsed.data.nome;
    if (parsed.data.descricao !== undefined) data.descricao = parsed.data.descricao ?? null;
    if (parsed.data.permissoes !== undefined) data.permissoes = serializePermissoes(parsed.data.permissoes);
    const grupo = await prisma.grupoUsuario.update({
      where: { id },
      data,
      select: { id: true, nome: true, descricao: true, permissoes: true, _count: { select: { usuarios: true } } },
    });
    res.json({
      id: grupo.id,
      nome: grupo.nome,
      descricao: grupo.descricao,
      permissoes: parsePermissoes(grupo.permissoes),
      totalUsuarios: grupo._count.usuarios,
    });
  } catch (err) {
    const e = err as { code?: string };
    if (e.code === 'P2002') {
      res.status(400).json({ error: 'Já existe um grupo com este nome.' });
      return;
    }
    console.error('atualizarGrupo', err);
    res.status(503).json({ error: 'Erro ao atualizar grupo.' });
  }
}

/**
 * DELETE /api/grupos/:id - exclui grupo. Usuários do grupo ficam sem grupo (grupoId = null).
 */
export async function excluirGrupo(req: Request, res: Response): Promise<void> {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: 'ID inválido.' });
    return;
  }
  try {
    const existente = await prisma.grupoUsuario.findUnique({ where: { id } });
    if (!existente) {
      res.status(404).json({ error: 'Grupo não encontrado.' });
      return;
    }
    await prisma.usuario.updateMany({ where: { grupoId: id }, data: { grupoId: null } });
    await prisma.grupoUsuario.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    console.error('excluirGrupo', err);
    res.status(503).json({ error: 'Erro ao excluir grupo.' });
  }
}
