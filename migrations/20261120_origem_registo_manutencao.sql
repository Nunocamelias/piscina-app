-- GESPOOL: distinguir preparação automática de visita iniciada pelo técnico.
-- Executar primeiro na base local; aplicar na Render antes de publicar a API.
-- Não modifica os estados nem os dados das visitas existentes.
ALTER TABLE manutencoes
  ADD COLUMN IF NOT EXISTS origem_registo varchar(20);

COMMENT ON COLUMN manutencoes.origem_registo IS
  'reset: registo preparado automaticamente; iniciada: visita iniciada pelo técnico; NULL: registo anterior à migração.';
