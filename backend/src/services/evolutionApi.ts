/**
 * Integração Evolution API 2.3.6 – ver backend/docs/EVOLUTION-API-2.3.6.md
 * GET: apenas header apikey. POST: Content-Type + apikey.
 * Instância e número podem vir do .env ou da config persistida (banco).
 */

import QRCode from 'qrcode';
import { getEvolutionStoredConfig } from '../data/configRepository.js';

function getEnv() {
  return {
    url: (process.env.EVOLUTION_API_URL ?? '').replace(/\/$/, '').trim(),
    key: (process.env.EVOLUTION_API_KEY ?? '').trim(),
    instance: (process.env.EVOLUTION_API_INSTANCE ?? '').trim(),
    number: (process.env.EVOLUTION_WHATSAPP_NUMBER ?? '').trim(),
  };
}

/** Instância e número para envio: banco primeiro, depois .env */
export async function getResolvedEvolutionEnv(): Promise<{
  url: string;
  key: string;
  instance: string;
  number: string;
}> {
  const env = getEnv();
  const stored = await getEvolutionStoredConfig();
  return {
    url: env.url,
    key: env.key,
    instance: (stored?.instance ?? env.instance) || '',
    number: (stored?.number ?? env.number) || '',
  };
}

const headersGet = () => ({ apikey: getEnv().key });
const headersPost = () => ({
  'Content-Type': 'application/json',
  apikey: getEnv().key,
});

export function isConfigured(): boolean {
  const { url, key } = getEnv();
  return Boolean(url && key);
}

export function getEvolutionConfig(): { url: string; instance: string; configured: boolean } {
  const { url, instance } = getEnv();
  return { url, instance, configured: isConfigured() };
}

const BASE = () => getEnv().url;

const EVOLUTION_FETCH_TIMEOUT_MS = 15000;

/** fetch com timeout para não travar em servidor inacessível */
async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = EVOLUTION_FETCH_TIMEOUT_MS, ...init } = options;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

/** GET /instances ou /instance/fetchInstances – lista instâncias */
export async function fetchInstances(): Promise<{ instanceName: string; instanceId?: string; state?: string }[]> {
  const base = BASE();
  if (!base) throw new Error('EVOLUTION_API_URL não configurada');
  const paths = ['/instances', '/instance/fetchInstances'];
  let lastErr = '';
  for (const p of paths) {
    const res = await fetchWithTimeout(`${base}${p}`, { headers: headersGet() });
    const text = await res.text();
    if (res.ok) {
      const data = (() => { try { return JSON.parse(text); } catch { return []; } })();
      const list = Array.isArray(data) ? data : (data as { instances?: unknown[] }).instances ?? (data as { response?: unknown[] }).response ?? [];
      return list.map((item: unknown) => {
        if (typeof item === 'string') return { instanceName: item };
        const o = item as Record<string, unknown>;
        const inst = o?.instance as Record<string, unknown> | undefined;
        const name = (inst?.instanceName ?? inst?.name ?? o?.instanceName ?? o?.name ?? o?.instanceId) as string | undefined;
        return {
          instanceName: name ?? '',
          instanceId: (inst?.instanceId ?? o?.instanceId) as string | undefined,
          state: (inst?.state ?? o?.state) as string | undefined,
        };
      }).filter((x) => x.instanceName);
    }
    lastErr = `${res.status} ${text}`;
    if (res.status === 404) continue;
    break;
  }
  throw new Error(`Evolution API instances: ${lastErr}`);
}

