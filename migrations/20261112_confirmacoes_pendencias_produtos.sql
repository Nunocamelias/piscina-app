-- Confirmacoes feitas diretamente nos avisos amarelos dos cartoes de clientes.
-- Nao modifica as manutencoes concluidas, nem as notificacoes.
-- Executar uma vez na base de dados antes de testar a nova funcionalidade.

CREATE TABLE IF NOT EXISTS confirmacoes_pendencias_produtos (
  id BIGSERIAL PRIMARY KEY,
  empresaid INTEGER NOT NULL,
  manutencao_parametro_id INTEGER NOT NULL
    REFERENCES manutencoes_parametros(id) ON DELETE CASCADE,
  estado VARCHAR(20) NOT NULL
    CHECK (estado IN ('aplicado', 'sem estoque')),
  confirmado_em TIMESTAMP WITHOUT TIME ZONE NOT NULL
    DEFAULT (NOW() AT TIME ZONE 'Europe/Lisbon')
);

CREATE INDEX IF NOT EXISTS idx_confirmacoes_pendencias_produtos_registo
  ON confirmacoes_pendencias_produtos
    (empresaid, manutencao_parametro_id, estado);
