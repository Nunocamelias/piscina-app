require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl:
    process.env.DB_SSL === 'true'
      ? { rejectUnauthorized: false }
      : false,
});

async function criarTabelaExtras() {
  const client = await pool.connect();

  try {
    console.log('✅ Ligação à base de dados estabelecida.');

    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS extras_clientes (
        id SERIAL PRIMARY KEY,

        empresaid INTEGER NOT NULL,
        cliente_id INTEGER NOT NULL,
        manutencao_id INTEGER,
        equipe_id INTEGER,

        descricao VARCHAR(255) NOT NULL,

        quantidade NUMERIC(10,2) NOT NULL DEFAULT 1,

        valor_unitario NUMERIC(10,2),
        valor_total NUMERIC(10,2),

        estado VARCHAR(20) NOT NULL DEFAULT 'pendente',

        observacoes TEXT,

        criado_por INTEGER,

        data_servico TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),

        created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),

        CONSTRAINT fk_extras_empresa
          FOREIGN KEY (empresaid)
          REFERENCES empresas(id),

        CONSTRAINT fk_extras_cliente
          FOREIGN KEY (cliente_id)
          REFERENCES clientes(id),

        CONSTRAINT fk_extras_manutencao
          FOREIGN KEY (manutencao_id)
          REFERENCES manutencoes(id),

        CONSTRAINT fk_extras_equipe
          FOREIGN KEY (equipe_id)
          REFERENCES equipes(id),

        CONSTRAINT fk_extras_usuario
          FOREIGN KEY (criado_por)
          REFERENCES usuarios(id),

        CONSTRAINT chk_extras_estado
          CHECK (
            estado IN (
              'pendente',
              'valorizado',
              'nao_cobrar'
            )
          ),

        CONSTRAINT chk_extras_quantidade
          CHECK (quantidade > 0),

        CONSTRAINT chk_extras_valor_unitario
          CHECK (
            valor_unitario IS NULL
            OR valor_unitario >= 0
          ),

        CONSTRAINT chk_extras_valor_total
          CHECK (
            valor_total IS NULL
            OR valor_total >= 0
          )
      );
    `);

    console.log('✅ Tabela extras_clientes criada/verificada.');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_extras_clientes_empresa_cliente
      ON extras_clientes (empresaid, cliente_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_extras_clientes_manutencao
      ON extras_clientes (manutencao_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_extras_clientes_data
      ON extras_clientes (empresaid, data_servico);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_extras_clientes_estado
      ON extras_clientes (empresaid, estado);
    `);

    console.log('✅ Índices criados/verificados.');

    await client.query('COMMIT');

    const resultado = await client.query(`
      SELECT
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'extras_clientes'
      ORDER BY ordinal_position;
    `);

    console.log('');
    console.log('📋 Colunas encontradas em extras_clientes:');

    for (const coluna of resultado.rows) {
      console.log(
        ` - ${coluna.column_name} | ${coluna.data_type} | nullable=${coluna.is_nullable}`
      );
    }

    console.log('');
    console.log('🎉 Operação concluída com sucesso.');
  } catch (error) {
    await client.query('ROLLBACK');

    console.error('');
    console.error('❌ ERRO AO CRIAR A TABELA:');
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

criarTabelaExtras();