/** POST /instance/create – tenta com integration WHATSAPP-BAILEYS (exigido em algumas versões) */
export async function createInstance(instanceName: string): Promise<{ instanceName: string }> {
  const base = BASE();
  if (!base) throw new Error('EVOLUTION_API_URL não configurada');
  const bodies = [
    { instanceName, integration: 'WHATSAPP-BAILEYS', qrcode: true },
    { instanceName, qrcode: true },
  ];
  let lastStatus = 0;
  let lastText = '';
  for (const body of bodies) {
    const res = await fetchWithTimeout(`${base}/instance/create`, {
      method: 'POST',
      headers: headersPost(),
      body: JSON.stringify(body),
    });
    lastStatus = res.status;
    lastText = await res.text();
    if (res.ok) {
      try {
        const data = JSON.parse(lastText) as Record<string, unknown>;
        const name = (data?.instance as Record<string, unknown>)?.instanceName ?? data?.instanceName ?? instanceName;
        return { instanceName: (name as string) || instanceName };
      } catch {
        return { instanceName };
      }
    }
    if (res.status === 409 || /already exists|já existe/i.test(lastText)) return { instanceName };
    if (res.status !== 400) break;
  }
  throw new Error(`Evolution API create: ${lastStatus} ${lastText}`);
}

