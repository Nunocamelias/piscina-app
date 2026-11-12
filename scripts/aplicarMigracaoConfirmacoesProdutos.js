'use strict';

// Aplicação manual e idempotente da migração das confirmações de produtos.
// Sem --confirmar, mostra apenas o destino e não modifica a base de dados.
const path = require('node:path');
const fs = require('node:fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const host = process.env.DB_HOST;
const database = process.env.DB_DATABASE;
console.log('Base de dados de destino:', host || '(não configurado)', '/', database || '(não configurada)');

if (!process.argv.includes('--confirmar')) {
  console.log('Nenhuma alteração executada.');
  console.log('Depois de confirmares o destino, executa este comando com --confirmar.');
  process.exit(0);
}

if (!host || !database || !process.env.DB_USER || !process.env.DB_PASSWORD) {
  console.error('Faltam variáveis DB_* no .env. Migração não executada.');
  process.exit(1);
}

const pool = new Pool({
  user: process.env.DB_USER,
  host,
  database,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

(async () => {
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '..', 'migrations', '20261112_confirmacoes_pendencias_produtos.sql'),
      'utf8'
    );
    await pool.query(sql);
    console.log('Migração aplicada: tabela de confirmações disponível.');
  } finally {
    await pool.end();
  }
})().catch((erro) => {
  console.error('Não foi possível aplicar a migração:', erro.message);
  process.exitCode = 1;
});
