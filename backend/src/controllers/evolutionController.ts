import type { Request, Response } from 'express';
import {
  isConfigured,
  getEvolutionConfig,
  fetchInstances,
  createInstance,
  getConnectionState,
  getConnectQr,
  logoutInstance,
} from '../services/evolutionApi.js';
import { getEvolutionStoredConfig, saveEvolutionConfig } from '../data/configRepository.js';

const DEFAULT_INSTANCE = 'gestor-pedidos';

/**
 * GET /api/evolution/connect
 * Garante que a instância existe (cria se foi excluída na API), verifica estado e retorna QR se não estiver conectada.
 * Usa: instância salva no app (banco) → EVOLUTION_API_INSTANCE no .env → padrão 'gestor-pedidos'.
 */
export async function getConnect(_req: Request, res: Response): Promise<void> {
  const config = getEvolutionConfig();
  if (!config.configured) {
    res.status(400).json({
      error: 'Evolution API não configurada. Defina EVOLUTION_API_URL e EVOLUTION_API_KEY no .env.',
      configured: false,
    });
    return;
  }

  let stored = await getEvolutionStoredConfig();
  const instanceName = (stored?.instance ?? config.instance ?? DEFAULT_INSTANCE).trim() || DEFAULT_INSTANCE;
  const instanceFromEnv = Boolean(config.instance?.trim());

  try {
    let instances: { instanceName: string; instanceId?: string; state?: string }[] = [];
    try {
      instances = await fetchInstances();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isNetworkError = /fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET|network/i.test(msg);
      console.error('[Evolution] fetchInstances:', msg);
      const hint = isNetworkError
        ? ` Servidor inacessível (rede, firewall ou URL incorreta). Teste no navegador ou: curl -I "${getEvolutionConfig().url}"`
        : ' Verifique EVOLUTION_API_URL e EVOLUTION_API_KEY no .env do backend.';
      res.status(200).json({
        configured: true,
        connected: false,
        error: `Evolution API inacessível: ${msg}.${hint}`,
      });
      return;
    }

    const exists = instances.some(
      (i) =>
        i.instanceName === instanceName ||
        String(i.instanceName).toLowerCase() === instanceName.toLowerCase()
    );

    if (!exists) {
      try {
        await createInstance(instanceName);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!/409|already exists|já existe/i.test(msg)) {
          console.error('[Evolution] createInstance:', e);
          res.status(200).json({
            configured: true,
            connected: false,
            error: msg,
          });
          return;
        }
      }
    }

    let state: { state: string } | null = null;
    try {
      state = await getConnectionState(instanceName);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('404') || /not found|não encontrad/i.test(msg)) {
        try {
          await createInstance(instanceName);
        } catch {
          // ignore
        }
      }
    }

    const connected = state?.state === 'open' || state?.state === 'connected';

    if (connected) {
      await saveEvolutionConfig(instanceName);
      stored = await getEvolutionStoredConfig();
      const instanceConfiguredInEnv = instanceFromEnv || (stored?.instance === instanceName);
      const hasNumber = Boolean((stored?.number ?? '').trim());
      res.json({
        configured: true,
        connected: true,
        instance: instanceName,
        instanceFromEnv,
        instanceConfiguredInEnv: instanceConfiguredInEnv && hasNumber,
        storedNumber: stored?.number ?? null,
        message: instanceConfiguredInEnv && hasNumber
          ? 'WhatsApp conectado e configurado para envio.'
          : 'WhatsApp conectado. Defina o número para envio abaixo.',
        envHint: !hasNumber
          ? 'Informe o número do WhatsApp (com DDD) e clique em Salvar para habilitar o envio de mensagens.'
          : undefined,
      });
      return;
    }

    let qr: { qrCodeBase64: string; pairingCode?: string };
    try {
      qr = await getConnectQr(instanceName);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('404') || /not found|não encontrad/i.test(msg)) {
        try {
          await createInstance(instanceName);
          qr = await getConnectQr(instanceName);
        } catch (retryErr) {
          console.error('[Evolution] getConnectQr retry:', retryErr);
          res.status(200).json({
            configured: true,
            connected: false,
            error: msg,
          });
          return;
        }
      } else {
        throw e;
      }
    }

    res.json({
      configured: true,
      connected: false,
      instance: instanceName,
      instanceFromEnv,
      qrCodeBase64: qr.qrCodeBase64,
      pairingCode: qr.pairingCode,
      message: 'Escaneie o QR code no WhatsApp (Aparelhos conectados → Conectar um aparelho).',
      envHint: !instanceFromEnv
        ? `Após conectar, a instância será salva e você poderá definir o número nesta página para envio.`
        : undefined,
    });
  } catch (err) {
    console.error('[Evolution] getConnect:', err);
    res.status(200).json({
      configured: true,
      connected: false,
      error: err instanceof Error ? err.message : 'Erro ao obter QR de conexão.',
    });
  }
}

/** GET /api/evolution/config */
export async function getConfig(_req: Request, res: Response): Promise<void> {
  const config = getEvolutionConfig();
  if (!config.configured) {
    res.json({ configured: false, url: '', instance: '' });
    return;
  }
  const stored = await getEvolutionStoredConfig();
  const instance = stored?.instance || config.instance || DEFAULT_INSTANCE;
  let connected = false;
  try {
    const state = await getConnectionState(instance);
    connected = state?.state === 'open' || state?.state === 'connected';
  } catch {
    // ignore
  }
  res.json({
    configured: true,
    url: config.url,
    instance,
    connected,
    storedNumber: stored?.number ?? null,
  });
}

/** POST /api/evolution/logout – desconecta a instância da Evolution API (logout no WhatsApp) */
export async function logout(_req: Request, res: Response): Promise<void> {
  const config = getEvolutionConfig();
  if (!config.configured) {
    res.status(400).json({ error: 'Evolution API não configurada.' });
    return;
  }
  const stored = await getEvolutionStoredConfig();
  const instanceName = stored?.instance || config.instance || DEFAULT_INSTANCE;
  try {
    await logoutInstance(instanceName);
    res.json({ ok: true, message: 'WhatsApp desconectado da Evolution API.' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Evolution] logout:', msg);
    res.status(503).json({ error: msg });
  }
}

/** POST /api/evolution/save-config – persiste instância e número para envio (banco) */
export async function saveConfig(req: Request, res: Response): Promise<void> {
  const instance = typeof req.body?.instance === 'string' ? req.body.instance.trim() : '';
  const number = typeof req.body?.number === 'string' ? req.body.number.trim() : '';
  if (!instance) {
    res.status(400).json({ error: 'instance é obrigatório' });
    return;
  }
  try {
    await saveEvolutionConfig(instance, number || undefined);
    res.json({ ok: true, instance, number: number || null });
  } catch (err) {
    console.error('[Evolution] saveConfig:', err);
    res.status(503).json({ error: 'Erro ao salvar configuração.' });
  }
}
