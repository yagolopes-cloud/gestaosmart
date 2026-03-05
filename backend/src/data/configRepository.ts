/**
 * Configurações persistidas (key-value). Usado para Evolution API (instância e número).
 */

import { prisma } from '../config/prisma.js';

const KEY_EVOLUTION_INSTANCE = 'evolution_instance';
const KEY_EVOLUTION_WHATSAPP_NUMBER = 'evolution_whatsapp_number';

export interface EvolutionStoredConfig {
  instance?: string;
  number?: string;
}

export async function getEvolutionStoredConfig(): Promise<EvolutionStoredConfig> {
  const rows = await prisma.config.findMany({
    where: {
      key: { in: [KEY_EVOLUTION_INSTANCE, KEY_EVOLUTION_WHATSAPP_NUMBER] },
    },
  });
  const map = new Map(rows.map((r) => [r.key, r.value?.trim() || '']));
  return {
    instance: map.get(KEY_EVOLUTION_INSTANCE) || undefined,
    number: map.get(KEY_EVOLUTION_WHATSAPP_NUMBER) || undefined,
  };
}

export async function saveEvolutionConfig(instance: string, number?: string): Promise<void> {
  const instanceTrim = instance?.trim();
  if (!instanceTrim) return;
  await prisma.config.upsert({
    where: { key: KEY_EVOLUTION_INSTANCE },
    create: { key: KEY_EVOLUTION_INSTANCE, value: instanceTrim },
    update: { value: instanceTrim },
  });
  if (number != null && String(number).trim() !== '') {
    const numTrim = String(number).trim().replace(/\D/g, '');
    if (numTrim) {
      await prisma.config.upsert({
        where: { key: KEY_EVOLUTION_WHATSAPP_NUMBER },
        create: { key: KEY_EVOLUTION_WHATSAPP_NUMBER, value: numTrim },
        update: { value: numTrim },
      });
    }
  }
}
