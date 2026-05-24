// services/offline/cache.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

type CacheEnvelope<T> = {
  v: 1;
  ts: number; // timestamp (ms)
  data: T;
};

function keyContadores(empresaid: number | string, equipeId: number | string) {
  return `cache:contadores:${empresaid}:${equipeId}`;
}

function keyClientesPorDia(
  empresaid: number | string,
  equipeId: number | string,
  diaSemana: string
) {
  return `cache:clientesPorDia:${empresaid}:${equipeId}:${diaSemana}`;
}

async function setEnvelope<T>(key: string, data: T): Promise<void> {
  const payload: CacheEnvelope<T> = { v: 1, ts: Date.now(), data };
  await AsyncStorage.setItem(key, JSON.stringify(payload));
}

async function getEnvelope<T>(key: string): Promise<CacheEnvelope<T> | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.v !== 1) return null;
    if (typeof parsed.ts !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * CONTADORES (EquipesDiasDaSemanaScreen)
 * Guarda exatamente o response.data vindo do /contador-clientes.
 */
export async function setContadoresCache(
  empresaid: number | string,
  equipeId: number | string,
  contadoresData: any
): Promise<void> {
  await setEnvelope(keyContadores(empresaid, equipeId), contadoresData);
}

export async function getContadoresCache<T = any>(
  empresaid: number | string,
  equipeId: number | string
): Promise<{ data: T; ts: number } | null> {
  const env = await getEnvelope<T>(keyContadores(empresaid, equipeId));
  return env ? { data: env.data, ts: env.ts } : null;
}

/**
 * CLIENTES POR DIA (EquipesPiscinasPorDiaScreen)
 * Guarda exatamente o response.data vindo do /clientes-por-dia.
 */
export async function setClientesPorDiaCache(
  empresaid: number | string,
  equipeId: number | string,
  diaSemana: string,
  clientesData: any
): Promise<void> {
  await setEnvelope(keyClientesPorDia(empresaid, equipeId, diaSemana), clientesData);
}

export async function getClientesPorDiaCache<T = any>(
  empresaid: number | string,
  equipeId: number | string,
  diaSemana: string
): Promise<{ data: T; ts: number } | null> {
  const env = await getEnvelope<T>(keyClientesPorDia(empresaid, equipeId, diaSemana));
  return env ? { data: env.data, ts: env.ts } : null;
}

/**
 * Opcional: limpar cache de uma empresa/equipa (útil em logout / trocar de empresa)
 */
export async function clearEquipaCache(
  empresaid: number | string,
  equipeId: number | string
): Promise<void> {
  // Não apagamos “clientesPorDia:*” em massa porque AsyncStorage não tem wildcard.
  // Se quiseres limpeza total, fazemos um índice de chaves mais tarde.
  await AsyncStorage.removeItem(keyContadores(empresaid, equipeId));
}

function keyDetalhesEquipe(empresaid: number | string, equipeId: number | string) {
  return `cache:detalhesEquipe:${empresaid}:${equipeId}`;
}

export async function setDetalhesEquipeCache(
  empresaid: number | string,
  equipeId: number | string,
  detalhes: any
): Promise<void> {
  await setEnvelope(keyDetalhesEquipe(empresaid, equipeId), detalhes);
}

export async function getDetalhesEquipeCache<T = any>(
  empresaid: number | string,
  equipeId: number | string
): Promise<{ data: T; ts: number } | null> {
  const env = await getEnvelope<T>(keyDetalhesEquipe(empresaid, equipeId));
  return env ? { data: env.data, ts: env.ts } : null;
}

// --- FolhaManutencao caches ---

function keyCliente(empresaid: number | string, clienteId: number | string) {
  return `cache:cliente:${empresaid}:${clienteId}`;
}

export async function setClienteCache(empresaid: number | string, clienteId: number | string, data: any) {
  await setEnvelope(keyCliente(empresaid, clienteId), data);
}

export async function getClienteCache<T = any>(empresaid: number | string, clienteId: number | string) {
  const env = await getEnvelope<T>(keyCliente(empresaid, clienteId));
  return env ? { data: env.data, ts: env.ts } : null;
}

function keyISLEstado(empresaid: number | string, clienteId: number | string) {
  return `cache:islEstadoAtual:${empresaid}:${clienteId}`;
}

export async function setISLEstadoAtualCache(empresaid: number | string, clienteId: number | string, data: any) {
  await setEnvelope(keyISLEstado(empresaid, clienteId), data);
}

export async function getISLEstadoAtualCache<T = any>(empresaid: number | string, clienteId: number | string) {
  const env = await getEnvelope<T>(keyISLEstado(empresaid, clienteId));
  return env ? { data: env.data, ts: env.ts } : null;
}

function keyParametrosAtivos(empresaid: number | string) {
  return `cache:parametrosAtivos:${empresaid}`;
}

export async function setParametrosAtivosCache(empresaid: number | string, data: any) {
  await setEnvelope(keyParametrosAtivos(empresaid), data);
}

export async function getParametrosAtivosCache<T = any>(empresaid: number | string) {
  const env = await getEnvelope<T>(keyParametrosAtivos(empresaid));
  return env ? { data: env.data, ts: env.ts } : null;
}

function keyManutencaoAtual(empresaid: number | string, clienteId: number | string, diaSemana: string) {
  return `cache:manutencaoAtual:${empresaid}:${clienteId}:${diaSemana}`;
}

export async function setManutencaoAtualCache(
  empresaid: number | string,
  clienteId: number | string,
  diaSemana: string,
  data: any
) {
  await setEnvelope(keyManutencaoAtual(empresaid, clienteId, diaSemana), data);
}

export async function getManutencaoAtualCache<T = any>(
  empresaid: number | string,
  clienteId: number | string,
  diaSemana: string
) {
  const env = await getEnvelope<T>(keyManutencaoAtual(empresaid, clienteId, diaSemana));
  return env ? { data: env.data, ts: env.ts } : null;
}
