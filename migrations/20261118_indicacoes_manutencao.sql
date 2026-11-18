-- GESPOOL: distinguir uma indicação de manutenção de uma conversa normal
-- ou do relatório de anomalia existente. Nenhum histórico é alterado.
-- Aplicar DEPOIS de 20261116_mensagens_internas.sql e antes dos testes da API.
BEGIN;
ALTER TABLE conversas_internas
  ADD COLUMN IF NOT EXISTS indicacao_manutencao BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_conversas_indicacoes_equipa
  ON conversas_internas (empresaid, equipeid, cliente_id, criada_em)
  WHERE indicacao_manutencao IS TRUE;
COMMIT;
