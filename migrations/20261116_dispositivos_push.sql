-- GESPOOL - Preparacao dos dispositivos Android para avisos push.
-- NAO EXECUTAR em producao enquanto o novo sistema estiver em testes.
-- Cada token corresponde ao utilizador que iniciou sessao mais recentemente no dispositivo.
-- Nao se guardam tokens de autenticacao JWT nesta tabela.

CREATE TABLE IF NOT EXISTS dispositivos_push (
  id BIGSERIAL PRIMARY KEY,
  empresaid INTEGER NOT NULL REFERENCES empresas(id),
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  plataforma VARCHAR(12) NOT NULL DEFAULT 'android'
    CHECK (plataforma IN ('android')),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispositivos_push_destino
  ON dispositivos_push (empresaid, usuario_id);

-- O servidor so associa o token ao utilizador autenticado via JWT.
-- No logout, o token desse utilizador deve ser retirado.
-- Apos configurar Firebase, sera implementado o envio seletivo aos destinatarios.
