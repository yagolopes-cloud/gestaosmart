import { z } from 'zod';

export const criarUsuarioSchema = z.object({
  login: z.string().min(1, 'Login é obrigatório').max(50),
  senha: z.string().min(4, 'Senha deve ter no mínimo 4 caracteres').max(100),
  nome: z.string().max(100).optional(),
  grupoId: z.number().int().positive().optional().nullable(),
  /** Foto do usuário (data URL base64 ou URL). Opcional; máx. 500KB em base64. */
  fotoUrl: z.string().max(700000).optional().nullable(),
});
