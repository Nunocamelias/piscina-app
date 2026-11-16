-- GESPOOL: primeiro passo para as mensagens internas.
-- NAO APAGAR dados nem modificar a tabela notificacoes existente.
-- Aplicar em PostgreSQL apenas quando a nova API estiver pronta para teste.
-- A conversa nasce de uma anomalia ou da Administracao; as respostas pertencem ao mesmo assunto.
-- As mensagens para "todos" sao uma conversa por equipa, ligadas por grupo_envio_id.

CREATE TABLE IF NOT EXISTS conversas_internas (
  id BIGSERIAL PRIMARY KEY,
  empresaid INTEGER NOT NULL REFERENCES empresas(id),
  equipeid INTEGER NOT NULL,
  cliente_id INTEGER,
  notificacao_origem_id INTEGER UNIQUE REFERENCES notificacoes(id) ON DELETE SET NULL,
  grupo_envio_id UUID,
  assunto VARCHAR(255) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendente'
    CHECK (estado IN ('pendente', 'em_resolucao', 'resolvido')),
  criada_por INTEGER NOT NULL,
  criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolvida_em TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS mensagens_internas (
  id BIGSERIAL PRIMARY KEY,
  conversa_id BIGINT NOT NULL REFERENCES conversas_internas(id) ON DELETE CASCADE,
  empresaid INTEGER NOT NULL,
  autor_id INTEGER NOT NULL,
  autor_nome VARCHAR(100) NOT NULL,
  texto TEXT,
  anexos JSONB NOT NULL DEFAULT '[]'::jsonb,
  criada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_mensagem_conteudo CHECK (
    (texto IS NOT NULL AND LENGTH(BTRIM(texto)) > 0)
    OR (jsonb_typeof(anexos) = 'array' AND jsonb_array_length(anexos) > 0)
  ),
  CONSTRAINT chk_mensagem_anexos_array CHECK (jsonb_typeof(anexos) = 'array')
);

CREATE TABLE IF NOT EXISTS leituras_mensagens_internas (
  mensagem_id BIGINT NOT NULL REFERENCES mensagens_internas(id) ON DELETE CASCADE,
  usuario_id INTEGER NOT NULL,
  lida_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (mensagem_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_conversas_internas_empresa_equipa
  ON conversas_internas (empresaid, equipeid, atualizada_em DESC);
CREATE INDEX IF NOT EXISTS idx_mensagens_internas_conversa
  ON mensagens_internas (conversa_id, criada_em ASC, id ASC);
CREATE INDEX IF NOT EXISTS idx_leituras_mensagens_usuario
  ON leituras_mensagens_internas (usuario_id, mensagem_id);

-- Importacao/backfill das notificacoes antigas fica para a fase seguinte:
-- temos de identificar a equipa REAL de cada relatorio, sem assumir
-- que o cliente pertence sempre a uma unica equipa.
