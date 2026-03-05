import { z } from 'zod';

export const loginSchema = z.object({
  login: z.string().min(1, 'Login é obrigatório').transform((s) => s.trim()),
  senha: z.string().min(1, 'Senha é obrigatória').transform((s) => s.trim()),
});

export type LoginInput = z.infer<typeof loginSchema>;
