-- GESPOOL: DIAGNÓSTICO APENAS DE LEITURA (PostgreSQL)
-- Não cria tabelas, não atualiza dados e não elimina registos.
-- Executar apenas depois de escolher a base de dados que se pretende inspecionar.
-- Não partilhar credenciais nem dados pessoais; basta o resultado desta consulta.

SELECT current_database() AS base_de_dados,
       current_schema() AS esquema_atual;

WITH colunas_necessarias(tabela, coluna) AS (
 VALUES
  ('empresas', 'id'),
  ('clientes', 'id'),
  ('clientes', 'empresaid'),
  ('clientes', 'nome'),
  ('equipes', 'id'),
  ('equipes', 'empresaid'),
  ('equipes', 'nomeequipe'),
  ('usuarios', 'id'),
  ('usuarios', 'nome'),
  ('usuarios', 'empresaid'),
  ('usuarios', 'equipeid'),
  ('usuarios', 'tipo_usuario'),
  ('notificacoes', 'id'),
  ('notificacoes', 'empresaid'),
  ('notificacoes', 'cliente_id'),
  ('notificacoes', 'assunto'),
  ('notificacoes', 'mensagem'),
  ('notificacoes', 'anexos'),
  ('notificacoes', 'criador_id')
)
SELECT r.tabela, r.coluna,
       CASE WHEN c.column_name IS NULL THEN 'FALTA' ELSE 'OK' END AS estado,
       COALESCE(c.data_type, '-') AS tipo_atual
FROM colunas_necessarias r
LEFT JOIN information_schema.columns c
  ON c.table_schema = current_schema()
 AND c.table_name = r.tabela
 AND c.column_name = r.coluna
ORDER BY r.tabela, r.coluna;

-- Esta consulta indica apenas se as novas tabelas já existem.
SELECT t.table_name AS tabela,
       CASE WHEN v.table_name IS NULL THEN 'POR CRIAR' ELSE 'JA EXISTE' END AS estado
FROM (VALUES
  ('conversas_internas'),
  ('mensagens_internas'),
  ('leituras_mensagens_internas'),
  ('dispositivos_push')
) AS t(table_name)
LEFT JOIN information_schema.tables v
  ON v.table_schema = current_schema()
 AND v.table_name = t.table_name
 AND v.table_type = 'BASE TABLE'
ORDER BY t.table_name;