/** GET /instance/connectionState/{instanceName} */
export async function getConnectionState(instanceName: string): Promise<{ state: string } | null> {
  if (!BASE()) throw new Error('EVOLUTION_API_URL não configurada');
  const res = await fetchWithTimeout(
    `${BASE()}/instance/connectionState/${encodeURIComponent(instanceName)}`,
    { headers: headersGet() }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Evolution API connectionState: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as Record<string, unknown>;
  const state = (data?.instance as Record<string, unknown>)?.state ?? data?.state;
  return state ? { state: String(state) } : null;
}

/** DELETE /instance/logout/{instanceName} – desconecta a instância da Evolution API */
export async function logoutInstance(instanceName: string): Promise<void> {
  if (!BASE()) throw new Error('EVOLUTION_API_URL não configurada');
  const res = await fetchWithTimeout(
    `${BASE()}/instance/logout/${encodeURIComponent(instanceName)}`,
    { method: 'DELETE', headers: headersGet() }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Evolution API logout: ${res.status} ${text}`);
  }
}

/** GET /instance/connect/{instanceName} – retorna QR base64 e opcional pairingCode */
export async function getConnectQr(instanceName: string): Promise<{ qrCodeBase64: string; pairingCode?: string }> {
  if (!BASE()) throw new Error('EVOLUTION_API_URL não configurada');
  const res = await fetchWithTimeout(
    `${BASE()}/instance/connect/${encodeURIComponent(instanceName)}`,
    { headers: headersGet() }
  );
  if (!res.ok) throw new Error(`Evolution API connect: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as Record<string, unknown>;
  const raw = (data?.base64 ?? data?.code ?? data?.pairingCode) as string | undefined;
  const pairingCode = data?.pairingCode as string | undefined;
  if (!raw || typeof raw !== 'string') {
    throw new Error('Evolution API connect: resposta sem base64/code/pairingCode');
  }
  let qrCodeBase64: string;
  if (raw.startsWith('data:image')) {
    qrCodeBase64 = raw.replace(/^data:image\/\w+;base64,/, '');
  } else if (raw.length > 200 && /^[A-Za-z0-9+/=]+$/.test(raw)) {
    qrCodeBase64 = raw;
  } else {
    qrCodeBase64 = await QRCode.toDataURL(raw, { type: 'image/png', margin: 2 }).then((u) =>
      u.replace(/^data:image\/png;base64,/, '')
    );
  }
  return {
    qrCodeBase64,
    pairingCode: pairingCode ?? (raw.length <= 25 && !raw.includes('@') ? raw : undefined),
  };
}

/** Número adicional que recebe notificações de alteração de previsão */
const NUMERO_EXTRA_NOTIFICACAO = '558699766623';

/** Converte YYYY-MM-DD (ou ISO) para dd/mm/yyyy (padrão brasileiro) */
function formatarDataBR(isoDate: string): string {
  if (!isoDate || typeof isoDate !== 'string') return isoDate;
  const s = isoDate.trim();
  const onlyDate = s.slice(0, 10);
  const parts = onlyDate.split(/[-/]/);
  if (parts.length >= 3) {
    const [y, m, d] = parts;
    return `${d!.padStart(2, '0')}/${m!.padStart(2, '0')}/${y}`;
  }
  return isoDate;
}

/** Envia para o número configurado e para o número extra de notificação */
export async function sendWhatsAppText(text: string): Promise<void> {
  const env = await getResolvedEvolutionEnv();
  if (!env.url || !env.key || !env.instance) return;
  const numbers = [env.number, NUMERO_EXTRA_NOTIFICACAO].filter((n) => n && n.replace(/\D/g, '').length >= 10);
  for (const num of numbers) {
    await sendWhatsAppTextTo(num, text).catch(() => {});
  }
}

/**
 * Envia mensagem de texto para um número específico (formato: 5586995887672 ou +5586995887672).
 * Usa instância e número do banco ou .env.
 */
export async function sendWhatsAppTextTo(number: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const env = await getResolvedEvolutionEnv();
  if (!env.url || !env.key || !env.instance) {
    return { ok: false, error: 'Evolution API não configurada (URL, KEY ou instância no app)' };
  }
  const numberClean = number.replace(/\D/g, '');
  if (!numberClean) return { ok: false, error: 'Número inválido' };
  const res = await fetchWithTimeout(`${env.url}/message/sendText/${encodeURIComponent(env.instance)}`, {
    method: 'POST',
    headers: headersPost(),
    body: JSON.stringify({ number: numberClean, text }),
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('[Evolution API] sendText:', res.status, errText);
    return { ok: false, error: `${res.status} ${errText}` };
  }
  return { ok: true };
}

/** Formata mensagem de alteração de previsão (um pedido). Campos como na tela de pedidos; datas em dd/mm/yyyy */
export function formatarMensagemAlteracaoPrevisao(params: {
  pedido?: string | null;
  codigo?: string | null;
  cliente?: string | null;
  descricao?: string | null;
  data_entrega?: string | null;
  previsao_antiga: string;
  previsao_nova: string;
  motivo: string;
  observacao?: string | null;
  usuario: string;
}): string {
  const { pedido, codigo, cliente, descricao, data_entrega, previsao_antiga, previsao_nova, motivo, observacao, usuario } = params;
  let msg = '📦 *Alteração de previsão de entrega*\n\n';
  if (pedido?.trim()) msg += `📄 *Pedido:* ${pedido.trim()}\n`;
  if (codigo?.trim()) msg += `🔢 *Código:* ${codigo.trim()}\n`;
  if (cliente?.trim()) msg += `👤 *Cliente:* ${cliente.trim()}\n`;
  if (descricao?.trim()) msg += `📋 *Descrição:* ${descricao.trim()}\n`;
  if (data_entrega?.trim()) msg += `📅 *Data de entrega:* ${formatarDataBR(data_entrega)}\n`;
  msg += `📅 *Data anterior:* ${formatarDataBR(previsao_antiga)}\n`;
  msg += `📅 *Nova previsão:* ${formatarDataBR(previsao_nova)}\n`;
  msg += `📝 *Motivo:* ${motivo}\n`;
  msg += `👤 *Alterado por:* ${usuario}\n`;
  if (observacao?.trim()) msg += `\n💬 _Obs: ${observacao.trim()}_`;
  return msg;
}

/** Mensagem única para importação/ajuste em lote (não lista os pedidos). */
export function formatarMensagemAlteracaoPrevisaoLote(params: {
  ajustes: Array<{ id_pedido: string; previsao_nova: string; motivo: string }>;
  usuario: string;
}): string {
  const { ajustes, usuario } = params;
  const qtd = ajustes.length;
  let msg = '📦 *Alteração de pedidos em lote*\n\n';
  msg += 'Foi realizada uma alteração de previsões de entrega em lote.';
  if (qtd > 0) msg += `\n\n📋 ${qtd} pedido(s) alterado(s).`;
  msg += `\n\n👤 _Alterado por: ${usuario}_`;
  return msg;
}
