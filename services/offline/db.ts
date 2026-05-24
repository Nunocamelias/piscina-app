// services/offline/db.ts
// Nesta fase (cache de leitura), não precisamos de SQLite.
// Mantemos este ficheiro para evoluir depois para DB real (SQLite) sem mudar imports.

let initialized = false;

export async function initOffline(): Promise<void> {
  if (initialized) return;
  initialized = true;

  // Aqui no futuro:
  // - abrir SQLite
  // - criar tabelas (outbox, entidades, etc.)
  // Por agora, não faz nada.
}

export function isOfflineInitialized(): boolean {
  return initialized;
}
