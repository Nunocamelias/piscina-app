require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const moment = require('moment'); // Certifique-se de que o moment.js está instalado: npm install moment
const jwt = require('jsonwebtoken'); // Para gerar tokens JWT
const bcrypt = require('bcrypt'); // Para criptografar senhas
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5000;
const cron = require('node-cron');

// Middlewares
app.use(cors());
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ limit: '20mb', extended: true }));

// Rota de teste
app.get('/', (req, res) => {
  res.send('Servidor funcionando!');
});

// Configuração do PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});
pool.connect((err, client, release) => {
  if (err) {
    console.error('Erro ao conectar ao banco:', err.stack);
    return;
  }
  console.log('Conexão bem-sucedida ao banco.');
  release();
});
// Função para sanitizar strings
const sanitizeString = (value) => {
  if (typeof value === 'string') {
    return value.replace(/\0/g, '').trim(); // Remove caracteres nulos e espaços desnecessários
  }
  return value;
};
// Função para converter array em formato PostgreSQL
const formatArrayForPostgres = (array) => {
  if (Array.isArray(array)) {
    return `{${array.map((item) => `"${item}"`).join(',')}}`; // Formata como '{item1,item2,item3}'
  }
  return '{}'; // Retorna array vazio como padrão
};

// Endpoint POST para adicionar cliente
app.post('/clientes', async (req, res) => {
  const {
    empresaid,
    nome,
    morada,
    localidade,
    codigo_postal,
    google_maps,
    email,
    telefone,
    info_acesso,
    comprimento,
    largura,
    profundidade_media,
    volume,
    tanque_compensacao,
    cobertura,
    bomba_calor,
    equipamentos_especiais,
    eletrolise_sal,
    tem_orp, // ✅ NOVO
    ultima_substituicao,
    valor_manutencao,
    periodicidade,
    condicionantes,
  } = req.body;

  if (!empresaid) {
    return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  }

  try {
    const query = `
      INSERT INTO clientes 
      (
        empresaid, nome, morada, localidade, codigo_postal, google_maps,
        email, telefone, info_acesso,
        comprimento, largura, profundidade_media, volume,
        tanque_compensacao, cobertura, bomba_calor, equipamentos_especiais,
        eletrolise_sal, tem_orp,
        ultima_substituicao, valor_manutencao, periodicidade, condicionantes
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9,
        $10, $11, $12, $13,
        $14, $15, $16, $17,
        $18, $19,
        $20, $21, $22, $23
      )
      RETURNING *;
    `;

    const values = [
      empresaid,
      sanitizeString(nome),
      sanitizeString(morada),
      sanitizeString(localidade),
      sanitizeString(codigo_postal),
      sanitizeString(google_maps),
      sanitizeString(email),
      sanitizeString(telefone),
      sanitizeString(info_acesso),
      parseFloat(comprimento),
      parseFloat(largura),
      parseFloat(profundidade_media),
      parseFloat(volume),
      tanque_compensacao,
      cobertura,
      bomba_calor,
      equipamentos_especiais,
      eletrolise_sal,
      eletrolise_sal ? !!tem_orp : false, // ✅ regra de segurança
      ultima_substituicao ? moment(ultima_substituicao).format('YYYY-MM-DD') : null,
      parseFloat(valor_manutencao),
      sanitizeString(periodicidade),
      formatArrayForPostgres(condicionantes),
    ];

    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao salvar cliente:', error);
    res.status(500).send('Erro ao salvar cliente.');
  }
});

app.get('/empresas/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const query = `
      SELECT 
        id,
        nome,
        email,
        telefone,
        endereco,
        logo,
        nif
      FROM empresas
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa não encontrada.' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('❌ Erro ao buscar empresa:', error);
    res.status(500).json({ error: 'Erro ao buscar empresa.' });
  }
});

app.put('/empresas/:id/update', async (req, res) => {
  const { id } = req.params;
  const { nome, email, telefone, endereco, logo, nif } = req.body;

  try {
    const query = `
      UPDATE empresas
      SET 
        nome = COALESCE($1, nome),
        email = COALESCE($2, email),
        telefone = COALESCE($3, telefone),
        endereco = COALESCE($4, endereco),
        logo = COALESCE($5, logo),
        nif = COALESCE($6, nif)
      WHERE id = $7
      RETURNING id, nome, email, telefone, endereco, logo, nif;
    `;

    const values = [nome, email, telefone, endereco, logo, nif, id];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa não encontrada.' });
    }

    console.log('🏢 Empresa atualizada:', result.rows[0]);
    res.status(200).json({
      message: 'Empresa atualizada com sucesso!',
      empresa: result.rows[0],
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar empresa:', error);
    res.status(500).json({ error: 'Erro ao atualizar empresa.' });
  }
});

app.put('/clientes/:id', async (req, res) => {
  const { id } = req.params;
  const {
    empresaid,
    nome,
    morada,
    localidade,
    codigo_postal,
    google_maps,
    email,
    telefone,
    info_acesso,
    comprimento,
    largura,
    profundidade_media,
    volume,
    tanque_compensacao,
    cobertura,
    bomba_calor,
    equipamentos_especiais,
    eletrolise_sal,
    tem_orp, // ✅ NOVO
    ultima_substituicao,
    valor_manutencao,
    periodicidade,
    condicionantes,
  } = req.body;

  // Validação básica
  if (!empresaid) {
    return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  }

  try {
    // Verifica se o cliente pertence à empresa correta
    const verificarQuery = `
      SELECT * FROM clientes WHERE id = $1 AND empresaid = $2;
    `;
    const verificarResult = await pool.query(verificarQuery, [id, empresaid]);

    if (verificarResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado ou não pertence à empresa.' });
    }

    // Atualiza o cliente
    const query = `
      UPDATE clientes 
      SET nome = $1, morada = $2, localidade = $3, codigo_postal = $4, google_maps = $5, email = $6, telefone = $7, 
          info_acesso = $8, comprimento = $9, largura = $10, profundidade_media = $11, volume = $12, 
          tanque_compensacao = $13, cobertura = $14, bomba_calor = $15, equipamentos_especiais = $16, eletrolise_sal = $17, tem_orp = $18,
ultima_substituicao = $19, valor_manutencao = $20, periodicidade = $21, condicionantes = $22, updated_at = NOW()
WHERE id = $23 AND empresaid = $24
      RETURNING *;
    `;
    const values = [
      nome,
      morada,
      localidade,
      codigo_postal,
      google_maps,
      email,
      telefone,
      info_acesso,
      parseFloat(comprimento),
      parseFloat(largura),
      parseFloat(profundidade_media),
      parseFloat(volume),
      tanque_compensacao,
      cobertura,
      bomba_calor,
      equipamentos_especiais,
      eletrolise_sal,
      tem_orp,
      ultima_substituicao ? moment(ultima_substituicao).format('YYYY-MM-DD') : null, // ✅ evita crash se vier vazio
      parseFloat(valor_manutencao),
      periodicidade,
      `{${condicionantes?.join(',')}}`,
      id,
      empresaid,
    ];
    const result = await pool.query(query, values);

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ error: 'Erro ao atualizar cliente.' });
  }
});

app.get('/clientes', async (req, res) => {
  const { empresaid } = req.query;

  if (!empresaid) {
    return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  }

  try {
    const query = 'SELECT * FROM clientes WHERE empresaid = $1';
    const result = await pool.query(query, [empresaid]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar clientes:', error.message);
    res.status(500).send('Erro ao buscar clientes.');
  }
});
app.get('/clientes/:id', async (req, res) => {
  const { id } = req.params;
  const { empresaid } = req.query; // Inclui o empresaid como filtro

  if (!empresaid) {
    return res.status(400).send('O parâmetro empresaid é obrigatório.');
  }

  try {
    const query = `
      SELECT * 
      FROM clientes 
      WHERE id = $1 AND empresaid = $2;
    `;
    const values = [id, empresaid];
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).send('Cliente não encontrado ou não pertence à empresa especificada.');
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).send('Erro ao buscar cliente.');
  }
});
  // Endpoint DELETE para apagar cliente
app.delete('/clientes/:id', async (req, res) => {
    const { id } = req.params;
    const { empresaid } = req.query; // Inclui o empresaid como filtro

    if (!empresaid) {
      return res.status(400).send('O parâmetro empresaid é obrigatório.');
    }

    try {
      const query = `
        DELETE FROM clientes 
        WHERE id = $1 AND empresaid = $2 
        RETURNING *;
      `;
      const values = [id, empresaid];
      const result = await pool.query(query, values);
      if (result.rowCount === 0) {
        return res.status(404).send('Cliente não encontrado ou não pertence à empresa especificada.');
      }
        res.status(200).send('Cliente apagado com sucesso.');
    } catch (error) {
      console.error('Erro ao apagar cliente:', error);
      res.status(500).send('Erro ao apagar cliente.');
    }
});

app.get('/conta-corrente-clientes', async (req, res) => {
  const { empresaid, mes } = req.query;

  if (!empresaid) {
    return res.status(400).json({
      error: 'Empresaid é obrigatório.',
    });
  }

  const mesReferencia = mes || moment().format('YYYY-MM');

  try {
    const query = `
      SELECT
        c.id AS cliente_id,
        c.nome,
        c.morada,

        COALESCE(pc.valor_manutencao, 0) AS valor_manutencao,

        pc.id AS pagamento_id,
        pc.mes_referencia,

        COALESCE(extras.total_extras, 0) AS valor_extra,
        COALESCE(extras.extras_pendentes, 0) AS extras_pendentes,

        COALESCE(movimentos.total_pago, 0) AS valor_pago,

        pc.estado,
        pc.observacoes,
        pc.data_pagamento,

        COALESCE(anteriores.saldo_anterior, 0) AS saldo_anterior,

        (
          COALESCE(pc.valor_manutencao, 0)
          + COALESCE(extras.total_extras, 0)
          - COALESCE(movimentos.total_pago, 0)
        ) AS saldo_mes,

        (
          COALESCE(anteriores.saldo_anterior, 0)
          + COALESCE(pc.valor_manutencao, 0)
          + COALESCE(extras.total_extras, 0)
          - COALESCE(movimentos.total_pago, 0)
        ) AS saldo_total

      FROM clientes c

      LEFT JOIN pagamentos_clientes pc
        ON pc.cliente_id = c.id
        AND pc.empresaid = c.empresaid
        AND pc.mes_referencia = $2

      LEFT JOIN (
        SELECT
          cliente_id,
          empresaid,

          SUM(
            CASE
              WHEN estado = 'valorizado'
              THEN COALESCE(valor_total, 0)
              ELSE 0
            END
          ) AS total_extras,

          COUNT(*) FILTER (
            WHERE estado = 'pendente'
          ) AS extras_pendentes

        FROM extras_clientes

        WHERE TO_CHAR(data_servico, 'YYYY-MM') = $2

        GROUP BY
          cliente_id,
          empresaid
      ) extras
        ON extras.cliente_id = c.id
        AND extras.empresaid = c.empresaid

      LEFT JOIN (
        SELECT
          cliente_id,
          empresaid,
          mes_referencia,
          SUM(valor) AS total_pago
        FROM pagamentos_movimentos
        GROUP BY
          cliente_id,
          empresaid,
          mes_referencia
      ) movimentos
        ON movimentos.cliente_id = c.id
        AND movimentos.empresaid = c.empresaid
        AND movimentos.mes_referencia = $2

      LEFT JOIN (
        SELECT
          pc_ant.cliente_id,
          pc_ant.empresaid,

          SUM(
            COALESCE(pc_ant.valor_manutencao, 0)
            + COALESCE(extras_ant.total_extras, 0)
            - COALESCE(mov_ant.total_pago, 0)
          ) AS saldo_anterior

        FROM pagamentos_clientes pc_ant

        LEFT JOIN (
          SELECT
            cliente_id,
            empresaid,
            TO_CHAR(data_servico, 'YYYY-MM') AS mes_referencia,

            SUM(
              CASE
                WHEN estado = 'valorizado'
                THEN COALESCE(valor_total, 0)
                ELSE 0
              END
            ) AS total_extras

          FROM extras_clientes

          GROUP BY
            cliente_id,
            empresaid,
            TO_CHAR(data_servico, 'YYYY-MM')
        ) extras_ant
          ON extras_ant.cliente_id = pc_ant.cliente_id
          AND extras_ant.empresaid = pc_ant.empresaid
          AND extras_ant.mes_referencia = pc_ant.mes_referencia

        LEFT JOIN (
          SELECT
            cliente_id,
            empresaid,
            mes_referencia,
            SUM(valor) AS total_pago
          FROM pagamentos_movimentos
          GROUP BY
            cliente_id,
            empresaid,
            mes_referencia
        ) mov_ant
          ON mov_ant.cliente_id = pc_ant.cliente_id
          AND mov_ant.empresaid = pc_ant.empresaid
          AND mov_ant.mes_referencia = pc_ant.mes_referencia

        WHERE pc_ant.empresaid = $1
          AND pc_ant.mes_referencia < $2

        GROUP BY
          pc_ant.cliente_id,
          pc_ant.empresaid
      ) anteriores
        ON anteriores.cliente_id = c.id
        AND anteriores.empresaid = c.empresaid

      WHERE c.empresaid = $1

      ORDER BY c.nome ASC;
    `;

    const result = await pool.query(query, [
      empresaid,
      mesReferencia,
    ]);

    return res.status(200).json({
      mes_referencia: mesReferencia,
      clientes: result.rows,
    });
  } catch (error) {
    console.error('Erro ao buscar conta corrente:', error);

    return res.status(500).json({
      error: 'Erro ao buscar conta corrente.',
      detalhes: error.message,
    });
  }
});

app.post('/conta-corrente-clientes/pagamento', async (req, res) => {
  const {
    cliente_id,
    empresaid,
    mes_referencia,
    valor_manutencao,
    valor_extra,
    valor_pago,
    observacoes,
  } = req.body;

  if (!cliente_id || !empresaid || !mes_referencia) {
    return res.status(400).json({
      error: 'cliente_id, empresaid e mes_referencia são obrigatórios.',
    });
  }

  try {
    const valorManutencaoNum = Number(valor_manutencao || 0);
    const valorExtraNum = Number(valor_extra || 0);
    const valorPagoNum = Number(valor_pago || 0);

    if (valorPagoNum > 0) {
  await pool.query(
    `
      INSERT INTO pagamentos_movimentos (
        cliente_id,
        empresaid,
        mes_referencia,
        valor,
        observacoes,
        data_pagamento,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW());
    `,
    [
      cliente_id,
      empresaid,
      mes_referencia,
      valorPagoNum,
      observacoes || null,
    ]
  );
}

    const totalMovimentosResult = await pool.query(
  `
    SELECT COALESCE(SUM(valor), 0) AS total_pago
    FROM pagamentos_movimentos
    WHERE cliente_id = $1
      AND empresaid = $2
      AND mes_referencia = $3;
  `,
  [
    cliente_id,
    empresaid,
    mes_referencia,
  ]
);

const totalPagoMes = Number(
  totalMovimentosResult.rows[0]?.total_pago || 0
);

const saldoAnteriorResult = await pool.query(
  `
    SELECT COALESCE(
      SUM(
        COALESCE(pc.valor_manutencao, 0)
        + COALESCE(pc.valor_extra, 0)
        - COALESCE(movimentos.total_pago, 0)
      ),
      0
    ) AS saldo_anterior

    FROM pagamentos_clientes pc

    LEFT JOIN (
      SELECT
        cliente_id,
        empresaid,
        mes_referencia,
        SUM(valor) AS total_pago
      FROM pagamentos_movimentos
      GROUP BY cliente_id, empresaid, mes_referencia
    ) movimentos
      ON movimentos.cliente_id = pc.cliente_id
      AND movimentos.empresaid = pc.empresaid
      AND movimentos.mes_referencia = pc.mes_referencia

    WHERE pc.cliente_id = $1
      AND pc.empresaid = $2
      AND pc.mes_referencia < $3;
  `,
  [
    cliente_id,
    empresaid,
    mes_referencia,
  ]
);

const saldoAnterior = Number(
  saldoAnteriorResult.rows[0]?.saldo_anterior || 0
);

const saldoTotalAtual =
  saldoAnterior
  + valorManutencaoNum
  + valorExtraNum
  - totalPagoMes;

    let estado = 'pendente';

if (saldoTotalAtual <= 0) {
  estado = 'pago';
} else if (totalPagoMes > 0) {
  estado = 'parcial';
}

    const query = `
      INSERT INTO pagamentos_clientes (
        cliente_id,
        empresaid,
        mes_referencia,
        valor_manutencao,
        valor_extra,
        valor_pago,
        estado,
        observacoes,
        data_pagamento,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      ON CONFLICT (cliente_id, empresaid, mes_referencia)
      DO UPDATE SET
        valor_manutencao = EXCLUDED.valor_manutencao,
        valor_extra = EXCLUDED.valor_extra,
        valor_pago = EXCLUDED.valor_pago,
        estado = EXCLUDED.estado,
        observacoes = EXCLUDED.observacoes,
        data_pagamento = NOW(),
        updated_at = NOW()
      RETURNING *;
    `;

    const values = [
      cliente_id,
      empresaid,
      mes_referencia,
      valorManutencaoNum,
      valorExtraNum,
      totalPagoMes,
      estado,
      observacoes || null,
    ];

    const result = await pool.query(query, values);

    return res.status(200).json({
      message: 'Pagamento registado com sucesso.',
      pagamento: result.rows[0],
    });
  } catch (error) {
    console.error('Erro ao registar pagamento:', error);
    return res.status(500).json({ error: 'Erro ao registar pagamento.' });
  }
});

app.get('/pagamentos-movimentos', async (req, res) => {
  const {
    cliente_id,
    empresaid,
    mes_referencia,
  } = req.query;

  if (!cliente_id || !empresaid || !mes_referencia) {
    return res.status(400).json({
      error:
        'cliente_id, empresaid e mes_referencia são obrigatórios.',
    });
  }

  try {
    const query = `
      SELECT
        id,
        cliente_id,
        empresaid,
        mes_referencia,
        valor,
        observacoes,
        data_pagamento,
        created_at,
        updated_at
      FROM pagamentos_movimentos
      WHERE cliente_id = $1
        AND empresaid = $2
        AND mes_referencia = $3
      ORDER BY data_pagamento ASC, id ASC;
    `;

    const values = [
      Number(cliente_id),
      Number(empresaid),
      String(mes_referencia),
    ];

    const result = await pool.query(query, values);

    const totalRecebido = result.rows.reduce(
      (total, movimento) =>
        total + Number(movimento.valor || 0),
      0
    );

    return res.status(200).json({
      mes_referencia: mes_referencia,
      total_recebido: totalRecebido,
      movimentos: result.rows,
    });
  } catch (error) {
    console.error(
      'Erro ao buscar movimentos de pagamento:',
      error
    );

    return res.status(500).json({
      error: 'Erro ao buscar movimentos de pagamento.',
    });
  }
});

app.post('/conta-corrente-clientes/lancar-mensalidade-manual', async (req, res) => {
  const {
    cliente_id,
    empresaid,
    mes_referencia,
    valor_manutencao,
    observacoes,
  } = req.body;

  if (!cliente_id || !empresaid || !mes_referencia) {
    return res.status(400).json({
      error: 'cliente_id, empresaid e mes_referencia são obrigatórios.',
    });
  }

  if (!/^\d{4}-\d{2}$/.test(mes_referencia)) {
    return res.status(400).json({
      error: 'Mês de referência inválido. Use YYYY-MM.',
    });
  }

  const valorManutencaoNum = Number(valor_manutencao || 0);

  if (valorManutencaoNum < 0) {
    return res.status(400).json({
      error: 'O valor da mensalidade não pode ser negativo.',
    });
  }

  try {
    const clienteResult = await pool.query(
      `
        SELECT id, empresaid
        FROM clientes
        WHERE id = $1
          AND empresaid = $2;
      `,
      [cliente_id, empresaid]
    );

    if (clienteResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Cliente não encontrado ou não pertence à empresa.',
      });
    }

    const query = `
      INSERT INTO pagamentos_clientes (
        cliente_id,
        empresaid,
        mes_referencia,
        valor_manutencao,
        valor_extra,
        valor_pago,
        estado,
        observacoes,
        data_pagamento,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        0,
        0,
        'pendente',
        $5,
        NULL,
        NOW()
      )
      ON CONFLICT (cliente_id, empresaid, mes_referencia)
      DO UPDATE SET
        valor_manutencao = EXCLUDED.valor_manutencao,
        observacoes = EXCLUDED.observacoes,
        estado = CASE
          WHEN COALESCE(pagamentos_clientes.valor_pago, 0) >= EXCLUDED.valor_manutencao
            THEN 'pago'
          WHEN COALESCE(pagamentos_clientes.valor_pago, 0) > 0
            THEN 'parcial'
          ELSE 'pendente'
        END,
        updated_at = NOW()
      RETURNING *;
    `;

    const values = [
      cliente_id,
      empresaid,
      mes_referencia,
      valorManutencaoNum,
      observacoes || null,
    ];

    const result = await pool.query(query, values);

    return res.status(200).json({
      message: 'Mensalidade lançada manualmente com sucesso.',
      mensalidade: result.rows[0],
    });
  } catch (error) {
    console.error('Erro ao lançar mensalidade manual:', error);

    return res.status(500).json({
      error: 'Erro ao lançar mensalidade manual.',
      detalhes: error.message,
    });
  }
});

app.post('/extras-clientes', async (req, res) => {
  const {
    empresaid,
    cliente_id,
    manutencao_id,
    equipe_id,
    descricao,
    quantidade,
    valor_unitario,
    observacoes,
    criado_por,
  } = req.body;

  if (!empresaid || !cliente_id || !descricao?.trim()) {
    return res.status(400).json({
      error: 'empresaid, cliente_id e descricao são obrigatórios.',
    });
  }

  const quantidadeNum = Number(quantidade || 1);

  if (!Number.isFinite(quantidadeNum) || quantidadeNum <= 0) {
    return res.status(400).json({
      error: 'Quantidade inválida.',
    });
  }

  let valorUnitarioNum = null;
  let valorTotal = null;
  let estado = 'pendente';

  if (
    valor_unitario !== null &&
    valor_unitario !== undefined &&
    String(valor_unitario).trim() !== ''
  ) {
    valorUnitarioNum = Number(valor_unitario);

    if (!Number.isFinite(valorUnitarioNum) || valorUnitarioNum < 0) {
      return res.status(400).json({
        error: 'Valor unitário inválido.',
      });
    }

    valorTotal = Number(
      (quantidadeNum * valorUnitarioNum).toFixed(2)
    );

    estado = 'valorizado';
  }

  try {
    // Confirmar que o cliente pertence à empresa
    const clienteResult = await pool.query(
      `
      SELECT id
      FROM clientes
      WHERE id = $1
        AND empresaid = $2;
      `,
      [cliente_id, empresaid]
    );

    if (clienteResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Cliente não encontrado ou não pertence à empresa.',
      });
    }

    // Se vier manutencao_id, confirmar que pertence ao mesmo cliente/empresa
    if (manutencao_id) {
      const manutencaoResult = await pool.query(
        `
        SELECT id
        FROM manutencoes
        WHERE id = $1
          AND cliente_id = $2
          AND empresaid = $3;
        `,
        [manutencao_id, cliente_id, empresaid]
      );

      if (manutencaoResult.rows.length === 0) {
        return res.status(400).json({
          error:
            'A manutenção indicada não pertence ao cliente/empresa.',
        });
      }
    }

    const result = await pool.query(
      `
      INSERT INTO extras_clientes (
        empresaid,
        cliente_id,
        manutencao_id,
        equipe_id,
        descricao,
        quantidade,
        valor_unitario,
        valor_total,
        estado,
        observacoes,
        criado_por,
        data_servico,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        NOW(),
        NOW(),
        NOW()
      )
      RETURNING *;
      `,
      [
        empresaid,
        cliente_id,
        manutencao_id || null,
        equipe_id || null,
        descricao.trim(),
        quantidadeNum,
        valorUnitarioNum,
        valorTotal,
        estado,
        observacoes?.trim() || null,
        criado_por || null,
      ]
    );

    return res.status(201).json({
      message: 'Extra registado com sucesso.',
      extra: result.rows[0],
    });
  } catch (error) {
    console.error('Erro ao registar extra:', error);

    return res.status(500).json({
      error: 'Erro ao registar extra.',
      detalhes: error.message,
    });
  }
});

app.get('/extras-clientes', async (req, res) => {
  const {
    empresaid,
    cliente_id,
    manutencao_id,
    estado,
    mes,
  } = req.query;

  if (!empresaid || !cliente_id) {
    return res.status(400).json({
      error: 'empresaid e cliente_id são obrigatórios.',
    });
  }

  if (mes && !/^\d{4}-\d{2}$/.test(String(mes))) {
    return res.status(400).json({
      error: 'O mês deve estar no formato YYYY-MM.',
    });
  }

  try {
    const values = [
      Number(empresaid),
      Number(cliente_id),
    ];

    let where = `
      WHERE empresaid = $1
        AND cliente_id = $2
    `;

    if (manutencao_id) {
      values.push(Number(manutencao_id));
      where += ` AND manutencao_id = $${values.length}`;
    }

    if (estado) {
      values.push(String(estado));
      where += ` AND estado = $${values.length}`;
    }

    if (mes) {
      values.push(String(mes));

      where += `
        AND data_servico >= TO_DATE(
          $${values.length} || '-01',
          'YYYY-MM-DD'
        )
        AND data_servico < (
          TO_DATE(
            $${values.length} || '-01',
            'YYYY-MM-DD'
          ) + INTERVAL '1 month'
        )
      `;
    }

    const result = await pool.query(
      `
      SELECT
        id,
        empresaid,
        cliente_id,
        manutencao_id,
        equipe_id,
        descricao,
        quantidade,
        valor_unitario,
        valor_total,
        estado,
        observacoes,
        criado_por,
        data_servico,
        created_at,
        updated_at
      FROM extras_clientes
      ${where}
      ORDER BY data_servico ASC, id ASC;
      `,
      values
    );

    const totalValorizado = result.rows.reduce(
      (total, extra) =>
        extra.estado === 'valorizado'
          ? total + Number(extra.valor_total || 0)
          : total,
      0
    );

    const extrasPendentes = result.rows.filter(
      (extra) => extra.estado === 'pendente'
    ).length;

    return res.status(200).json({
      extras: result.rows,
      total_valorizado: totalValorizado,
      extras_pendentes: extrasPendentes,
    });
  } catch (error) {
    console.error('Erro ao buscar extras:', error);

    return res.status(500).json({
      error: 'Erro ao buscar extras.',
      detalhes: error.message,
    });
  }
});

app.put('/extras-clientes/:id', async (req, res) => {
  const { id } = req.params;

  const {
    empresaid,
    valor_unitario,
    quantidade,
    descricao,
    observacoes,
    estado,
  } = req.body;

  if (!empresaid) {
    return res.status(400).json({
      error: 'empresaid é obrigatório.',
    });
  }

  try {
    const extraResult = await pool.query(
      `
      SELECT *
      FROM extras_clientes
      WHERE id = $1
        AND empresaid = $2;
      `,
      [id, empresaid]
    );

    if (extraResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Extra não encontrado.',
      });
    }

    const extraAtual = extraResult.rows[0];

    const quantidadeFinal =
      quantidade !== undefined && quantidade !== null
        ? Number(quantidade)
        : Number(extraAtual.quantidade || 1);

    if (
      !Number.isFinite(quantidadeFinal) ||
      quantidadeFinal <= 0
    ) {
      return res.status(400).json({
        error: 'Quantidade inválida.',
      });
    }

    let valorUnitarioFinal = extraAtual.valor_unitario;
    let valorTotalFinal = extraAtual.valor_total;
    let estadoFinal = extraAtual.estado;

    if (
      valor_unitario !== undefined &&
      valor_unitario !== null &&
      String(valor_unitario).trim() !== ''
    ) {
      valorUnitarioFinal = Number(valor_unitario);

      if (
        !Number.isFinite(valorUnitarioFinal) ||
        valorUnitarioFinal < 0
      ) {
        return res.status(400).json({
          error: 'Valor unitário inválido.',
        });
      }

      valorTotalFinal = Number(
        (quantidadeFinal * valorUnitarioFinal).toFixed(2)
      );

      estadoFinal = 'valorizado';
    }

    if (
      estado === 'nao_cobrar'
    ) {
      estadoFinal = 'nao_cobrar';
      valorUnitarioFinal = 0;
      valorTotalFinal = 0;
    }

    const result = await pool.query(
      `
      UPDATE extras_clientes
      SET
        descricao = COALESCE($1, descricao),
        quantidade = $2,
        valor_unitario = $3,
        valor_total = $4,
        estado = $5,
        observacoes = COALESCE($6, observacoes),
        updated_at = NOW()
      WHERE id = $7
        AND empresaid = $8
      RETURNING *;
      `,
      [
        descricao?.trim() || null,
        quantidadeFinal,
        valorUnitarioFinal,
        valorTotalFinal,
        estadoFinal,
        observacoes?.trim() || null,
        id,
        empresaid,
      ]
    );

    return res.status(200).json({
      message: 'Extra atualizado com sucesso.',
      extra: result.rows[0],
    });
  } catch (error) {
    console.error('Erro ao atualizar extra:', error);

    return res.status(500).json({
      error: 'Erro ao atualizar extra.',
      detalhes: error.message,
    });
  }
});

app.post('/equipes', async (req, res) => {
    try {
      const {
        empresaid,
        nomeequipe,
        nome1,
        nome2,
        matricula,
        telefone,
        proxima_inspecao,
        validade_seguro,
      } = req.body;

      console.debug('📩 Recebendo dados para criação de equipe:', req.body);

      // ✅ Validação de campos obrigatórios
      if (!empresaid || !nomeequipe || !nome1 || !nome2 || !matricula || !telefone) {
        console.warn('⚠️ Campos obrigatórios ausentes.');
        return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser fornecidos.' });
      }

      // ✅ Verifica se `empresaid` é um número válido
      const empresaidNum = Number(empresaid);
      if (isNaN(empresaidNum)) {
        console.warn('⚠️ Empresaid inválido:', empresaid);
        return res.status(400).json({ error: 'Empresaid deve ser um número válido.' });
      }

      // ✅ Validações de formato de data
      if (proxima_inspecao && isNaN(Date.parse(proxima_inspecao))) {
        console.warn('⚠️ Data inválida para próxima inspeção:', proxima_inspecao);
        return res.status(400).json({ error: 'A data de próxima inspeção é inválida.' });
      }

      if (validade_seguro && isNaN(Date.parse(validade_seguro))) {
        console.warn('⚠️ Data inválida para validade do seguro:', validade_seguro);
        return res.status(400).json({ error: 'A validade do seguro é inválida.' });
      }

      // ✅ Inserção no banco de dados
      const query = `
        INSERT INTO equipes (empresaid, nomeequipe, nome1, nome2, matricula, telefone, proxima_inspecao, validade_seguro, data_criacao)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING *;
      `;
      const values = [empresaidNum, nomeequipe, nome1, nome2, matricula, telefone, proxima_inspecao || null, validade_seguro || null];

      console.debug('🛠️ Executando query de inserção de equipe...');
      const result = await pool.query(query, values);

      console.debug('✅ Equipe criada com sucesso:', result.rows[0]);

      res.status(201).json({
        message: 'Equipe criada com sucesso!',
        equipe: result.rows[0],
      });
    } catch (error) {
      console.error('❌ Erro ao salvar equipe:', error);

      // ✅ Tratamento específico para erro de chave duplicada (caso já exista uma equipe com os mesmos dados)
      if (error.code === '23505') {
        return res.status(400).json({ error: 'Já existe uma equipe com esses dados.' });
      }

      res.status(500).json({ error: 'Erro ao salvar equipe.' });
    }
});

// Endpoint GET para buscar todas as equipes de uma empresa
app.get('/equipes', async (req, res) => {
    const { empresaid } = req.query;

    if (!empresaid) {
      return res.status(400).json({ error: 'O parâmetro empresaid é obrigatório.' });
    }

    try {
      const query = `
        SELECT * 
        FROM equipes 
        WHERE empresaid = $1;
      `;
      const result = await pool.query(query, [empresaid]);

      if (result.rows.length === 0) {
        console.warn('[DEBUG] Nenhuma equipe encontrada para empresa:', empresaid);
        return res.status(200).json([]); // ✅ Retorna um array vazio, sem erro 404
      }

      res.status(200).json(result.rows);
    } catch (error) {
      console.error('[DEBUG] Erro ao buscar equipes:', error);
      res.status(500).json({ error: 'Erro ao buscar equipes.' });
    }
});

app.get('/equipes/:id', async (req, res) => {
    const { id } = req.params;
    const { empresaid } = req.query; // Inclui o empresaid como filtro

    if (!empresaid) {
      return res.status(400).send('O parâmetro empresaid é obrigatório.');
    }

    try {
      const query = `
        SELECT * 
        FROM equipes 
        WHERE id = $1 AND empresaid = $2;
      `;
      const values = [id, empresaid];
      const result = await pool.query(query, values);
        if (result.rows.length === 0) {
        return res.status(404).send('Equipe não encontrada ou não pertence à empresa especificada.');
      }

      res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error('Erro ao buscar equipe:', error);
      res.status(500).send('Erro ao buscar equipe.');
    }
});

// Endpoint PUT para atualizar uma equipe
app.put('/equipes/:id', async (req, res) => {
  const {
    empresaid,
    nomeequipe,
    nome1,
    nome2,
    matricula,
    telefone,
    proxima_inspecao,
    validade_seguro,
    email,
    senha,
  } = req.body;

  const { id } = req.params;

  if (!empresaid) {
    return res.status(400).send('O campo empresaid é obrigatório.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // Inicia uma transação

    // Verificar se a equipe pertence à empresa
    const verificaQuery = `
      SELECT id
      FROM equipes
      WHERE id = $1 AND empresaid = $2;
    `;
    const verificaResult = await client.query(verificaQuery, [id, empresaid]);

    if (verificaResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).send('A equipe não pertence à empresa especificada.');
    }

    // Atualizar a equipe
    const queryEquipe = `
      UPDATE equipes
      SET nomeequipe = $1, nome1 = $2, nome2 = $3, matricula = $4, telefone = $5, proxima_inspecao = $6, validade_seguro = $7
      WHERE id = $8
      RETURNING *;
    `;
    const valuesEquipe = [nomeequipe, nome1, nome2, matricula, telefone, proxima_inspecao, validade_seguro, id];
    const equipeResult = await client.query(queryEquipe, valuesEquipe);

    // Atualizar ou criar o usuário associado
    if (email && senha) {
      const hashedPassword = await bcrypt.hash(senha, 10);
      const queryUsuario = `
        INSERT INTO usuarios (nome, email, senha, tipo_usuario, equipeid, empresaid)
        VALUES ($1, $2, $3, 'equipe', $4, $5)
        ON CONFLICT (email) DO UPDATE SET
          nome = EXCLUDED.nome,
          senha = EXCLUDED.senha,
          equipeid = EXCLUDED.equipeid,
          empresaid = EXCLUDED.empresaid;
      `;
      const valuesUsuario = [nomeequipe, email, hashedPassword, id, empresaid];
      await client.query(queryUsuario, valuesUsuario);
    }

    await client.query('COMMIT'); // Finaliza a transação
    res.status(200).json(equipeResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK'); // Reverte em caso de erro
    console.error('Erro ao atualizar equipe:', error);
    res.status(500).send('Erro ao atualizar equipe.');
  } finally {
    client.release();
  }
});

app.delete('/equipes/:id', async (req, res) => {
    const { id } = req.params;
    const { empresaid } = req.query; // Inclui o empresaid na query string

    if (!empresaid) {
      return res.status(400).send('O parâmetro empresaid é obrigatório.');
    }

    try {
      // Verificar se a equipe pertence à empresa
      const verificaQuery = `
        SELECT id
        FROM equipes
        WHERE id = $1 AND empresaid = $2;
      `;
      const verificaResult = await pool.query(verificaQuery, [id, empresaid]);

      if (verificaResult.rows.length === 0) {
        return res.status(403).send('A equipe não pertence à empresa especificada.');
      }

      // Excluir a equipe
      const query = `
        DELETE FROM equipes
        WHERE id = $1
        RETURNING *;
      `;
      const values = [id];
      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).send('Equipe não encontrada.');
      }

      res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error('Erro ao excluir equipe:', error);
      res.status(500).send('Erro ao excluir equipe.');
    }
});

// Rota para buscar clientes associados a um dia específico da equipe
app.get('/clientes-por-dia', async (req, res) => {
  const { equipeId, diaSemana, empresaid } = req.query;

  if (!equipeId || !diaSemana || !empresaid) {
    return res.status(400).json({ error: 'EquipeId, diaSemana e empresaid são obrigatórios.' });
  }

  try {
    const query = `
      SELECT DISTINCT ON (c.id) 
        c.id, 
        c.nome, 
        c.morada, 
        c.telefone, 
        c.info_acesso,
        c.google_maps,
        c.volume,
        c.tanque_compensacao,
        c.cobertura,
        c.bomba_calor,
        c.equipamentos_especiais,
        c.eletrolise_sal,
        c.ultima_substituicao,
        COALESCE(m.status, 'pendente') AS status,
        m.motivo
      FROM associados a
      JOIN clientes c ON a.clienteId = c.id
      LEFT JOIN manutencoes m 
        ON m.cliente_id = c.id
        AND m.equipe_id = $1 
        AND m.dia_semana = $2
        AND m.empresaid = $3
      WHERE a.equipeId = $1 
        AND a.diaSemana = $2
        AND c.empresaid = $3
      ORDER BY c.id, m.data_manutencao DESC;
    `;
    const values = [equipeId, diaSemana, empresaid];
    const result = await pool.query(query, values);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.status(500).json({ error: 'Erro ao buscar clientes.' });
  }
});

// Rota para associar um cliente a uma equipe em um dia específico
app.post('/associar-cliente', async (req, res) => {
    const { clienteId, equipeId, diaSemana, empresaid } = req.body;

    console.log('[DEBUG] Dados recebidos:', { clienteId, equipeId, diaSemana, empresaid });

    if (!clienteId || !equipeId || !diaSemana || !empresaid) {
      console.log('[DEBUG] Dados ausentes na requisição.');
      return res.status(400).json({ error: 'ClienteId, equipeId, diaSemana e empresaid são obrigatórios.' });
    }

    try {
      const verificarQuery = `
        SELECT 1
        FROM clientes c
        JOIN equipes e ON e.id = $2
        WHERE c.id = $1 AND c.empresaid = $3 AND e.empresaid = $3;
      `;
      console.log('[DEBUG] Executando query de verificação...');
      const verificarResult = await pool.query(verificarQuery, [clienteId, equipeId, empresaid]);

      if (verificarResult.rowCount === 0) {
        console.log('[DEBUG] Cliente ou equipe não pertencem à empresa.');
        return res.status(400).json({ error: 'Cliente ou equipe não pertencem à empresa especificada.' });
      }

      const query = `
        INSERT INTO associados (clienteId, equipeId, diaSemana, empresaid)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (clienteId, diaSemana) DO NOTHING
        RETURNING *;
      `;
      console.log('[DEBUG] Executando query de inserção...');
      const values = [clienteId, equipeId, diaSemana, empresaid];
      const result = await pool.query(query, values);

      if (result.rowCount === 0) {
        console.log('[DEBUG] Associação já existente.');
        return res.status(400).json({ error: 'Cliente já associado a este dia.' });
      }

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('[DEBUG] Erro ao associar cliente:', error);
      res.status(500).json({ error: 'Erro ao associar cliente.' });
    }
});

// Rota para desassociar um cliente de um dia específico
app.delete('/desassociar-cliente', async (req, res) => {
      const { clienteId, equipeId, diaSemana, empresaid } = req.body;

      if (!clienteId || !equipeId || !diaSemana || !empresaid) {
        return res.status(400).json({ error: 'ClienteId, equipeId, diaSemana e empresaid são obrigatórios.' });
      }

      try {
        const query = `
          DELETE FROM associados
          WHERE clienteId = $1 AND equipeId = $2 AND diaSemana = $3 AND empresaid = $4
          RETURNING *;
        `;
        const values = [clienteId, equipeId, diaSemana, empresaid];
        const result = await pool.query(query, values);

        if (result.rowCount === 0) {
          return res.status(404).json({ error: 'Associação não encontrada ou não pertence à empresa especificada.' });
        }

        res.status(200).json({ message: 'Cliente desassociado com sucesso.' });
      } catch (error) {
        console.error('Erro ao desassociar cliente:', error);
        res.status(500).json({ error: 'Erro ao desassociar cliente.' });
      }
});

app.get('/associados/:equipeId/:diaSemana', async (req, res) => {
      const { equipeId, diaSemana } = req.params;
      const { empresaid } = req.query;

      if (!empresaid) {
        return res.status(400).json({ error: 'O parâmetro empresaid é obrigatório.' });
      }

      try {
        const query = `
          SELECT 
            c.id AS clienteId, 
            c.nome, 
            c.morada, 
            c.telefone
          FROM associados a
          INNER JOIN clientes c ON a.clienteId = c.id
          INNER JOIN equipes e ON a.equipeId = e.id
          WHERE a.equipeId = $1 
            AND a.diaSemana = $2
            AND e.empresaid = $3
        `;
        const values = [equipeId, diaSemana, empresaid];
        const result = await pool.query(query, values);
        res.status(200).json(result.rows);
      } catch (error) {
        console.error('Erro ao buscar associados:', error);
        res.status(500).send('Erro ao buscar associados.');
      }
});

app.post('/associados', async (req, res) => {
      const { equipeId, clienteId, diaSemana, empresaid } = req.body;

      console.log('[DEBUG] Dados recebidos:', { equipeId, clienteId, diaSemana, empresaid });

      if (!empresaid) {
        console.log('[DEBUG] Campo empresaid ausente.');
        return res.status(400).json({ error: 'O campo empresaid é obrigatório.' });
      }

      try {
        // Verifica se a equipe pertence à empresa
        const equipeQuery = `
          SELECT 1 FROM equipes
          WHERE id = $1 AND empresaid = $2
        `;
        console.log('[DEBUG] Verificando equipe...');
        const equipeResult = await pool.query(equipeQuery, [equipeId, empresaid]);
        if (equipeResult.rows.length === 0) {
          console.log('[DEBUG] Equipe não encontrada ou não pertence à empresa.');
          return res.status(400).json({ error: 'Equipe não encontrada ou não pertence à empresa.' });
        }

        // Verifica se o cliente pertence à empresa
        const clienteQuery = `
          SELECT 1 FROM clientes
          WHERE id = $1 AND empresaid = $2
        `;
        console.log('[DEBUG] Verificando cliente...');
        const clienteResult = await pool.query(clienteQuery, [clienteId, empresaid]);
        if (clienteResult.rows.length === 0) {
          console.log('[DEBUG] Cliente não encontrado ou não pertence à empresa.');
          return res.status(400).json({ error: 'Cliente não encontrado ou não pertence à empresa.' });
        }

        // Verifica se o cliente já está associado no mesmo dia
        const checkQuery = `
          SELECT * FROM associados
          WHERE clienteId = $1 AND diaSemana = $2
        `;
        console.log('[DEBUG] Verificando associação prévia...');
        const checkResult = await pool.query(checkQuery, [clienteId, diaSemana]);
        if (checkResult.rows.length > 0) {
          console.log('[DEBUG] Cliente já associado a este dia.');
          return res.status(400).json({ error: 'Cliente já associado a este dia.' });
        }

        // Insere a nova associação
        const insertQuery = `
          INSERT INTO associados (equipeId, clienteId, diaSemana, empresaid)
          VALUES ($1, $2, $3, $4)
          RETURNING *;
        `;
        console.log('[DEBUG] Inserindo associação...');
        const result = await pool.query(insertQuery, [equipeId, clienteId, diaSemana, empresaid]);

        console.log('[DEBUG] Associação realizada com sucesso:', result.rows[0]);
        res.status(201).json(result.rows[0]);
      } catch (error) {
        console.error('[DEBUG] Erro ao associar cliente:', error);
        res.status(500).send('Erro ao associar cliente.');
      }
});

app.delete('/associados/:id', async (req, res) => {
      const { id } = req.params;
      try {
        const query = 'DELETE FROM associados WHERE id = $1 RETURNING *;';
        const result = await pool.query(query, [id]);
      if (result.rowCount === 0) {
         return res.status(404).send('Associação não encontrada.');
       }
       res.status(200).json(result.rows[0]);
     } catch (error) {
       console.error('Erro ao desassociar cliente:', error);
       res.status(500).send('Erro ao desassociar cliente.');
     }
 });
// Endpoint para buscar clientes disponíveis
app.get('/clientes-disponiveis', async (req, res) => {
     const { diaSemana, empresaid } = req.query;

     if (!diaSemana || !empresaid) {
       return res.status(400).json({ error: 'Os parâmetros diaSemana e empresaid são obrigatórios.' });
     }

     try {
     const query = `
      SELECT 
        c.id, 
        c.nome, 
        c.morada, 
        c.telefone, 
        CAST(c.periodicidade AS BIGINT) AS periodicidade,
        (CAST(c.periodicidade AS BIGINT) - COALESCE(a.total_associacoes, 0)) AS periodicidadeRestante,
        CONCAT('P', CAST(c.periodicidade AS BIGINT), '/', 
               CAST(c.periodicidade AS BIGINT) - COALESCE(a.total_associacoes, 0)) AS periodicidadeFormatada
      FROM clientes c
      LEFT JOIN (
        SELECT clienteId, COUNT(*) AS total_associacoes
        FROM associados
        GROUP BY clienteId
      ) a ON c.id = a.clienteId
      WHERE c.empresaid = $1
        AND (CAST(c.periodicidade AS BIGINT) - COALESCE(a.total_associacoes, 0)) > 0
        AND NOT ($2 = ANY(c.condicionantes)); -- Exclui condicionantes
    `;

    const result = await pool.query(query, [empresaid, diaSemana]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar clientes disponíveis:', error);
    res.status(500).send('Erro ao buscar clientes disponíveis.');
  }
});
// Rota para obter contadores de clientes por dia da semana para uma equipe específica
app.get('/contador-clientes', async (req, res) => {
  const { equipeId, empresaid } = req.query;

  if (!equipeId || !empresaid) {
    return res.status(400).json({ error: 'Os parâmetros equipeId e empresaid são obrigatórios.' });
  }

  try {
    const query = `
      WITH ultima_manutencao AS (
        SELECT DISTINCT ON (m.cliente_id, m.dia_semana, m.equipe_id)
          m.cliente_id,
          m.dia_semana,
          m.equipe_id,
          m.status,
          m.data_manutencao
        FROM manutencoes m
        WHERE m.empresaid = $2
          AND m.equipe_id = $1
        ORDER BY m.cliente_id, m.dia_semana, m.equipe_id, m.data_manutencao DESC
      )
      SELECT
        a.diasemana,
        COUNT(DISTINCT a.clienteid) AS total,
        COALESCE(SUM(CASE WHEN um.status = 'concluida' THEN 1 ELSE 0 END), 0) AS concluidas,
        COALESCE(SUM(CASE WHEN um.status = 'nao_concluida' THEN 1 ELSE 0 END), 0) AS nao_concluidas
      FROM associados a
      INNER JOIN equipes e ON a.equipeid = e.id
      LEFT JOIN ultima_manutencao um
        ON um.cliente_id = a.clienteid
        AND um.equipe_id = a.equipeid
        AND um.dia_semana = a.diasemana
      WHERE a.equipeid = $1
        AND e.empresaid = $2
      GROUP BY a.diasemana
      ORDER BY a.diasemana;
    `;

    const values = [equipeId, empresaid];
    const result = await pool.query(query, values);

    const contadores = result.rows.length > 0
      ? result.rows.map(row => ({
          diasemana: row.diasemana,
          total: parseInt(row.total, 10),
          concluidas: parseInt(row.concluidas, 10),
          naoConcluidas: parseInt(row.nao_concluidas, 10),
        }))
      : [];

    res.status(200).json(contadores);
  } catch (error) {
    console.error('❌ Erro ao buscar contadores de clientes:', error);
    res.status(500).json({ error: 'Erro ao buscar contadores de clientes.' });
  }
});

//Esse endpoint permitirá adicionar novos usuários ao sistema


// Endpoint de Registo de Empresa e Usuário
app.post('/register', async (req, res) => {
  const { nome_empresa, email, senha, telefone, endereco, logo, nif } = req.body;

  console.log('📩 Iniciando registro de empresa...');
  console.log('📦 Dados recebidos:', {
    nome_empresa,
    email,
    telefone,
    endereco,
    nif,
    logo: logo ? '✅ Logo recebido' : '❌ Sem logo',
  });

  // 🧩 Validação dos campos obrigatórios
  if (!nome_empresa || !email || !senha || !telefone || !endereco) {
    console.error('❌ Erro: Campos obrigatórios ausentes.');
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  try {
    // 🔍 Verifica se o email já existe na tabela empresas
    console.log('🔎 Verificando email duplicado...');
    const emailCheckQuery = 'SELECT id FROM empresas WHERE email = $1';
    const emailCheckResult = await pool.query(emailCheckQuery, [email]);

    if (emailCheckResult.rows.length > 0) {
      console.warn('⚠️ Email já registrado:', email);

      // Verifica se há um registro incompleto (sem utilizadores associados)
      const empresaId = emailCheckResult.rows[0].id;
      const usuarioCheckQuery = 'SELECT id FROM usuarios WHERE empresaid = $1';
      const usuarioCheckResult = await pool.query(usuarioCheckQuery, [empresaId]);

      if (usuarioCheckResult.rows.length === 0) {
        console.log('🧹 Removendo registro incompleto da empresa:', empresaId);
        await pool.query('DELETE FROM empresas WHERE id = $1', [empresaId]);
      } else {
        return res.status(400).json({ error: 'Este email já está registrado.' });
      }
    }

    // 🏗️ Query para inserir a empresa (com NIF e logo)
    const empresaQuery = `
      INSERT INTO empresas (nome, email, telefone, endereco, logo, nif, criado_em)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING id;
    `;
    const empresaValues = [nome_empresa, email, telefone, endereco, logo || null, nif || null];

    console.log('💾 Inserindo empresa no banco de dados...');
    const empresaResult = await pool.query(empresaQuery, empresaValues);
    const createdEmpresaId = empresaResult.rows[0].id;
    console.log('✅ Empresa criada com ID:', createdEmpresaId);

    // 🔐 Criptografa a senha do administrador
    const hashedPassword = await bcrypt.hash(senha, 10);

    // 👤 Cria o utilizador administrador da empresa
    const usuarioQuery = `
      INSERT INTO usuarios (nome, email, senha, tipo_usuario, empresaid, token, confirmado)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, nome, email, tipo_usuario, empresaid;
    `;
    const usuarioValues = [
      `Admin - ${nome_empresa}`,
      email,
      hashedPassword,
      'admin',
      createdEmpresaId,
      uuidv4(), // Token de confirmação
      false, // Confirmado inicialmente como falso
    ];

    console.log('👤 Criando utilizador administrador...');
    const usuarioResult = await pool.query(usuarioQuery, usuarioValues);
    console.log('✅ Utilizador criado com sucesso:', usuarioResult.rows[0]);

    console.log('🎉 Registro concluído com sucesso.');
    res.status(201).json({ message: 'Registo realizado com sucesso!' });
  } catch (error) {
    console.error('❌ Erro ao registrar empresa e utilizador:', error);
    if (error.code === '23505') {
      console.warn('⚠️ Erro: Email duplicado.');
      return res.status(400).json({ error: 'Este email já está registrado.' });
    }

    res.status(500).json({ error: 'Erro ao registrar empresa e utilizador.' });
  }
});

app.get('/confirmar-email', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Token é obrigatório.' });
  }

  try {
    const result = await pool.query('SELECT id FROM usuarios WHERE token = $1 AND confirmado = false', [token]);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Token inválido ou já utilizado.' });
    }

    await pool.query('UPDATE usuarios SET confirmado = true WHERE token = $1', [token]);

    res.json({ message: 'Email confirmado com sucesso!' });
  } catch (error) {
    console.error('Erro ao confirmar email:', error);
    res.status(500).json({ error: 'Erro ao confirmar email.' });
  }
});

// Este endpoint verificará as credenciais do usuário e retornará o tipo de usuário
app.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  try {
    const query = `
      SELECT 
        u.id,
        u.nome,
        u.email,
        u.equipeid,
        u.senha,
        u.empresaid,
        u.tipo_usuario
      FROM usuarios u
      WHERE LOWER(u.email) = LOWER($1)
      LIMIT 1;
    `;

    const result = await pool.query(query, [String(email).trim()]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const user = result.rows[0];

    const isPasswordValid = await bcrypt.compare(senha, user.senha);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    if (!user.empresaid) {
      return res
        .status(400)
        .json({ error: 'Usuário não associado a uma empresa válida.' });
    }

    // ✅ Tipo de utilizador
    let tipoUsuario = user.tipo_usuario;

    // Compatibilidade com utilizadores antigos (sem tipo_usuario preenchido)
    if (!tipoUsuario) {
      tipoUsuario = user.equipeid ? 'equipe' : 'admin';
    }

    // ✅ Token com id REAL
    const token = jwt.sign(
      { id: user.id, tipo_usuario: tipoUsuario, empresaid: user.empresaid },
      process.env.JWT_SECRET || 'secreto',
      { expiresIn: '1h' }
    );

    // ✅ Response com id REAL + mapeamento consistente
    return res.json({
      token,
      user: {
        id: user.id,                 // ✅ agora vem sempre
        nome: user.nome,
        tipo_usuario: tipoUsuario,
        equipeId: user.equipeid,     // ✅ mapeado do nome real da coluna
        empresaid: user.empresaid,
      },
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    return res.status(500).json({ error: 'Erro ao fazer login.' });
  }
});

// ✅ Criar utilizador (POST /usuarios)
app.post('/usuarios', async (req, res) => {
  try {
    const {
      nome,
      email,
      senha,
      equipeid,
      empresaid,
      tipo_usuario, // <- vem do frontend (AddEquipeScreen)
    } = req.body;

    // ✅ Validação mínima
    if (!nome || !email || !senha || !empresaid) {
      return res.status(400).json({
        error: 'Nome, email, senha e empresaid são obrigatórios.',
      });
    }

    // 🔹 Normalizar valores base
    const sanitizedNome = String(nome).replace(/\0/g, '').trim();
    const emailLimpo = String(email).replace(/\0/g, '').trim().toLowerCase();

    // 🔹 Normalizar equipeid (pode vir '', undefined, null, '3', 3)
    const equipeIdFinal =
      equipeid === undefined || equipeid === null || equipeid === ''
        ? null
        : Number(equipeid);

    // 🔹 Tipos permitidos na app
    const tiposPermitidos = [
      'admin',
      'equipa_manutencao',
      'equipa_tecnica',
      'orcamentacao',
      'contabilidade',
      'equipe', // compatibilidade
    ];

    // 🔹 Definir tipo final
    let tipoFinal;

    if (tipo_usuario && tiposPermitidos.includes(tipo_usuario)) {
      tipoFinal = tipo_usuario;
    } else {
      // 🔙 Compatibilidade com utilizadores antigos:
      // se tiver equipeid assume equipa_manutencao, senão admin
      tipoFinal = equipeIdFinal ? 'equipa_manutencao' : 'admin';
    }

    // ✅ Hash da senha
    const hashedPassword = await bcrypt.hash(String(senha), 10);

    const query = `
      INSERT INTO usuarios (nome, email, senha, tipo_usuario, equipeid, empresaid)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, nome, email, tipo_usuario, equipeid, empresaid;
    `;

    const values = [
      sanitizedNome,
      emailLimpo,
      hashedPassword,
      tipoFinal,
      equipeIdFinal,
      Number(empresaid),
    ];

    const result = await pool.query(query, values);

    return res.status(201).json({
      message: 'Usuário criado com sucesso!',
      usuario: result.rows[0],
    });
  } catch (error) {
    console.error('Erro ao criar utilizador:', error);

    // 🔹 Tratamento específico para email duplicado
    if (error && error.code === '23505') {
      return res.status(400).json({
        error: 'Já existe um utilizador registado com este email.',
      });
    }

    return res.status(500).json({ error: 'Erro ao criar utilizador.' });
  }
});

app.get('/usuarios', async (req, res) => {
  const { equipeid, empresaid } = req.query;

  if (!equipeid || !empresaid) {
    return res.status(400).json({ error: 'Os parâmetros equipeid e empresaid são obrigatórios.' });
  }

  try {
    const query = `
      SELECT id, email, equipeid, empresaid
      FROM usuarios
      WHERE equipeid = $1 AND empresaid = $2;
    `;
    const result = await pool.query(query, [
      Number(equipeid),
      Number(empresaid),
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário.' });
  }
});

// 🔹 Lista de usuários por empresa (para dropdowns, notificações, etc.)
app.get('/usuarios-empresa', async (req, res) => {
  try {
    const { empresaid, tipo } = req.query;

    if (!empresaid) {
      return res.status(400).json({ error: 'O parâmetro empresaid é obrigatório.' });
    }

    let query = `
      SELECT 
        id,
        nome,
        email,
        tipo_usuario,
        equipeid,
        empresaid
      FROM usuarios
      WHERE empresaid = $1
    `;
    const values = [Number(empresaid)];

    // 🔹 Se vier ?tipo=tecnico ou ?tipo=admin, filtra
    if (tipo) {
      query += ' AND tipo_usuario = $2';
      values.push(tipo);
    }

    query += ' ORDER BY nome ASC';

    const result = await pool.query(query, values);

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ Erro ao buscar usuários da empresa:', error);
    return res.status(500).json({ error: 'Erro ao buscar usuários.' });
  }
});

// Endpoint PUT para atualizar um usuário (versão robusta)
app.put('/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, email, senha, tipo_usuario, equipeid, empresaid } = req.body;

  if (!id || !nome || !email || !tipo_usuario || !empresaid) {
    return res.status(400).json({
      error: 'id, nome, email, tipo_usuario e empresaid são obrigatórios.',
    });
  }

  // Tipos permitidos (+ compat)
  const tiposPermitidos = [
    'admin',
    'equipa_manutencao',
    'equipa_tecnica',
    'orcamentacao',
    'contabilidade',
    'equipe',
  ];

  if (!tiposPermitidos.includes(tipo_usuario)) {
    return res.status(400).json({ error: 'tipo_usuario inválido.' });
  }

  try {
    const emailLimpo = String(email).replace(/\0/g, '').trim().toLowerCase();
    const nomeLimpo = String(nome).replace(/\0/g, '').trim();

    const equipeIdFinal =
      equipeid === undefined || equipeid === null || equipeid === ''
        ? null
        : Number(equipeid);

    const values = [];
    let idx = 1;

    let query = 'UPDATE usuarios SET ';
    query += `nome = $${idx++}, `;
    values.push(nomeLimpo);

    query += `email = $${idx++}, `;
    values.push(emailLimpo);

    // senha opcional
    if (senha && String(senha).trim().length > 0) {
      const hashedPassword = await bcrypt.hash(String(senha), 10);
      query += `senha = $${idx++}, `;
      values.push(hashedPassword);
    }

    query += `tipo_usuario = $${idx++}, `;
    values.push(tipo_usuario);

    query += `equipeid = $${idx++} `;
    values.push(equipeIdFinal);

    query += `WHERE id = $${idx++} AND empresaid = $${idx++} RETURNING id, nome, email, tipo_usuario, equipeid, empresaid;`;
    values.push(Number(id), Number(empresaid));

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: 'Usuário não encontrado ou não pertence à empresa.',
      });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);

    if (error.code === '23505') {
      return res.status(400).json({ error: 'Email já existe.' });
    }

    return res.status(500).json({ error: 'Erro ao atualizar usuário.' });
  }
});

app.get('/clientes-por-equipe', async (req, res) => {
  const { equipeId, empresaid } = req.query;

  if (!equipeId || !empresaid) {
    return res.status(400).json({ error: 'equipeId e empresaid são obrigatórios.' });
  }

  try {
    const query = `
      SELECT c.id, c.nome, c.morada, c.telefone
      FROM clientes c
      INNER JOIN associados a ON c.id = a.clienteId
      INNER JOIN equipes e ON a.equipeId = e.id
      WHERE a.equipeId = $1 AND e.empresaid = $2
    `;
    const result = await pool.query(query, [equipeId, empresaid]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Nenhum cliente encontrado para essa equipe.' });
    }

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar clientes:', error);
    res.status(500).json({ error: 'Erro ao buscar clientes.' });
  }
});

app.get('/detalhes-equipe', async (req, res) => {
  const { equipeId, empresaid } = req.query;

  console.log('Recebido equipeId:', equipeId); // Log para debug

  if (!equipeId || !empresaid) {
    return res.status(400).json({ error: 'equipeId e empresaid são obrigatórios.' });
  }

  try {
    const query = `
      SELECT
        id AS equipe_id,
        nomeequipe,
        nome1,
        nome2,
        matricula,
        telefone,
        proxima_inspecao,
        validade_seguro
      FROM equipes
      WHERE id = $1 AND empresaid = $2
    `;

    const result = await pool.query(query, [equipeId, empresaid]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipe não encontrada ou não pertence à empresa.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar detalhes da equipe:', error);
    res.status(500).json({ error: 'Erro ao buscar detalhes da equipe.' });
  }
});

app.get('/manutencao-atual', async (req, res) => {
  const { clienteId, diaSemana, empresaid } = req.query;

  console.log('Recebendo os parâmetros:', { clienteId, diaSemana, empresaid });

  if (!clienteId || !diaSemana || !empresaid) {
    return res.status(400).json({
      error: 'Cliente ID, Dia da Semana e Empresa ID são obrigatórios.',
    });
  }

  try {
    // ✅ 1) Buscar a manutenção MAIS RECENTE deste cliente/dia, mas DA EMPRESA CERTA
    const manutencaoQuery = `
      SELECT *
      FROM manutencoes
      WHERE cliente_id = $1
        AND dia_semana = $2
        AND empresaid = $3
      ORDER BY data_manutencao DESC
      LIMIT 1;
    `;
    const manutencaoResult = await pool.query(manutencaoQuery, [
      clienteId,
      diaSemana,
      empresaid,
    ]);

    let manutencao;

    if (manutencaoResult.rows.length === 0) {
      console.log('Nenhuma manutenção encontrada. Criando uma nova...');

      // ✅ 2) Buscar a equipa associada (ok como tens)
      const equipeQuery = `
        SELECT e.id
        FROM associados a
        JOIN equipes e ON a.equipeid = e.id
        WHERE a.clienteid = $1
          AND a.diasemana = $2
          AND e.empresaid = $3
        LIMIT 1;
      `;
      const equipeResult = await pool.query(equipeQuery, [
        clienteId,
        diaSemana,
        empresaid,
      ]);

      if (equipeResult.rows.length === 0) {
        return res.status(400).json({
          error:
            'Nenhuma equipe associada encontrada para este cliente e dia da semana.',
        });
      }

      const equipeId = equipeResult.rows[0].id;

      // ✅ 3) Copiar metodo_analise / modo_tratamento do ÚLTIMO registo do cliente (qualquer dia)
      const ultimoMetodoQuery = `
        SELECT metodo_analise, modo_tratamento
        FROM manutencoes
        WHERE cliente_id = $1
          AND empresaid = $2
        ORDER BY data_manutencao DESC
        LIMIT 1;
      `;
      const ultimoMetodoRes = await pool.query(ultimoMetodoQuery, [
        clienteId,
        empresaid,
      ]);

      const metodo_analise =
        ultimoMetodoRes.rows[0]?.metodo_analise ?? 'fitas';
      const modo_tratamento =
        ultimoMetodoRes.rows[0]?.modo_tratamento ?? 'cloro';

      // ✅ 4) Criar nova manutenção já com metodo/modo
      const novaManutencaoQuery = `
        INSERT INTO manutencoes (
          cliente_id,
          equipe_id,
          dia_semana,
          status,
          data_manutencao,
          empresaid,
          metodo_analise,
          modo_tratamento
        )
        VALUES ($1, $2, $3, 'pendente', NOW(), $4, $5, $6)
        RETURNING *;
      `;
      const novaManutencaoResult = await pool.query(novaManutencaoQuery, [
        clienteId,
        equipeId,
        diaSemana,
        empresaid,
        metodo_analise,
        modo_tratamento,
      ]);

      manutencao = novaManutencaoResult.rows[0];

      // ✅ 5) Criar parâmetros padrão
      const criarParametrosQuery = `
        INSERT INTO manutencoes_parametros (
          manutencao_id,
          parametro,
          valor_ultimo,
          valor_atual,
          produto_usado,
          quantidade_usada,
          status,
          empresaid
        )
        SELECT
          $1,
          parametro,
          NULL,
          NULL,
          NULL,
          0,
          'pendente',
          $2
        FROM parametros_quimicos
        WHERE empresaid = $2
          AND ativo = TRUE;
      `;
      await pool.query(criarParametrosQuery, [manutencao.id, empresaid]);

      console.log('Nova manutenção criada com parâmetros padrão.');
    } else {
  manutencao = manutencaoResult.rows[0];

  // ✅ Garantir defaults (evita cair em undefined no frontend)
  manutencao.metodo_analise = manutencao.metodo_analise ?? 'fitas';
  manutencao.modo_tratamento = manutencao.modo_tratamento ?? 'cloro';

  // ✅ GARANTIR que a manutenção tem TODOS os parâmetros ativos
  const ensureParametrosQuery = `
    INSERT INTO manutencoes_parametros (
      manutencao_id,
      parametro,
      valor_ultimo,
      valor_atual,
      produto_usado,
      quantidade_usada,
      status,
      empresaid
    )
    SELECT
      $1,
      pq.parametro,
      NULL,
      NULL,
      NULL,
      0,
      'pendente',
      $2
    FROM parametros_quimicos pq
    WHERE pq.empresaid = $2
      AND pq.ativo = TRUE
      AND NOT EXISTS (
        SELECT 1
        FROM manutencoes_parametros mp
        WHERE mp.manutencao_id = $1
          AND mp.parametro = pq.parametro
          AND mp.empresaid = $2
      );
  `;

  await pool.query(ensureParametrosQuery, [manutencao.id, empresaid]);
}

    // ✅ 6) Buscar parâmetros (igual ao teu, só mantive)
    const parametrosQuery = `
      SELECT 
        mp.parametro,
        mp.valor_atual,
        mp.valor_ultimo,
        mp.produto_usado,
        mp.quantidade_usada,
        mp.status,
        pq.valor_minimo,
        pq.valor_maximo,
        pq.valor_alvo,
        pq.produto_aumentar,
        pq.produto_diminuir,
        pq.dosagem_aumentar,
        pq.dosagem_diminuir,
        pq.volume_calculo,
        pq.incremento_aumentar,
        pq.incremento_diminuir
      FROM manutencoes_parametros mp
      JOIN parametros_quimicos pq ON mp.parametro = pq.parametro
      WHERE mp.manutencao_id = $1
        AND pq.empresaid = $2
        AND pq.ativo = TRUE
      ORDER BY
      CASE
        WHEN mp.parametro = 'Cloro Livre em ppm' THEN 1
        WHEN mp.parametro = 'Cloro Total em ppm' THEN 2
        WHEN mp.parametro = 'pH' THEN 3
        WHEN mp.parametro = 'Alcalinidade' THEN 4
        WHEN mp.parametro = 'Ácido Cianúrico' THEN 5
        WHEN mp.parametro = 'Dureza' THEN 6
        ELSE 99
      END,
      mp.parametro;
    `;

    const parametrosResult = await pool.query(parametrosQuery, [
      manutencao.id,
      empresaid,
    ]);

    const parametrosTransformados = parametrosResult.rows.map((parametro) => ({
      ...parametro,
      bloqueado: parametro.status !== 'pendente',
      resultado:
        parametro.status === 'pendente'
          ? null
          : {
              resultado: parametro.produto_usado
                ? `Foi adicionado ${parametro.quantidade_usada}kg de ${parametro.produto_usado}`
                : parametro.status === 'sem estoque'
                ? `Na próxima semana adicionar ${parametro.quantidade_usada}kg de ${parametro.produto_usado}`
                : 'Dentro do intervalo ideal',
              quantidade: parametro.quantidade_usada || 0,
              produto: parametro.produto_usado || null,
            },
    }));

    return res.status(200).json({
      manutencao,
      parametros: parametrosTransformados,
    });
  } catch (error) {
    console.error('Erro ao buscar manutenção e parâmetros:', error);
    return res.status(500).json({ error: 'Erro ao buscar manutenção e parâmetros.' });
  }
});

app.put('/manutencoes/:clienteId/confirmar-periodica', async (req, res) => {
  const { clienteId } = req.params;
  const { equipamento, novaData, empresaid } = req.body;

  if (!clienteId || !equipamento || !novaData || !empresaid) {
    return res.status(400).json({ error: 'Todos os parâmetros são obrigatórios.' });
  }

  try {
    // Mapeia os nomes dos equipamentos para os campos do banco de dados
    const equipamentoCampos = {
      'Bomba de Calor': {
        ultima: 'ultima_manutencao_bomba_calor',
        proxima: 'proxima_manutencao_bomba_calor',
      },
      'Equipamentos Especiais': {
        ultima: 'ultima_manutencao_equipamentos_especiais',
        proxima: 'proxima_manutencao_equipamentos_especiais',
      },
      'Cobertura': {
        ultima: 'ultima_manutencao_cobertura',
        proxima: 'proxima_manutencao_cobertura',
      },
      'Tanque de Compensação': {
        ultima: 'ultima_manutencao_tanque_compensacao',
        proxima: 'proxima_manutencao_tanque_compensacao',
      },
    };

    if (!equipamentoCampos[equipamento]) {
      return res.status(400).json({ error: 'Equipamento inválido.' });
    }

    const { ultima, proxima } = equipamentoCampos[equipamento];

    // Atualiza os campos correspondentes no banco de dados
    const updateQuery = `
      UPDATE manutencoes
      SET ${ultima} = NOW(), ${proxima} = $1
      WHERE cliente_id = $2 AND empresaid = $3;
    `;

    await pool.query(updateQuery, [novaData, clienteId, empresaid]);

    res.status(200).json({ message: `Manutenção de ${equipamento} confirmada com sucesso!` });
  } catch (error) {
    console.error('Erro ao atualizar manutenção periódica:', error);
    res.status(500).json({ error: 'Erro ao atualizar manutenção periódica.' });
  }
});

app.get('/parametros-quimicos', async (req, res) => {
  const { ativo, empresaid } = req.query;

  if (!empresaid) {
    return res.status(400).json({ error: 'O parâmetro empresaid é obrigatório.' });
  }

  let query = 'SELECT * FROM parametros_quimicos WHERE empresaid = $1';
  const values = [empresaid];

  if (ativo !== undefined) {
    query += ' AND ativo = $2';
    values.push(ativo === 'true');
  }

  try {
    const result = await pool.query(query, values);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar parâmetros químicos:', error);
    res.status(500).json({ error: 'Erro ao buscar parâmetros químicos.' });
  }
});

app.get('/parametros-quimicos/:id', async (req, res) => {
  const { id } = req.params;
  const { empresaid } = req.query;

  if (!empresaid) {
    return res.status(400).json({ error: 'O parâmetro empresaid é obrigatório.' });
  }

  try {
    const query = 'SELECT * FROM parametros_quimicos WHERE id = $1 AND empresaid = $2';
    const result = await pool.query(query, [id, empresaid]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Parâmetro não encontrado.' });
    }
  } catch (error) {
    console.error('Erro ao carregar parâmetro químico:', error);
    res.status(500).json({ error: 'Erro ao carregar parâmetro.' });
  }
});

app.post('/parametros-quimicos', async (req, res) => {
  const {
    empresaid,
    parametro,
    valor_minimo,
    valor_maximo,
    valor_alvo,
    produto_aumentar,
    produto_diminuir,
    dosagem_aumentar,
    dosagem_diminuir,
    volume_calculo,
    incremento_aumentar,
    incremento_diminuir,
    ativo = true, // Ativo por padrão
  } = req.body;

  if (!empresaid) {
    return res.status(400).json({ error: 'O campo empresaid é obrigatório.' });
  }

  try {
    const query = `
      INSERT INTO parametros_quimicos (
        empresaid, parametro, valor_minimo, valor_maximo, valor_alvo,
        produto_aumentar, produto_diminuir, dosagem_aumentar, dosagem_diminuir,
        volume_calculo, incremento_aumentar, incremento_diminuir, ativo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;
    const values = [
      empresaid,
      parametro || null,
      valor_minimo || null,
      valor_maximo || null,
      valor_alvo || null,
      produto_aumentar || null,
      produto_diminuir || null,
      dosagem_aumentar || null,
      dosagem_diminuir || null,
      volume_calculo || null,
      incremento_aumentar || null,
      incremento_diminuir || null,
      ativo,
    ];
    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao adicionar parâmetro químico:', error);
    res.status(500).json({ error: 'Erro ao adicionar parâmetro.' });
  }
});

app.put('/parametros-quimicos/:id', async (req, res) => { 
  const { id } = req.params;
  const { empresaid, ...parametrosAtualizados } = req.body;

  if (!empresaid) {
    return res.status(400).json({ error: 'O campo empresaid é obrigatório.' });
  }

  try {
    const query = `
  UPDATE parametros_quimicos
  SET
    parametro = $1,
    valor_minimo = $2,
    valor_maximo = $3,
    valor_alvo = $4,
    produto_aumentar = $5,
    produto_diminuir = $6,
    dosagem_aumentar = $7,
    dosagem_diminuir = $8,
    volume_calculo = $9,
    incremento_aumentar = $10,
    incremento_diminuir = $11,
    ativo = $12,
    periodicidade_dias = $13,
    ficha_tecnica_aumentar_url = $14,
    ficha_tecnica_aumentar_nome = $15,
    ficha_tecnica_diminuir_url = $16,
    ficha_tecnica_diminuir_nome = $17
  WHERE id = $18 AND empresaid = $19
  RETURNING *;
`;

const values = [
  parametrosAtualizados.parametro,
  parametrosAtualizados.valor_minimo,
  parametrosAtualizados.valor_maximo,
  parametrosAtualizados.valor_alvo,
  parametrosAtualizados.produto_aumentar,
  parametrosAtualizados.produto_diminuir,
  parametrosAtualizados.dosagem_aumentar,
  parametrosAtualizados.dosagem_diminuir,
  parametrosAtualizados.volume_calculo,
  parametrosAtualizados.incremento_aumentar,
  parametrosAtualizados.incremento_diminuir,
  parametrosAtualizados.ativo,
  parametrosAtualizados.periodicidade_dias ?? 0,
  parametrosAtualizados.ficha_tecnica_aumentar_url ?? null,
  parametrosAtualizados.ficha_tecnica_aumentar_nome ?? null,
  parametrosAtualizados.ficha_tecnica_diminuir_url ?? null,
  parametrosAtualizados.ficha_tecnica_diminuir_nome ?? null,
  id,
  empresaid,
];



    const result = await pool.query(query, values);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Parâmetro não encontrado ou não pertence à empresa.' });
    }
  } catch (error) {
    console.error('Erro ao atualizar parâmetro químico:', error);
    res.status(500).json({ error: 'Erro ao atualizar parâmetro.' });
  }
});

app.delete('/parametros-quimicos/:id', async (req, res) => {
  const { id } = req.params;
  const { empresaid } = req.query;

  if (!empresaid) {
    return res.status(400).json({ error: 'O campo empresaid é obrigatório.' });
  }

  try {
    const query = `
      DELETE FROM parametros_quimicos 
      WHERE id = $1 AND empresaid = $2 RETURNING *;
    `;
    const result = await pool.query(query, [id, empresaid]);
    if (result.rows.length > 0) {
      res.json({ message: 'Parâmetro excluído com sucesso.' });
    } else {
      res.status(404).json({ error: 'Parâmetro não encontrado ou não pertence à empresa.' });
    }
  } catch (error) {
    console.error('Erro ao deletar parâmetro químico:', error);
    res.status(500).json({ error: 'Erro ao deletar parâmetro.' });
  }
});

app.put('/manutencoes/:id', async (req, res) => {
  const { id } = req.params;
  const { status, parametros, empresaid, motivo, metodo_analise, modo_tratamento } = req.body;


  console.log('📥 Dados recebidos no PUT /manutencoes/:id:', req.body);

  if (!empresaid) {
    return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  }

  const METODOS_OK = ['fotometro', 'gotas', 'fitas'];
const MODOS_OK = ['sal', 'cloro'];

const temPrefs = !!metodo_analise || !!modo_tratamento;
const temStatus = !!status;

// ✅ Se vier só prefs (sem status), deixamos passar
if (!temStatus && !temPrefs) {
  return res.status(400).json({
    error: 'É obrigatório enviar status ou metodo_analise/modo_tratamento.',
  });
}

// ✅ Se vier status, valida como já fazias
if (temStatus && !['concluida', 'pendente', 'nao_concluida'].includes(status)) {
  return res.status(400).json({
    error: 'Status inválido. Status permitidos: concluida, pendente, nao_concluida.',
  });
}

// ✅ valida prefs (igual ao que já tinhas)
if (metodo_analise && !METODOS_OK.includes(metodo_analise)) {
  return res.status(400).json({ error: 'metodo_analise inválido.' });
}
if (modo_tratamento && !MODOS_OK.includes(modo_tratamento)) {
  return res.status(400).json({ error: 'modo_tratamento inválido.' });
}


  // ✅ Só exige parâmetros quando for "concluida"
  if (status === 'concluida') {
    const parametrosInvalidos = parametros?.some((parametro) =>
      parametro.valor_atual === null ||
      parametro.valor_atual === undefined ||
      parametro.valor_atual === ''
    );

    if (parametrosInvalidos) {
      return res.status(400).json({
        error: 'Todos os parâmetros devem ser preenchidos antes de concluir a manutenção.',
      });
    }
  }

if (metodo_analise && !METODOS_OK.includes(metodo_analise)) {
  return res.status(400).json({ error: 'metodo_analise inválido.' });
}
if (modo_tratamento && !MODOS_OK.includes(modo_tratamento)) {
  return res.status(400).json({ error: 'modo_tratamento inválido.' });
}

  try {
    // ✅ Atualiza status + motivo (quando nao_concluida) + data_manutencao
    const updateManutencaoQuery = `
  UPDATE manutencoes
  SET
    status = COALESCE($1::varchar, status),
    motivo = CASE
      WHEN COALESCE($1::varchar, status) = 'nao_concluida' THEN $4::text
      ELSE motivo
    END,
    metodo_analise = COALESCE($5::varchar, metodo_analise),
    modo_tratamento = COALESCE($6::varchar, modo_tratamento)
  WHERE id = $2 AND empresaid = $3
  RETURNING *;
`;



    const manutencaoResult = await pool.query(updateManutencaoQuery, [
  status,
  id,
  empresaid,
  motivo ?? null,
  metodo_analise ?? null,
  modo_tratamento ?? null,
]);

if (manutencaoResult.rowCount === 0) {
  return res.status(400).json({ error: 'Erro ao atualizar status da manutenção.' });
}

console.log(
  `🔄 Manutenção ${id} atualizada para status: ${status} (motivo=${motivo ?? 'null'})`
);

// ✅ Só atualiza parâmetros quando "concluida"
if (status === 'concluida') {
  console.log('📊 Atualizando parâmetros para manutenção:', id);

  for (const parametro of parametros || []) {
    const updateParametroQuery = `
      INSERT INTO manutencoes_parametros (
        manutencao_id, parametro, valor_atual, produto_usado, quantidade_usada, empresaid
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (manutencao_id, parametro)
      DO UPDATE SET 
        valor_atual = $3,
        produto_usado = $4,
        quantidade_usada = $5,
        empresaid = $6;
    `;

    const parametroValues = [
      id,
      parametro.parametro,
      parametro.valor_atual || null,
      parametro.produto_usado || null,
      parametro.quantidade_usada || 0,
      empresaid,
    ];

    console.log('🛠 Atualizando parâmetro:', parametroValues);
    await pool.query(updateParametroQuery, parametroValues);
  }

  // ✅ Snapshot ISL semanal (apenas quando conclui)
  try {
    const cliente_id = manutencaoResult.rows[0]?.cliente_id;

    if (cliente_id) {
      const snap = await criarSnapshotISLSemanalSeNecessario({
        empresaid,
        cliente_id,
        manutencao_id: Number(id),
      });

      console.log('🧪 ISL snapshot semanal:', snap);
    } else {
      console.warn('⚠️ Sem cliente_id no RETURNING da manutenção. Snapshot ISL ignorado.');
    }
  } catch (e) {
    // ⚠️ não bloquear a conclusão por falha no snapshot
    console.warn('⚠️ Falha ao criar snapshot ISL semanal:', e);
  }
}

return res.status(200).json({
  message: 'Manutenção atualizada com sucesso!',
  manutencao: manutencaoResult.rows[0],
});

  } catch (error) {
    console.error('❌ Erro ao atualizar manutenção:', error);
    return res.status(500).json({ error: 'Erro ao atualizar manutenção.' });
  }
});

// Buscar ou criar manutenção para um cliente e dia da semana
app.get('/manutencoes/:cliente_id', async (req, res) => {
  const { cliente_id } = req.params;
  const { diaSemana, empresaid } = req.query; // Adicionado empresaid como parâmetro

  if (!empresaid) {
    return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  }

  try {
    // Verifica se o cliente pertence à empresa
    const clienteQuery = `
      SELECT id FROM clientes WHERE id = $1 AND empresaid = $2
    `;
    const clienteResult = await pool.query(clienteQuery, [cliente_id, empresaid]);

    if (clienteResult.rowCount === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado ou não pertence à empresa.' });
    }

    // Busca manutenção do cliente e dia da semana
    const query = `
      SELECT * FROM manutencoes
      WHERE cliente_id = $1 AND dia_semana = $2
      ORDER BY data_manutencao DESC
      LIMIT 1;
    `;
    const result = await pool.query(query, [cliente_id, diaSemana]);

    if (result.rows.length === 0) {
      console.warn('Nenhuma manutenção encontrada. Criando nova...');
      const insertQuery = `
        INSERT INTO manutencoes (cliente_id, equipe_id, dia_semana, status, data_manutencao)
        VALUES ($1, $2, $3, 'pendente', NOW())
        RETURNING *;
      `;
      const equipeId = 1; // Substitua pelo método correto para buscar equipe
      const newManutencao = await pool.query(insertQuery, [cliente_id, equipeId, diaSemana]);

      return res.status(201).json(newManutencao.rows[0]);
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar ou criar manutenção:', error);
    res.status(500).json({ error: 'Erro ao buscar ou criar manutenção.' });
  }
});

// Buscar manutenção e seus parâmetros
app.get('/manutencoes/:id', async (req, res) => {
  const { id } = req.params;
  const { empresaid } = req.query;

  if (!empresaid) {
    return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  }

  try {
    // ✅ Busca manutenção já garantindo que pertence à empresa via cliente
    const manutencaoQuery = `
      SELECT
        m.*,
        c.empresaid AS cliente_empresaid
      FROM manutencoes m
      INNER JOIN clientes c ON m.cliente_id = c.id
      WHERE m.id = $1 AND c.empresaid = $2
      LIMIT 1;
    `;
    const manutencaoResult = await pool.query(manutencaoQuery, [id, empresaid]);

    if (manutencaoResult.rowCount === 0) {
      return res.status(404).json({
        error: 'Manutenção não encontrada ou não pertence à empresa.',
      });
    }

    // ✅ Parâmetros da manutenção (se existirem)
    const parametrosQuery = `
      SELECT *
      FROM manutencoes_parametros
      WHERE manutencao_id = $1
      ORDER BY parametro ASC;
    `;
    const parametrosResult = await pool.query(parametrosQuery, [id]);

    // remove campo auxiliar
    const { cliente_empresaid, ...manutencao } = manutencaoResult.rows[0];

    return res.status(200).json({
      ...manutencao, // <- aqui já vem metodo_analise e modo_tratamento
      parametros: parametrosResult.rows,
    });
  } catch (error) {
    console.error('Erro ao buscar manutenção:', error);
    return res.status(500).json({ error: 'Erro ao buscar manutenção.' });
  }
});

// Atualizar parâmetros de uma manutenção
app.put('/manutencoes/:id/parametros', async (req, res) => {
  const { id } = req.params;
  const { parametros, empresaid } = req.body;

  if (!empresaid) {
    return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  }

  try {
    // Verifica se a manutenção pertence à empresa
    const verificarQuery = `
      SELECT m.id
      FROM manutencoes m
      INNER JOIN clientes c ON m.cliente_id = c.id
      WHERE m.id = $1 AND c.empresaid = $2;
    `;
    const verificarResult = await pool.query(verificarQuery, [id, empresaid]);

    if (verificarResult.rowCount === 0) {
      return res.status(404).json({ error: 'Manutenção não encontrada ou não pertence à empresa.' });
    }

    for (const parametro of parametros) {
      const parametroQuery = `
        INSERT INTO manutencoes_parametros (
          manutencao_id, parametro, valor_atual, produto_usado, quantidade_usada, status
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (manutencao_id, parametro)
        DO UPDATE SET 
          valor_atual = $3,
          produto_usado = $4,
          quantidade_usada = $5,
          status = $6;
      `;
      const parametroValues = [
        id,
        parametro.parametro,
        parametro.valor_atual || null,
        parametro.produto_usado || null,
        parametro.quantidade_usada || 0,
        parametro.status || 'pendente',
      ];
      await pool.query(parametroQuery, parametroValues);
    }

    res.status(200).json({ message: 'Parâmetros atualizados com sucesso.' });
  } catch (error) {
    console.error('Erro ao atualizar parâmetros:', error);
    res.status(500).json({ error: 'Erro ao atualizar parâmetros.' });
  }
});

// Função reutilizável para reset semanal das manutenções
async function resetStatusEmpresa(empresaid) {

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ✅ Agora traz também metodo_analise e modo_tratamento da última manutenção concluída
    const clientesAtivosQuery = `
      SELECT DISTINCT ON (a.clienteid, a.diasemana)
        a.clienteid,
        a.equipeid,
        a.diasemana,
        m.id AS manutencao_id,
        m.metodo_analise,
        m.modo_tratamento
      FROM associados a
      JOIN clientes c ON a.clienteid = c.id
      JOIN equipes e ON a.equipeid = e.id
      JOIN manutencoes m 
        ON m.cliente_id = a.clienteid 
        AND m.dia_semana = a.diasemana
        AND m.empresaid = $1
      WHERE m.status = 'concluida'
        AND c.empresaid = $1
        AND e.empresaid = $1
        AND NOT EXISTS (
          SELECT 1
          FROM manutencoes m2
          WHERE m2.cliente_id = a.clienteid
            AND m2.dia_semana = a.diasemana
            AND m2.empresaid = $1
            AND m2.status = 'pendente'
            AND m2.data_manutencao > m.data_manutencao
        )
      ORDER BY a.clienteid, a.diasemana, m.data_manutencao DESC;
    `;

    const clientesAtivosResult = await client.query(clientesAtivosQuery, [empresaid]);

    if (clientesAtivosResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return {
        detalhes: [],
        message: 'Nenhuma manutenção encontrada para resetar.',
      };
    }

    const mensagensDeSucesso = [];

    for (const cliente of clientesAtivosResult.rows) {
      // ✅ defaults de segurança, caso a manutenção antiga tenha NULL
      const metodo = cliente.metodo_analise ?? 'fitas';
      const modo = cliente.modo_tratamento ?? 'cloro';

      // ✅ Inserir nova manutenção já com metodo_analise e modo_tratamento copiados
      const novaManutencaoQuery = `
        INSERT INTO manutencoes (
          cliente_id,
          equipe_id,
          dia_semana,
          status,
          data_manutencao,
          empresaid,
          metodo_analise,
          modo_tratamento
        )
        VALUES ($1, $2, $3, 'pendente', NOW(), $4, $5, $6)
        RETURNING id;
      `;

      const novaManutencaoResult = await client.query(novaManutencaoQuery, [
        cliente.clienteid,
        cliente.equipeid,
        cliente.diasemana,
        empresaid,
        metodo,
        modo,
      ]);

      const novaManutencaoId = novaManutencaoResult.rows[0].id;

      // ✅ Copiar parâmetros (mantém igual)
      const copiarParametrosQuery = `
        INSERT INTO manutencoes_parametros (
          manutencao_id, parametro, valor_ultimo, valor_atual, produto_usado, quantidade_usada, status, empresaid
        )
        SELECT 
          $1, 
          mp.parametro,
          mp.valor_atual AS valor_ultimo,
          NULL AS valor_atual,
          NULL AS produto_usado,
          NULL AS quantidade_usada,
          'pendente',
          $3
        FROM manutencoes_parametros mp
        JOIN parametros_quimicos pq ON mp.parametro = pq.parametro
        WHERE mp.manutencao_id = $2
          AND pq.ativo = TRUE
          AND pq.empresaid = $3;
      `;
      await client.query(copiarParametrosQuery, [novaManutencaoId, cliente.manutencao_id, empresaid]);

      // ✅ Adicionar parâmetros ativos que não existam (mantém igual)
      const adicionarParametrosAtivosQuery = `
        INSERT INTO manutencoes_parametros (
          manutencao_id, parametro, valor_ultimo, valor_atual, produto_usado, quantidade_usada, status, empresaid
        )
        SELECT 
          $1,
          pq.parametro,
          NULL AS valor_ultimo,
          NULL AS valor_atual,
          NULL AS produto_usado,
          0 AS quantidade_usada,
          'pendente',
          $2
        FROM parametros_quimicos pq
        WHERE pq.ativo = TRUE
          AND pq.empresaid = $2
          AND NOT EXISTS (
            SELECT 1
            FROM manutencoes_parametros mp
            WHERE mp.manutencao_id = $1
              AND mp.parametro = pq.parametro
          );
      `;
      await client.query(adicionarParametrosAtivosQuery, [novaManutencaoId, empresaid]);

      mensagensDeSucesso.push(
        `Nova manutenção criada para cliente ${cliente.clienteid}, dia ${cliente.diasemana} (metodo=${metodo}, modo=${modo}).`
      );
    }

    await client.query('COMMIT');

      return {
        message: 'Manutenções resetadas com sucesso!',
        detalhes: mensagensDeSucesso,
      };
      } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erro ao resetar status:', error);
      throw error;
      } finally {
      client.release();
      }
}

app.post('/reset-status', async (req, res) => {
  const { empresaid } = req.body;

  if (!empresaid) {
    return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  }

  try {
    const resultado = await resetStatusEmpresa(empresaid);

    return res.status(200).json({
      message: resultado.message || 'Manutenções resetadas com sucesso!',
      detalhes: resultado.detalhes || [],
    });
  } catch (error) {
    console.error('Erro ao resetar status:', error);

    return res.status(500).json({
      error: 'Erro ao resetar status.',
      detalhes: error.message,
    });
  }
});

app.get('/ultima-manutencao', async (req, res) => {
  const { clienteId, diaSemana, empresaid } = req.query;

  console.log('Recebendo os parâmetros:', { clienteId, diaSemana, empresaid });

  if (!clienteId || !diaSemana || !empresaid) {
    console.error('Parâmetros incompletos:', { clienteId, diaSemana, empresaid });
    return res.status(400).json({ error: 'Cliente ID, Dia da Semana e Empresaid são obrigatórios.' });
  }

  try {
    // Verifica se há uma manutenção existente
    const manutencaoExistenteQuery = `
      SELECT id, status 
      FROM manutencoes
      WHERE cliente_id = $1 AND dia_semana = $2
      ORDER BY data_manutencao DESC
      LIMIT 1;
    `;
    const manutencaoExistenteResult = await pool.query(manutencaoExistenteQuery, [clienteId, diaSemana]);

    if (manutencaoExistenteResult.rows.length > 0) {
      const manutencaoExistente = manutencaoExistenteResult.rows[0];
      console.log('Manutenção existente encontrada:', manutencaoExistente);

      // Se a manutenção existente está pendente, retorna os parâmetros
      if (manutencaoExistente.status === 'pendente') {
        const parametrosQuery = `
          SELECT parametro, valor_atual, valor_ultimo, produto_usado, quantidade_usada, status
          FROM manutencoes_parametros mp
          JOIN parametros_quimicos pq ON mp.parametro = pq.parametro
          WHERE mp.manutencao_id = $1 AND pq.empresaid = $2 AND pq.ativo = TRUE;
        `;
        const parametrosResult = await pool.query(parametrosQuery, [manutencaoExistente.id, empresaid]);

        console.log('Parâmetros retornados:', parametrosResult.rows);
        return res.status(200).json(parametrosResult.rows);
      }

      // Se a manutenção existente está concluída, bloqueia os botões no frontend
      const parametrosConcluidosQuery = `
        SELECT parametro, valor_atual, valor_ultimo, produto_usado, quantidade_usada, status
        FROM manutencoes_parametros mp
        JOIN parametros_quimicos pq ON mp.parametro = pq.parametro
        WHERE mp.manutencao_id = $1 AND pq.empresaid = $2;
      `;
      const parametrosConcluidosResult = await pool.query(parametrosConcluidosQuery, [manutencaoExistente.id, empresaid]);

      console.log('Parâmetros de manutenção concluída:', parametrosConcluidosResult.rows);
      return res.status(200).json({
        parametros: parametrosConcluidosResult.rows,
        manutencaoStatus: manutencaoExistente.status,
      });
    }

    console.log('Nenhuma manutenção pendente encontrada. Criando nova...');

    // Criar nova manutenção
    const equipeQuery = `
      SELECT equipeid 
      FROM associados a
      JOIN equipes e ON a.equipeid = e.id
      WHERE a.clienteid = $1 AND e.empresaid = $2
      LIMIT 1;
    `;
    const equipeResult = await pool.query(equipeQuery, [clienteId, empresaid]);
    const equipeId = equipeResult.rows.length > 0 ? equipeResult.rows[0].equipeid : null;

    if (!equipeId) {
      return res.status(400).json({ error: 'Cliente não está associado a nenhuma equipe da empresa.' });
    }

    const novaManutencaoQuery = `
      INSERT INTO manutencoes (cliente_id, equipe_id, dia_semana, status, data_manutencao)
      VALUES ($1, $2, $3, 'pendente', NOW())
      RETURNING id;
    `;
    const novaManutencaoResult = await pool.query(novaManutencaoQuery, [clienteId, equipeId, diaSemana]);
    const novaManutencaoId = novaManutencaoResult.rows[0].id;

    console.log('Nova manutenção criada com ID:', novaManutencaoId);

    // Adicionar parâmetros padrão ativos para a empresa
    const parametrosPadraoQuery = `
      INSERT INTO manutencoes_parametros (manutencao_id, parametro, valor_atual, valor_ultimo)
      SELECT $1, parametro, NULL, NULL
      FROM parametros_quimicos
      WHERE ativo = TRUE AND empresaid = $2;
    `;
    await pool.query(parametrosPadraoQuery, [novaManutencaoId, empresaid]);

    console.log('Parâmetros padrão adicionados à nova manutenção.');

    return res.status(200).json({
      mensagem: 'Nova manutenção criada com parâmetros padrão.',
      manutencaoStatus: 'pendente',
    });
  } catch (error) {
    console.error('Erro ao buscar ou criar manutenção:', error);
    res.status(500).json({ error: 'Erro ao buscar ou criar manutenção.' });
  }
});

// 🔹 Regista parâmetros de manutenção e gera notificação automática se necessário
app.post('/manutencoes_parametros', async (req, res) => {
  const {
    manutencao_id,
    parametro,
    valor_atual,
    produto_usado,
    quantidade_usada,
    status,
    motivo,
    empresaid
  } = req.body;

  // 🧩 Validação inicial
  if (!manutencao_id || !parametro || !empresaid) {
    return res.status(400).json({ error: 'Dados incompletos: manutenção, parâmetro ou empresaid ausente.' });
  }

  // ✅ Normaliza nome e valor (para validações e regras)
  const nome = String(parametro || '').trim();
  const valorNum =
    valor_atual === undefined || valor_atual === null || valor_atual === ''
      ? null
      : Number(String(valor_atual).replace(',', '.'));

  // ✅ HARD-STOPS (segurança) — adiciona (não substitui)
  // Bloqueia apenas valores impossíveis/fora de escala
  if (nome === 'pH' && valorNum !== null) {
    if (!Number.isFinite(valorNum) || valorNum < 0 || valorNum > 14) {
      return res.status(400).json({ error: 'pH inválido (tem de estar entre 0 e 14).' });
    }
  }

  if (nome === 'Cloro Livre em ppm' && valorNum !== null) {
    if (!Number.isFinite(valorNum) || valorNum < 0 || valorNum > 20) {
      return res.status(400).json({ error: 'Cloro Livre inválido (tem de estar entre 0 e 20 ppm).' });
    }
  }

  try {
    // 🧩 Confirma se a manutenção e o parâmetro pertencem à empresa
    const validaEmpresaQuery = `
      SELECT 1 
      FROM manutencoes m
      JOIN parametros_quimicos pq ON pq.parametro = $2
      WHERE m.id = $1 AND pq.empresaid = $3 AND m.equipe_id IN (
        SELECT id FROM equipes WHERE empresaid = $3
      );
    `;
    const validaEmpresaResult = await pool.query(validaEmpresaQuery, [manutencao_id, parametro, empresaid]);

    if (validaEmpresaResult.rows.length === 0) {
      return res.status(403).json({ error: 'Parâmetro ou manutenção não pertencem à empresa especificada.' });
    }

    // 🧾 Log informativo
    console.log('🔄 Registrando status no banco de dados:', {
      manutencao_id,
      parametro,
      valor_atual,
      produto_usado,
      quantidade_usada,
      status,
      motivo,
      empresaid,
    });

    // 🧩 Regista ou atualiza o parâmetro
    const query = `
      INSERT INTO manutencoes_parametros (
        manutencao_id, parametro, valor_atual, produto_usado, quantidade_usada, status, motivo, empresaid
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (manutencao_id, parametro)
      DO UPDATE SET
      valor_atual = CASE 
        WHEN EXCLUDED.status = 'pendente' THEN NULL 
        WHEN EXCLUDED.status = 'nao ajustavel' THEN COALESCE(manutencoes_parametros.valor_atual, EXCLUDED.valor_atual) 
        ELSE COALESCE(EXCLUDED.valor_atual, manutencoes_parametros.valor_atual) 
      END,
      produto_usado = EXCLUDED.produto_usado,
      quantidade_usada = EXCLUDED.quantidade_usada,
      status = CASE 
        WHEN EXCLUDED.status = 'nao ajustavel' THEN 'nao ajustavel'
        ELSE EXCLUDED.status
      END,
      motivo = EXCLUDED.motivo,
      data_aplicacao = CASE
        WHEN EXCLUDED.status = 'pendente' THEN manutencoes_parametros.data_aplicacao
        ELSE NOW()
      END,
      empresaid = EXCLUDED.empresaid;
    `;

    const values = [
      manutencao_id,
      parametro,
      (valor_atual === '' || valor_atual === undefined) ? null : valor_atual, // mantém como tinhas
      produto_usado || null,
      quantidade_usada || 0,
      status,
      motivo || '',
      empresaid,
    ];

    await pool.query(query, values);

    // ✅ Busca o cliente da manutenção
    const clienteQuery = `
      SELECT cliente_id 
      FROM manutencoes 
      WHERE id = $1 AND empresaid = $2
    `;
    const clienteResult = await pool.query(clienteQuery, [manutencao_id, empresaid]);
    const clienteId = clienteResult.rows[0]?.cliente_id;

    // 🔔 Notificações automáticas para parâmetros fora do intervalo
    if (clienteId) {
      const nomeNorm = String(parametro || '')
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

      const vn = (valorNum === null ? NaN : valorNum);

      let limite = null;
      let descricao = '';
      let chave = '';

      if (nomeNorm === 'alcalinidade' && Number.isFinite(vn) && vn > 120) {
        limite = 120;
        chave = 'alcalinidade';
        descricao = 'A alcalinidade está acima de 120 ppm. É necessário repor parte da água da piscina.';
      } else if (
        (nomeNorm === 'acido cianurico' || nomeNorm.includes('acido cianurico')) &&
        Number.isFinite(vn) &&
        vn > 50
      ) {
        limite = 50;
        chave = 'acido cianurico';
        descricao = 'O ácido cianúrico está acima de 50 ppm. É recomendada a reposição parcial da água da piscina.';
      } else if (
        (nomeNorm === 'sal em kg/m3' || nomeNorm === 'sal em kg/m³' || nomeNorm === 'sal') &&
        Number.isFinite(vn) &&
        vn > 6
      ) {
        limite = 6;
        chave = 'sal';
        descricao = 'O teor de sal está acima de 6 kg/m³. Verifique o equipamento de eletrólise e a concentração de sal.';
      }

      if (limite !== null) {
        const existeNotif = await pool.query(
          `
          SELECT id FROM notificacoes
          WHERE cliente_id = $1
            AND assunto = 'Parâmetro químico fora do intervalo'
            AND mensagem ILIKE $2
            AND status != 'resolvido'
            AND empresaid = $3
          `,
          [clienteId, `%${chave}%`, empresaid]
        );

        if (existeNotif.rows.length === 0) {
          await pool.query(
            `
            INSERT INTO notificacoes (cliente_id, assunto, mensagem, status, data_criacao, empresaid)
            VALUES ($1, $2, $3, 'pendente', NOW(), $4)
            `,
            [clienteId, 'Parâmetro químico fora do intervalo', descricao, empresaid]
          );

          console.log(`📢 Notificação criada automaticamente (${chave}) para o cliente ${clienteId}`);
        } else {
          console.log(`⚠️ Notificação já existente (${chave}) para o cliente ${clienteId}, não duplicada.`);
        }
      }
    }

    // 🔚 Resposta final
    res.status(200).json({ message: 'Status do parâmetro registrado com sucesso.' });

  } catch (error) {
    console.error('❌ Erro ao registrar status do parâmetro:', error);
    res.status(500).json({ error: 'Erro ao registrar status do parâmetro.' });
  }
});

app.get('/manutencoes_parametros', async (req, res) => {
  const { manutencao_id, empresaid } = req.query;

  // Validação inicial
  if (!manutencao_id || !empresaid) {
    return res.status(400).json({ error: 'ID da manutenção e empresa são obrigatórios.' });
  }

  try {
    const query = `
      SELECT 
  mp.manutencao_id,
  mp.parametro,
  mp.valor_atual,
  mp.produto_usado,
  mp.quantidade_usada,
  mp.status,
  CASE 
    WHEN mp.status = 'nao ajustavel' THEN 'Foi solicitada assistência à administração com sucesso'
    ELSE mp.motivo
  END AS motivo,
  pq.ativo
FROM manutencoes_parametros mp
JOIN parametros_quimicos pq ON mp.parametro = pq.parametro AND pq.empresaid = $2
WHERE mp.manutencao_id = $1 AND mp.empresaid = $2;

    `;
    const values = [manutencao_id, empresaid];

    const result = await pool.query(query, values);
    //console.log('🚀 Parâmetros carregados do banco:', result.rows);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar parâmetros da manutenção:', error);
    res.status(500).json({ error: 'Erro ao buscar parâmetros da manutenção.' });
  }
});

async function criarSnapshotISLSemanalSeNecessario({ empresaid, cliente_id, manutencao_id }) {
  console.log('🟦 [ISL SNAPSHOT] Verificar snapshot semanal', {
    empresaid,
    cliente_id,
    manutencao_id,
  });

  // 1) buscar estado atual (fonte de verdade)
  const st = await pool.query(
    `SELECT * FROM isl_estado_atual WHERE empresaid=$1 AND cliente_id=$2 LIMIT 1`,
    [empresaid, cliente_id]
  );

  const estado = st.rows[0];

  if (!estado) {
    console.log('🟨 [ISL SNAPSHOT] Sem estado atual ISL → nada a fazer');
    return { ok: false, reason: 'Sem estado ISL.' };
  }

  if (estado.isl == null) {
    console.log('🟨 [ISL SNAPSHOT] Estado ISL existe mas sem valor calculado → skip', {
      estado,
    });
    return { ok: false, reason: 'Sem estado ISL calculado.' };
  }

  console.log('🟩 [ISL SNAPSHOT] Estado ISL válido encontrado', {
    isl: estado.isl,
    ph: estado.ph,
    alcalinidade: estado.alcalinidade,
    dureza: estado.dureza,
    temperatura: estado.temperatura,
    tds: estado.tds,
  });

  // 2) verificar se já existe snapshot nesta semana
  const qCheck = `
    SELECT 1
    FROM isl_registos
    WHERE empresaid = $1 AND cliente_id = $2
      AND date_trunc('week', created_at) = date_trunc('week', NOW())
    LIMIT 1;
  `;
  const ck = await pool.query(qCheck, [empresaid, cliente_id]);

  if (ck.rowCount > 0) {
    console.log('🟦 [ISL SNAPSHOT] Já existe snapshot ISL nesta semana → ignorado');
    return { ok: true, skipped: true };
  }

  // 3) inserir snapshot (histórico)
  console.log('🟩 [ISL SNAPSHOT] A criar novo snapshot semanal ISL');

  const qIns = `
    INSERT INTO isl_registos (
      cliente_id, manutencao_id, empresaid,
      ph, alcalinidade, dureza, temperatura, tds,
      isl, indicacao
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *;
  `;

  const vals = [
    cliente_id,
    manutencao_id || null,
    empresaid,
    estado.ph,
    estado.alcalinidade,
    estado.dureza,
    estado.temperatura,
    estado.tds,
    estado.isl,
    estado.indicacao || null,
  ];

  const ins = await pool.query(qIns, vals);

  console.log('✅ [ISL SNAPSHOT] Snapshot semanal criado com sucesso', {
    id: ins.rows[0]?.id,
    created_at: ins.rows[0]?.created_at,
    isl: ins.rows[0]?.isl,
  });

  return { ok: true, created: true, registo: ins.rows[0] };
}

// Criar registo ISL - ISL (Langelier) 
app.post('/isl', async (req, res) => {
  console.log('📥 Dados recebidos no POST /isl:', req.body);

  const {
    empresaid,
    cliente_id,
    manutencao_id,
    ph,
    alcalinidade,
    dureza,
    temperatura,
    tds,
    isl,
    indicacao,
    ph_alvo,
    alc_alvo,
  } = req.body;

  // validações mínimas (mantém simples)
  if (!empresaid) return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  if (!cliente_id) return res.status(400).json({ error: 'cliente_id é obrigatório.' });
  if (ph === undefined || ph === null) return res.status(400).json({ error: 'ph é obrigatório.' });
  if (alcalinidade === undefined || alcalinidade === null) return res.status(400).json({ error: 'alcalinidade é obrigatório.' });
  if (dureza === undefined || dureza === null) return res.status(400).json({ error: 'dureza é obrigatório.' });
  if (temperatura === undefined || temperatura === null) return res.status(400).json({ error: 'temperatura é obrigatório.' });
  if (isl === undefined || isl === null) return res.status(400).json({ error: 'isl é obrigatório.' });
  if (!indicacao) return res.status(400).json({ error: 'indicacao é obrigatório.' });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1) HISTÓRICO (isl_registos)
    const qHist = `
      INSERT INTO isl_registos (
        cliente_id, manutencao_id, empresaid,
        ph, alcalinidade, dureza, temperatura, tds,
        isl, indicacao,
        ph_alvo, alc_alvo
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *;
    `;

    const vHist = [
      cliente_id,
      manutencao_id || null,
      empresaid,
      ph,
      alcalinidade,
      dureza,
      temperatura,
      tds ?? null,
      isl,
      indicacao,
      ph_alvo ?? null,
      alc_alvo ?? null,
    ];

    const hist = await client.query(qHist, vHist);

    // 2) ESTADO ATUAL (isl_estado_atual) — UPSERT com datas por campo
    // Nota: aqui não meto ph_alvo/alc_alvo porque são calculados no front (islSugestao)
    // Se quiseres, depois também gravamos estes dois.
    const qUpsert = `
  INSERT INTO isl_estado_atual (
    empresaid, cliente_id,
    ph, ph_updated_at,
    alcalinidade, alcalinidade_updated_at,
    dureza, dureza_updated_at,
    temperatura, temperatura_updated_at,
    tds, tds_updated_at,
    isl, isl_updated_at,
    indicacao,
    ph_alvo, alc_alvo, alvos_updated_at,
    updated_at, created_at
  )
  VALUES (
  $1, $2,
  $3, NOW(),
  $4, NOW(),
  $5, NOW(),
  $6, NOW(),
  $7, NOW(),
  $8, NOW(),
  $9, NOW(),
  $10,

  $11, $12, CASE WHEN ($11 IS NOT NULL OR $12 IS NOT NULL) THEN NOW() ELSE NULL END,

  NOW(), NOW()
)
  ON CONFLICT (empresaid, cliente_id)
  DO UPDATE SET
    ph = EXCLUDED.ph,
    ph_updated_at = NOW(),
    alcalinidade = EXCLUDED.alcalinidade,
    alcalinidade_updated_at = NOW(),
    dureza = EXCLUDED.dureza,
    dureza_updated_at = NOW(),
    temperatura = EXCLUDED.temperatura,
    temperatura_updated_at = NOW(),
    tds = EXCLUDED.tds,
    tds_updated_at = NOW(),
    isl = EXCLUDED.isl,
    isl_updated_at = NOW(),
    indicacao = EXCLUDED.indicacao,
    ph_alvo = COALESCE(EXCLUDED.ph_alvo, isl_estado_atual.ph_alvo),
    alc_alvo = COALESCE(EXCLUDED.alc_alvo, isl_estado_atual.alc_alvo),
    alvos_updated_at = CASE
      WHEN EXCLUDED.ph_alvo IS NOT NULL OR EXCLUDED.alc_alvo IS NOT NULL THEN NOW()
      ELSE isl_estado_atual.alvos_updated_at
    END,
    updated_at = NOW()
  RETURNING *;
`;

const vUpsert = [
  empresaid,          // $1
  cliente_id,         // $2
  ph,                 // $3
  alcalinidade,       // $4
  dureza,             // $5
  temperatura,        // $6
  tds ?? null,        // $7
  isl,                // $8
  indicacao || null,  // $10  (no SQL é $10)
  ph_alvo ?? null,    // $11
  alc_alvo ?? null,   // $12
];

await client.query(qUpsert, vUpsert);


    await client.query('COMMIT');

    return res.status(201).json(hist.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro ao criar ISL:', error);
    return res.status(500).json({ error: 'Erro ao criar registo ISL.' });
  } finally {
    client.release();
  }
});

// Último ISL por cliente
app.get('/isl/ultimo', async (req, res) => {
  const { empresaid, cliente_id } = req.query;

  if (!empresaid) return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  if (!cliente_id) return res.status(400).json({ error: 'cliente_id é obrigatório.' });

  try {
    const query = `
      SELECT *
      FROM isl_registos
      WHERE empresaid = $1 AND cliente_id = $2
      ORDER BY created_at DESC
      LIMIT 1;
    `;
    const result = await pool.query(query, [empresaid, cliente_id]);
    return res.status(200).json(result.rows[0] || null);
  } catch (error) {
    console.error('❌ Erro ao buscar último ISL:', error);
    return res.status(500).json({ error: 'Erro ao buscar último ISL.' });
  }
});

// Histórico ISL por cliente (últimos N)
app.get('/isl/historico', async (req, res) => {
  const { empresaid, cliente_id, limit } = req.query;

  if (!empresaid) return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  if (!cliente_id) return res.status(400).json({ error: 'cliente_id é obrigatório.' });

  const lim = Math.min(parseInt(limit || '20', 10) || 20, 200);

  try {
    const query = `
      SELECT *
      FROM isl_registos
      WHERE empresaid = $1 AND cliente_id = $2
      ORDER BY created_at DESC
      LIMIT $3;
    `;
    const result = await pool.query(query, [empresaid, cliente_id, lim]);
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ Erro ao buscar histórico ISL:', error);
    return res.status(500).json({ error: 'Erro ao buscar histórico ISL.' });
  }
});

// Estado atual do ISL (persistente) - 1 linha por cliente
app.get('/isl/estado-atual', async (req, res) => {
  const { empresaid, cliente_id } = req.query;

  if (!empresaid) return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  if (!cliente_id) return res.status(400).json({ error: 'cliente_id é obrigatório.' });

  try {
    const q = `
      SELECT *
      FROM isl_estado_atual
      WHERE empresaid = $1 AND cliente_id = $2
      LIMIT 1;
    `;
    const r = await pool.query(q, [empresaid, cliente_id]);
    return res.status(200).json(r.rows[0] || null);
  } catch (e) {
    console.error('❌ Erro ao buscar isl_estado_atual:', e);
    return res.status(500).json({ error: 'Erro ao buscar estado atual do ISL.' });
  }
});

// Atualiza estado atual do ISL (persistente) — NÃO grava histórico aqui
app.post('/isl/estado', async (req, res) => {
  console.log('📥 Dados recebidos no POST /isl/estado:', req.body);

  const {
    empresaid,
    cliente_id,
    ph,
    alcalinidade,
    dureza,
    temperatura,
    tds,          
    isl,
    indicacao,
    ph_alvo,
    alc_alvo,
  } = req.body;

  if (!empresaid) return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  if (!cliente_id) return res.status(400).json({ error: 'cliente_id é obrigatório.' });
  if (ph === undefined || ph === null) return res.status(400).json({ error: 'ph é obrigatório.' });
  if (alcalinidade === undefined || alcalinidade === null) return res.status(400).json({ error: 'alcalinidade é obrigatório.' });
  if (dureza === undefined || dureza === null) return res.status(400).json({ error: 'dureza é obrigatório.' });
  if (temperatura === undefined || temperatura === null) return res.status(400).json({ error: 'temperatura é obrigatório.' });
  if (isl === undefined || isl === null) return res.status(400).json({ error: 'isl é obrigatório.' });

  try {
    const qUpsert = `
  INSERT INTO isl_estado_atual (
    empresaid, cliente_id,
    ph, ph_updated_at,
    alcalinidade, alcalinidade_updated_at,
    dureza, dureza_updated_at,
    temperatura, temperatura_updated_at,
    tds, tds_updated_at,
    isl, isl_updated_at,
    indicacao,
    ph_alvo, alc_alvo, alvos_updated_at,
    updated_at, created_at
  )
  VALUES (
    $1, $2,
    $3, NOW(),
    $4, NOW(),
    $5, NOW(),
    $6, NOW(),
    $7, NOW(),
    $8, NOW(),
    $9,
    $10, $11,
    CASE WHEN ($10 IS NOT NULL OR $11 IS NOT NULL) THEN NOW() ELSE NULL END,
    NOW(), NOW()
  )
  ON CONFLICT (empresaid, cliente_id)
  DO UPDATE SET
    ph = EXCLUDED.ph,
    ph_updated_at = NOW(),
    alcalinidade = EXCLUDED.alcalinidade,
    alcalinidade_updated_at = NOW(),
    dureza = EXCLUDED.dureza,
    dureza_updated_at = NOW(),
    temperatura = EXCLUDED.temperatura,
    temperatura_updated_at = NOW(),
    tds = EXCLUDED.tds,
    tds_updated_at = NOW(),
    isl = EXCLUDED.isl,
    isl_updated_at = NOW(),
    indicacao = EXCLUDED.indicacao,

    ph_alvo = COALESCE(EXCLUDED.ph_alvo, isl_estado_atual.ph_alvo),
    alc_alvo = COALESCE(EXCLUDED.alc_alvo, isl_estado_atual.alc_alvo),
    alvos_updated_at = CASE
      WHEN EXCLUDED.ph_alvo IS NOT NULL OR EXCLUDED.alc_alvo IS NOT NULL THEN NOW()
      ELSE isl_estado_atual.alvos_updated_at
    END,

    updated_at = NOW()
  RETURNING *;
`;

    const vUpsert = [
  empresaid,          // $1
  cliente_id,         // $2
  ph,                 // $3
  alcalinidade,       // $4
  dureza,             // $5
  temperatura,        // $6
  tds ?? null,        // $7
  isl,                // $8
  indicacao || null,  // $9
  ph_alvo ?? null,    // $10
  alc_alvo ?? null,   // $11
];

    const r = await pool.query(qUpsert, vUpsert);
    return res.status(200).json(r.rows[0]);
  } catch (error) {
    console.error('❌ Erro ao atualizar ISL estado:', error);
    return res.status(500).json({ error: 'Erro ao atualizar estado ISL.' });
  }
});

app.patch('/isl/estado', async (req, res) => {
  const {
    empresaid,
    cliente_id,

    // podem vir 1 ou vários
    ph,
    alcalinidade,
    dureza,
    temperatura,
    tds,

    // resultado calculado (pode vir do front)
    isl,
    indicacao,
    ph_alvo,
    alc_alvo,
  } = req.body;

  if (!empresaid) return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  if (!cliente_id) return res.status(400).json({ error: 'cliente_id é obrigatório.' });

  try {
    const now = new Date().toISOString();

    const cols = [];
    const vals = [empresaid, cliente_id];
    let idx = 3;

    const add = (col, value) => {
      cols.push({ col, idx });
      vals.push(value);
      idx++;
    };

    // Valores + datas por campo
    if (ph !== undefined) { add('ph', ph); add('ph_updated_at', now); }
    if (alcalinidade !== undefined) { add('alcalinidade', alcalinidade); add('alcalinidade_updated_at', now); }
    if (dureza !== undefined) { add('dureza', dureza); add('dureza_updated_at', now); }
    if (temperatura !== undefined) { add('temperatura', temperatura); add('temperatura_updated_at', now); }
    if (tds !== undefined) { add('tds', tds); add('tds_updated_at', now); }

    // Resultado ISL + alvos (se vierem)
    if (isl !== undefined) { add('isl', isl); add('isl_updated_at', now); }
    if (indicacao !== undefined) add('indicacao', indicacao);
    if (ph_alvo !== undefined) add('ph_alvo', ph_alvo);
    if (alc_alvo !== undefined) add('alc_alvo', alc_alvo);

    // Sempre
    add('updated_at', now);

    // Se só veio updated_at, devolve o estado atual
    if (cols.length === 1) {
      const r0 = await pool.query(
        `SELECT * FROM isl_estado_atual WHERE empresaid=$1 AND cliente_id=$2 LIMIT 1`,
        [empresaid, cliente_id]
      );
      return res.status(200).json(r0.rows[0] || null);
    }

    const setSql = cols.map((c) => `${c.col} = $${c.idx}`).join(', ');

    const q = `
      INSERT INTO isl_estado_atual (empresaid, cliente_id)
      VALUES ($1, $2)
      ON CONFLICT (empresaid, cliente_id)
      DO UPDATE SET ${setSql}
      RETURNING *;
    `;

    const r = await pool.query(q, vals);
    return res.status(200).json(r.rows[0]);
  } catch (e) {
    console.error('❌ Erro PATCH /isl/estado:', e);
    return res.status(500).json({ error: 'Erro ao atualizar estado atual do ISL.' });
  }
});

app.post('/manutencoes/concluir', async (req, res) => {
  const { cliente_id, equipe_id, dia_semana, parametros, status, empresaid, isl_payload } = req.body;

  if (!cliente_id || !equipe_id || !dia_semana || !empresaid) {
    return res.status(400).json({ error: 'Dados incompletos para concluir a manutenção ou empresaid ausente.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Validação do `empresaid`
    const validaEmpresaQuery = `
      SELECT 1 
      FROM clientes c
      JOIN equipes e ON e.id = $2
      WHERE c.id = $1 AND c.empresaid = $3 AND e.empresaid = $3;
    `;
    const validaEmpresaResult = await client.query(validaEmpresaQuery, [cliente_id, equipe_id, empresaid]);

    if (validaEmpresaResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Cliente ou equipe não pertencem à empresa especificada.' });
    }

    // 1) Criar manutenção
    const query = `
      INSERT INTO manutencoes (cliente_id, equipe_id, dia_semana, status, data_manutencao)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *;
    `;
    const values = [cliente_id, equipe_id, dia_semana, status];
    const result = await client.query(query, values);
    const manutencaoId = result.rows[0].id;

    // 2) Inserir parâmetros associados
    if (parametros && parametros.length > 0) {
      for (const parametro of parametros) {
        const validaParametroQuery = `
          SELECT 1 
          FROM parametros_quimicos 
          WHERE parametro = $1 AND empresaid = $2 AND ativo = TRUE;
        `;
        const validaParametroResult = await client.query(validaParametroQuery, [parametro.parametro, empresaid]);

        if (validaParametroResult.rows.length === 0) {
          console.warn(`Parâmetro ${parametro.parametro} não pertence à empresa ${empresaid}. Ignorado.`);
          continue;
        }

        const parametroQuery = `
          INSERT INTO manutencoes_parametros (manutencao_id, parametro, valor_atual, produto_usado, quantidade_usada)
          VALUES ($1, $2, $3, $4, $5);
        `;
        await client.query(parametroQuery, [
          manutencaoId,
          parametro.parametro,
          parametro.valor_atual || null,
          parametro.produto_usado || null,
          parametro.quantidade_usada || 0,
        ]);
      }
    }

    // 3) Se veio ISL do front, atualiza estado atual (isl_estado_atual)
    if (isl_payload && isl_payload.isl !== undefined && isl_payload.isl !== null) {
      const {
        ph, alcalinidade, dureza, temperatura, tds, isl, indicacao,
      } = isl_payload;

      const qUpsert = `
        INSERT INTO isl_estado_atual (
          empresaid, cliente_id,
          ph, ph_updated_at,
          alcalinidade, alcalinidade_updated_at,
          dureza, dureza_updated_at,
          temperatura, temperatura_updated_at,
          tds, tds_updated_at,
          isl, isl_updated_at,
          indicacao,
          updated_at, created_at
        )
        VALUES (
          $1, $2,
          $3, NOW(),
          $4, NOW(),
          $5, NOW(),
          $6, NOW(),
          $7, NOW(),
          $8, NOW(),
          $9, NOW(),
          $10,
          NOW(), NOW()
        )
        ON CONFLICT (empresaid, cliente_id)
        DO UPDATE SET
          ph = EXCLUDED.ph,
          ph_updated_at = NOW(),
          alcalinidade = EXCLUDED.alcalinidade,
          alcalinidade_updated_at = NOW(),
          dureza = EXCLUDED.dureza,
          dureza_updated_at = NOW(),
          temperatura = EXCLUDED.temperatura,
          temperatura_updated_at = NOW(),
          tds = EXCLUDED.tds,
          tds_updated_at = NOW(),
          isl = EXCLUDED.isl,
          isl_updated_at = NOW(),
          indicacao = EXCLUDED.indicacao,
          updated_at = NOW();
      `;

      const vUpsert = [
        empresaid,
        cliente_id,
        ph,
        alcalinidade,
        dureza,
        temperatura,
        tds ?? null,
        isl,
        indicacao || null,
      ];

      await client.query(qUpsert, vUpsert);
    }

    await client.query('COMMIT');

    // 4) Snapshot semanal DEPOIS do estado estar correto
    try {
      const snap = await criarSnapshotISLSemanalSeNecessario({
        empresaid,
        cliente_id,
        manutencao_id: manutencaoId,
      });
      console.log('📌 Snapshot ISL semanal:', snap);
    } catch (e) {
      console.warn('⚠️ Snapshot ISL falhou (não bloqueia conclusão):', e?.message || e);
    }

    return res.status(201).json({ message: 'Manutenção concluída com sucesso.', id: manutencaoId });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao concluir manutenção:', error);
    return res.status(500).json({ error: 'Erro ao concluir manutenção.' });
  } finally {
    client.release();
  }
});

app.get('/ultima-manutencao-parametros', async (req, res) => {
  const { clienteId, diaSemana, empresaid } = req.query;

  if (!clienteId || !diaSemana || !empresaid) {
    return res.status(400).json({ error: 'Cliente ID, dia da semana e empresaid são obrigatórios.' });
  }

  try {
    const query = `
      SELECT DISTINCT ON (mp.parametro)
        mp.parametro,
        mp.valor_atual,
        LAG(mp.valor_atual) OVER (PARTITION BY mp.parametro ORDER BY m.data_manutencao DESC) AS valor_ultimo,
        mp.produto_usado,
        mp.quantidade_usada,
        pq.valor_minimo,
        pq.valor_maximo,
        pq.valor_alvo,
        pq.produto_aumentar,
        pq.produto_diminuir,
        pq.dosagem_aumentar,
        pq.dosagem_diminuir,
        pq.incremento_aumentar,
        pq.incremento_diminuir,
        pq.volume_calculo
      FROM manutencoes_parametros mp
      JOIN manutencoes m ON mp.manutencao_id = m.id
      JOIN parametros_quimicos pq ON mp.parametro = pq.parametro
      JOIN clientes c ON m.cliente_id = c.id
      WHERE m.cliente_id = $1 AND m.dia_semana = $2 AND c.empresaid = $3 AND pq.empresaid = $3
      ORDER BY mp.parametro, m.data_manutencao DESC;
    `;
    const values = [clienteId, diaSemana, empresaid];
    const result = await pool.query(query, values);

    if (result.rows.length > 0) {
      return res.status(200).json(result.rows);
    }

    // Caso não haja dados na tabela `manutencoes_parametros`
    const parametrosPadraoQuery = `
      SELECT
        parametro,
        valor_minimo,
        valor_maximo,
        valor_alvo,
        produto_aumentar,
        produto_diminuir,
        dosagem_aumentar,
        dosagem_diminuir,
        incremento_aumentar,
        incremento_diminuir,
        volume_calculo
      FROM parametros_quimicos
      WHERE empresaid = $1 AND ativo = TRUE;
    `;
    const parametrosPadrao = await pool.query(parametrosPadraoQuery, [empresaid]);

    const parametrosCompletos = parametrosPadrao.rows.map((param) => ({
      ...param,
      valor_atual: null,
      valor_ultimo: null,
    }));

    res.status(200).json(parametrosCompletos);
  } catch (error) {
    console.error('Erro ao buscar última manutenção com parâmetros químicos:', error);
    res.status(500).json({ error: 'Erro ao buscar última manutenção com parâmetros químicos.' });
  }
});

app.get('/notificacoes', async (req, res) => { 
  const { empresaid } = req.query;

  if (!empresaid) {
    return res.status(400).json({ error: 'O parâmetro empresaid é obrigatório.' });
  }

  try {
    const notificacoesQuery = `
      SELECT 
        n.id,
        n.assunto,
        n.mensagem,
        n.anexos,
        n.status,
        n.data_criacao,
        n.data_resolucao,
        n.data_atualizacao_status,
        n.valor_servico_extra,
        n.fatura_paga,
        n.tecnico_id,
        n.criador_id,
        n.responsavel_id,
        n.etapa_atual,
        n.orcamento_obrigatorio,
        n.orcamento_aprovado,
        n.detalhes_fluxo,
        n.valor_orcamento,
        n.referencia_orcamento,
        n.em_garantia,

        c.nome        AS cliente_nome,
        c.morada      AS cliente_morada,
        c.telefone    AS cliente_telefone,
        c.email       AS cliente_email,
        c.google_maps AS cliente_google_maps,


        e.nomeequipe AS equipe_nome,

        u_resp.nome    AS responsavel_nome,
        u_criador.nome AS criador_nome,
        u_tec.nome     AS tecnico_nome,
        u_resp.tipo_usuario AS responsavel_tipo
      FROM notificacoes n
      LEFT JOIN clientes   c ON n.cliente_id    = c.id
      LEFT JOIN associados a ON a.clienteid     = c.id
      LEFT JOIN equipes    e ON a.equipeid      = e.id
      LEFT JOIN usuarios   u_resp    ON u_resp.id    = n.responsavel_id
      LEFT JOIN usuarios   u_criador ON u_criador.id = n.criador_id
      LEFT JOIN usuarios   u_tec     ON u_tec.id     = n.tecnico_id
      WHERE n.cliente_id IS NOT NULL 
        AND n.empresaid = $1
      ORDER BY n.data_criacao DESC;
    `;

    const result = await pool.query(notificacoesQuery, [Number(empresaid)]);

    if (result.rows.length === 0) {
      return res.status(200).json([]);
    }

    const unicas = Array.from(new Map(result.rows.map(n => [n.id, n])).values());

    const resposta = unicas.map(n => ({
      ...n,
      atribuido_a: n.responsavel_nome || null,
    }));

    console.log('📥 Notificações carregadas (únicas):', resposta);

    res.status(200).json(resposta);
  } catch (error) {
    console.error('❌ Erro ao buscar notificações:', error);
    res.status(500).json({ error: 'Erro ao buscar notificações.' });
  }
});

app.post('/notificacoes', async (req, res) => {
  const {
    cliente_id,
    clienteId,
    assunto: assuntoOriginal,
    parametro,
    mensagem,
    empresaid,
    anexos,
    valor_servico_extra,

    // ✅ aceita ambos
    criador_id,            // novo (frontend atual)
    usuario_id,            // antigo (compatibilidade)

    tecnico_id,
    responsavel_id,
    etapa_atual,
    orcamento_obrigatorio,
    orcamento_aprovado,
  } = req.body;

  const toIntOrNull = (v) => {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const clienteFinal = toIntOrNull(cliente_id ?? clienteId);
  const empresaFinal = toIntOrNull(empresaid);

  const criadorId = toIntOrNull(criador_id ?? usuario_id);
  const tecnicoIdFinal = toIntOrNull(tecnico_id);
  const responsavelBody = toIntOrNull(responsavel_id);

  console.log('📨 Nova notificação recebida (payload simplificado):', {
    cliente_id: clienteFinal,
    assuntoOriginal,
    parametro,
    empresaid: empresaFinal,
    criador_id,
    usuario_id,
    criadorIdFinal: criadorId,
  });

  if (!clienteFinal || !mensagem || !empresaFinal) {
    console.warn('⚠️ Campos obrigatórios ausentes:', {
      cliente_id, clienteId, mensagem, empresaid
    });
    return res.status(400).json({ error: 'cliente_id (ou clienteId), mensagem e empresaid são obrigatórios.' });
  }

  try {
    const assuntoFinal =
      assuntoOriginal || (parametro ? `Alerta parâmetro: ${parametro}` : 'Relatório de Anomalia');

    const anexosJson = Array.isArray(anexos) && anexos.length > 0 ? JSON.stringify(anexos) : null;

    let valorExtra = 0;
    if (valor_servico_extra !== undefined && valor_servico_extra !== null && String(valor_servico_extra).trim() !== '') {
      const n = Number(String(valor_servico_extra).replace(',', '.'));
      valorExtra = Number.isFinite(n) ? n : 0;
    }

    const etapaInicial = etapa_atual || 'admin';

    const orcObrig = (typeof orcamento_obrigatorio === 'boolean') ? orcamento_obrigatorio : false;
    const orcAprov = (typeof orcamento_aprovado === 'boolean') ? orcamento_aprovado : null;

    // ✅ não atribuir automaticamente ao criador
    const responsavelInicial = responsavelBody; // pode ser null

    const query = `
      INSERT INTO notificacoes (
        cliente_id,
        assunto,
        mensagem,
        status,
        data_criacao,
        empresaid,
        anexos,
        valor_servico_extra,
        fatura_paga,
        tecnico_id,
        criador_id,
        responsavel_id,
        etapa_atual,
        orcamento_obrigatorio,
        orcamento_aprovado
      )
      VALUES (
        $1,  $2,  $3, 
        'pendente', 
        NOW(), 
        $4,  $5,  $6,
        FALSE,
        $7,  $8,  $9,
        $10, $11, $12
      )
      RETURNING *;
    `;

    const values = [
      clienteFinal,          // $1
      assuntoFinal,          // $2
      mensagem,              // $3
      empresaFinal,          // $4
      anexosJson,            // $5
      valorExtra,            // $6
      tecnicoIdFinal,        // $7
      criadorId,             // $8 ✅ agora preenche
      responsavelInicial,    // $9
      etapaInicial,          // $10
      orcObrig,              // $11
      orcAprov,              // $12
    ];

    console.log('🔹 Valores enviados:', values);

    const result = await pool.query(query, values);

    res.status(201).json({
      message: 'Notificação criada com sucesso!',
      notificacao: result.rows[0],
    });
  } catch (error) {
    console.error('❌ Erro ao criar notificação:', error);
    if (error.code) console.error(`🚨 Código de erro SQL: ${error.code}`);
    res.status(500).json({ error: 'Erro ao criar notificação.' });
  }
});

app.put('/notificacoes/:id/status', async (req, res) => {
  const { id } = req.params;
  const {
    status,
    empresaid,
    etapa_atual,
    responsavel_id,
    valor_servico_extra,
    fatura_paga,
    orcamento_obrigatorio,
    orcamento_aprovado,
    detalhes_fluxo,
  } = req.body;

  if (!empresaid) {
    return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  }

  if (
    status === undefined &&
    etapa_atual === undefined &&
    responsavel_id === undefined &&
    valor_servico_extra === undefined &&
    fatura_paga === undefined &&
    orcamento_obrigatorio === undefined &&
    orcamento_aprovado === undefined &&
    detalhes_fluxo === undefined
  ) {
    return res.status(400).json({ error: 'Nada para atualizar.' });
  }

  try {
    const campos = {};

    if (status !== undefined) {
      campos.status = status;
    }

    if (etapa_atual !== undefined) {
      campos.etapa_atual = etapa_atual;
    }

    if (responsavel_id !== undefined) {
      campos.responsavel_id =
        responsavel_id === null ? null : Number(responsavel_id);
    }

    if (valor_servico_extra !== undefined) {
      campos.valor_servico_extra =
        valor_servico_extra === null
          ? null
          : parseFloat(valor_servico_extra);
    }

    if (fatura_paga !== undefined) {
      campos.fatura_paga = !!fatura_paga;
    }

    if (orcamento_obrigatorio !== undefined) {
      campos.orcamento_obrigatorio = !!orcamento_obrigatorio;
    }

    if (orcamento_aprovado !== undefined) {
      campos.orcamento_aprovado =
        typeof orcamento_aprovado === 'boolean'
          ? orcamento_aprovado
          : null;
    }

    if (detalhes_fluxo !== undefined) {
      const texto = String(detalhes_fluxo).trim();
      campos.detalhes_fluxo = texto.length > 0 ? texto : null;
    }

    const result = await atualizarWorkflowNotificacao(id, empresaid, campos);

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({
          error: 'Notificação não encontrada ou não pertence à empresa.',
        });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar status da notificação:', error);
    return res
      .status(500)
      .json({ error: 'Erro ao atualizar status da notificação.' });
  }
});

app.put('/notificacoes/:id/responsavel', async (req, res) => {
  const { id } = req.params;
  const { responsavel_id, empresaid } = req.body;

  if (!empresaid) {
    return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  }

  if (responsavel_id === undefined || responsavel_id === null) {
    return res.status(400).json({ error: 'responsavel_id é obrigatório.' });
  }

  try {
    const result = await pool.query(
      `
        UPDATE notificacoes
        SET responsavel_id = $1,
            data_atualizacao_status = NOW()
        WHERE id = $2 AND empresaid = $3
        RETURNING *;
      `,
      [Number(responsavel_id), Number(id), Number(empresaid)]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada ou não pertence à empresa.' });
    }

    res.json({ message: 'Responsável atualizado com sucesso!', notificacao: result.rows[0] });
  } catch (error) {
    console.error('Erro ao atualizar responsável:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

app.put('/notificacoes/:id/update', async (req, res) => {
  const { id } = req.params;
  const { status, responsavel_id, empresaid } = req.body;

  try {
    if (!empresaid) {
      return res.status(400).json({ error: 'Empresaid é obrigatório.' });
    }

    let query = 'UPDATE notificacoes SET ';
    const values = [];
    let count = 1;

    if (status !== undefined) {
      query += `status = $${count}, `;
      values.push(status);
      count++;
    }

    if (responsavel_id !== undefined) {
      query += `responsavel_id = $${count}, `;
      values.push(responsavel_id === null ? null : Number(responsavel_id));
      count++;
    }

    // timestamp
    query += `data_atualizacao_status = NOW(), `;
    query = query.trim().replace(/,$/, '');
    query += ` WHERE id = $${count} AND empresaid = $${count + 1}`;

    values.push(Number(id), Number(empresaid));

    console.log('🛠️ SQL /notificacoes/:id/update:', query, 'Valores:', values);

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: 'Notificação não encontrada ou sem permissão para editar.' });
    }

    res.json({ message: 'Notificação atualizada com sucesso!' });
  } catch (error) {
    console.error('❌ Erro ao atualizar notificação:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});

app.delete('/notificacoes/:id', async (req, res) => {
  const { id } = req.params;
  const { empresaid } = req.query;

  if (!empresaid) {
    return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  }

  try {
    const deleteQuery = `
      DELETE FROM notificacoes
      WHERE id = $1 AND empresaid = $2
      RETURNING *;
    `;
    const result = await pool.query(deleteQuery, [id, empresaid]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada ou não pertence à empresa.' });
    }

    res.status(200).json({ message: 'Notificação apagada com sucesso.' });
  } catch (error) {
    console.error('Erro ao apagar notificação:', error);
    res.status(500).json({ error: 'Erro ao apagar notificação.' });
  }
});

// ------------------------------------------------------
// 🔧 Helper para atualizar campos de workflow
// ------------------------------------------------------
async function atualizarWorkflowNotificacao(id, empresaid, camposExtras = {}) {
  // 1) tira campos undefined (evita updates estranhos)
  const entries = Object.entries(camposExtras).filter(
    ([, v]) => v !== undefined
  );

  if (entries.length === 0) {
    throw new Error('atualizarWorkflowNotificacao: nenhum campo para atualizar.');
  }

  // (opcional) log limpo, uma vez só
  console.log('🧩 camposExtras keys:', entries.map(([k]) => k));

  const sets = [];
  const values = [];
  let idx = 1;

  for (const [campoRaw, valor] of entries) {
    // 2) “sanitizar” nome do campo (se por acidente vier com vírgula)
    const campo = String(campoRaw).trim().replace(/,+$/, '');

    sets.push(`${campo} = $${idx}`);
    values.push(valor);
    idx++;
  }

  // 3) timestamp SEMPRE no fim, mas como mais um item do join
  sets.push(`data_atualizacao_status = NOW()`);

  const query = `
    UPDATE notificacoes
    SET ${sets.join(', ')}
    WHERE id = $${idx} AND empresaid = $${idx + 1}
    RETURNING *;
  `;

  values.push(Number(id), Number(empresaid));

  console.log('🛠️ SQL workflow:', query, 'Valores:', values);

  return pool.query(query, values);
}

// 🔹 Registar passo de fluxo de uma notificação (histórico)
// Vai guardar cada "passagem da bola": de quem → para que área, com que estado e mensagem.
async function registarPassoFluxo({
  notificacaoId,
  empresaid,
  de_user_id,
  de_tipo,
  para_tipo,
  status,
  etapa,
  mensagem,
}) {
  try {
    const query = `
      INSERT INTO notificacoes_fluxo
        (notificacao_id, empresaid, de_user_id, de_tipo, para_tipo, status, etapa, mensagem)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
    `;

    const values = [
      Number(notificacaoId),
      Number(empresaid),
      de_user_id ? Number(de_user_id) : null,
      de_tipo || null,
      para_tipo || null,
      status || null,
      etapa || null,
      mensagem || null,
    ];

    await pool.query(query, values);
  } catch (error) {
    console.error('❌ Erro ao registar passo de fluxo da notificação:', error);
    // Não mandamos erro para o cliente aqui para não estragar a ação principal.
  }
}

// 🟡 ADMIN → Enviar técnico para diagnóstico (Modelo B: atribui responsavel_id)
app.post('/notificacoes/:id/enviar-tecnico-diagnostico', async (req, res) => {
  console.log('📨 BODY:', req.body);

  const { id } = req.params;
  const { empresaid, responsavel_id, detalhes_fluxo, de_user_id, de_tipo } = req.body;

  if (!empresaid) return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  if (!responsavel_id) return res.status(400).json({ error: 'responsavel_id é obrigatório.' });

  try {
    const u = await pool.query(
      `SELECT id, nome, tipo_usuario
       FROM usuarios
       WHERE id = $1 AND empresaid = $2`,
      [Number(responsavel_id), Number(empresaid)]
    );

    if (u.rowCount === 0) {
      return res.status(400).json({ error: 'Responsável inválido para esta empresa.' });
    }

    const tipo = u.rows[0].tipo_usuario;
    const allowed = ['equipa_tecnica', 'equipa_manutencao', 'equipe'];
    if (!allowed.includes(tipo)) {
      return res.status(400).json({
        error: 'O responsável escolhido não é técnico (equipa_tecnica/equipa_manutencao).',
      });
    }

    const msg = detalhes_fluxo?.trim?.() ? String(detalhes_fluxo).trim() : null;

    const result = await atualizarWorkflowNotificacao(id, empresaid, {
      status: 'em_diagnostico',
      etapa_atual: 'diagnostico',
      responsavel_id: Number(responsavel_id),
      detalhes_fluxo: msg,
    });

    if (result.rowCount === 0) return res.status(404).json({ error: 'Notificação não encontrada.' });

    await registarPassoFluxo({
      notificacaoId: id,
      empresaid,
      de_user_id: de_user_id ? Number(de_user_id) : null,
      de_tipo: de_tipo || 'admin',
      para_tipo: 'tecnico',
      status: 'em_diagnostico',
      etapa: 'diagnostico',
      mensagem: msg,
    });

    return res.status(200).json({
      message: 'Notificação enviada para técnico para diagnóstico.',
      notificacao: result.rows[0],
    });
  } catch (error) {
    console.error('Erro em /notificacoes/:id/enviar-tecnico-diagnostico:', error);
    return res.status(500).json({ error: 'Erro ao enviar notificação para diagnóstico.' });
  }
});

// 🧪 Técnico conclui DIAGNÓSTICO → devolver à ADMIN
app.post('/notificacoes/:id/diagnostico-admin', async (req, res) => {
  const { id } = req.params;
  const { empresaid, responsavel_id, detalhes_fluxo, de_user_id, de_tipo } = req.body;

  if (!empresaid) return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  if (!responsavel_id) return res.status(400).json({ error: 'responsavel_id é obrigatório.' });

  try {
    const u = await pool.query(
      `SELECT id, nome, tipo_usuario
       FROM usuarios
       WHERE id = $1 AND empresaid = $2`,
      [Number(responsavel_id), Number(empresaid)]
    );

    if (u.rowCount === 0) {
      return res.status(400).json({ error: 'Responsável inválido para esta empresa.' });
    }

    if (u.rows[0].tipo_usuario !== 'admin') {
      return res.status(400).json({ error: 'O responsável escolhido não é admin.' });
    }

    const msg = detalhes_fluxo?.trim?.() ? String(detalhes_fluxo).trim() : null;

    const result = await atualizarWorkflowNotificacao(id, empresaid, {
      status: 'diagnostico_concluido',
      etapa_atual: 'admin',
      responsavel_id: Number(responsavel_id), // ✅ fix Modelo B
      detalhes_fluxo: msg,
    });

    if (result.rowCount === 0) return res.status(404).json({ error: 'Notificação não encontrada.' });

    await registarPassoFluxo({
      notificacaoId: id,
      empresaid,
      de_user_id: de_user_id ? Number(de_user_id) : null,
      de_tipo: de_tipo || 'equipa_tecnica',
      para_tipo: 'admin',
      status: 'diagnostico_concluido',
      etapa: 'admin',
      mensagem: msg,
    });

    return res.status(200).json({
      message: 'Diagnóstico concluído e devolvido à Administração.',
      notificacao: result.rows[0],
    });
  } catch (error) {
    console.error('Erro em /notificacoes/:id/diagnostico-admin:', error);
    return res.status(500).json({ error: 'Erro ao marcar diagnóstico concluído (admin).' });
  }
});

// 🧪 Técnico conclui DIAGNÓSTICO → enviar para ORÇAMENTAÇÃO
app.post('/notificacoes/:id/diagnostico-orcamento', async (req, res) => {
  const { id } = req.params;
  const { empresaid, responsavel_id, detalhes_fluxo, de_user_id, de_tipo } = req.body;

  if (!empresaid) return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  if (!responsavel_id) return res.status(400).json({ error: 'responsavel_id é obrigatório.' });

  try {
    // validar que é orçamentação
    const u = await pool.query(
      `SELECT id, tipo_usuario FROM usuarios WHERE id = $1 AND empresaid = $2`,
      [Number(responsavel_id), Number(empresaid)]
    );

    if (u.rowCount === 0) {
      return res.status(400).json({ error: 'Responsável inválido para esta empresa.' });
    }
    if (u.rows[0].tipo_usuario !== 'orcamentacao') {
      return res.status(400).json({ error: 'O responsável escolhido não é de Orçamentação.' });
    }

    const result = await atualizarWorkflowNotificacao(id, empresaid, {
      status: 'aguardar_orcamento',
      etapa_atual: 'orcamento',
      em_garantia: false,
      responsavel_id: Number(responsavel_id), // ✅ aqui está o fix
      detalhes_fluxo: detalhes_fluxo || null,
    });

    if (result.rowCount === 0) return res.status(404).json({ error: 'Notificação não encontrada.' });

    await registarPassoFluxo({
      notificacaoId: id,
      empresaid,
      de_user_id: de_user_id ? Number(de_user_id) : null,
      de_tipo: de_tipo || 'equipa_tecnica',
      para_tipo: 'orcamentacao',
      status: 'aguardar_orcamento',
      etapa: 'orcamento',
      mensagem: detalhes_fluxo?.trim() || null,
    });

    return res.status(200).json({
      message: 'Diagnóstico concluído e notificação enviada para Orçamentação.',
      notificacao: result.rows[0],
    });
  } catch (error) {
    console.error('Erro em /notificacoes/:id/diagnostico-orcamento:', error);
    return res.status(500).json({ error: 'Erro ao marcar diagnóstico concluído (orçamentação).' });
  }
});

// 🚐 ADMIN → Enviar para TÉCNICO (garantia) (Modelo B: atribui responsavel_id + histórico)
app.post('/notificacoes/:id/enviar-tecnico-garantia', async (req, res) => {
  console.log('📨 BODY:', req.body);

  const { id } = req.params;
  const { empresaid, responsavel_id, detalhes_fluxo, de_user_id, de_tipo } = req.body;

  if (!empresaid) {
    return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  }

  if (!responsavel_id) {
    return res.status(400).json({ error: 'responsavel_id é obrigatório.' });
  }

  try {
    // ✅ validar responsável (existe + pertence à empresa + é técnico)
    const u = await pool.query(
      `SELECT id, nome, tipo_usuario
       FROM usuarios
       WHERE id = $1 AND empresaid = $2`,
      [Number(responsavel_id), Number(empresaid)]
    );

    if (u.rowCount === 0) {
      return res.status(400).json({ error: 'Responsável inválido para esta empresa.' });
    }

    const tipo = u.rows[0].tipo_usuario;
    const allowed = ['equipa_tecnica', 'equipa_manutencao', 'equipe'];
    if (!allowed.includes(tipo)) {
      return res.status(400).json({
        error: 'O responsável escolhido não é técnico (equipa_tecnica/equipa_manutencao).',
      });
    }

    const msg =
      detalhes_fluxo && String(detalhes_fluxo).trim().length > 0
        ? String(detalhes_fluxo).trim()
        : null;

    const result = await atualizarWorkflowNotificacao(id, empresaid, {
      status: 'em_resolucao',
      etapa_atual: 'tecnico',
      em_garantia: true,
      responsavel_id: Number(responsavel_id), // ✅ Modelo B
      detalhes_fluxo: msg,
    });

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada.' });
    }

    await registarPassoFluxo({
      notificacaoId: id,
      empresaid,
      de_user_id: de_user_id ? Number(de_user_id) : null, // ✅ agora vem do frontend
      de_tipo: de_tipo || 'admin',
      para_tipo: 'tecnico',
      status: 'em_resolucao',
      etapa: 'tecnico',
      mensagem: msg,
    });

    return res.status(200).json({
      message: 'Notificação enviada para Técnico (garantia).',
      notificacao: result.rows[0],
    });
  } catch (error) {
    console.error('Erro em /notificacoes/:id/enviar-tecnico-garantia:', error);
    return res.status(500).json({ error: 'Erro ao enviar para técnico (garantia).' });
  }
});

// 🔵 Admin envia para Orçamentação (Modelo B: atribui responsavel_id)
app.post('/notificacoes/:id/enviar-orcamento', async (req, res) => {
  console.log('📨 BODY:', req.body);
  const { id } = req.params;
  const { empresaid, responsavel_id, detalhes_fluxo, de_user_id, de_tipo } = req.body;

  if (!empresaid) {
    return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  }

  if (!responsavel_id) {
    return res.status(400).json({ error: 'responsavel_id é obrigatório.' });
  }

  try {
    const u = await pool.query(
      `SELECT id, nome, tipo_usuario
       FROM usuarios
       WHERE id = $1 AND empresaid = $2`,
      [Number(responsavel_id), Number(empresaid)]
    );

    if (u.rowCount === 0) {
      return res.status(400).json({ error: 'Responsável inválido para esta empresa.' });
    }

    if (u.rows[0].tipo_usuario !== 'orcamentacao') {
      return res.status(400).json({ error: 'O responsável escolhido não é de Orçamentação.' });
    }

    const msg =
      detalhes_fluxo && String(detalhes_fluxo).trim().length > 0
        ? String(detalhes_fluxo).trim()
        : null;

    const result = await atualizarWorkflowNotificacao(id, empresaid, {
      status: 'aguardar_orcamento',
      etapa_atual: 'orcamento',
      orcamento_obrigatorio: true,
      em_garantia: false,
      responsavel_id: Number(responsavel_id), // ✅ Modelo B
      detalhes_fluxo: msg,
    });

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada.' });
    }

    await registarPassoFluxo({
      notificacaoId: id,
      empresaid,
      de_user_id: de_user_id ? Number(de_user_id) : null,
      de_tipo: de_tipo || 'admin',
      para_tipo: 'orcamentacao',
      status: 'aguardar_orcamento',
      etapa: 'orcamento',
      mensagem: msg,
    });

    return res.status(200).json({
      message: 'Notificação enviada para orçamentação.',
      notificacao: result.rows[0],
    });
  } catch (error) {
    console.error('Erro em /notificacoes/:id/enviar-orcamento:', error);
    return res.status(500).json({ error: 'Erro ao enviar para orçamentação.' });
  }
});

// 📤 Orçamentação marca "Orçamento enviado ao cliente"
app.post('/notificacoes/:id/orcamento-enviado', async (req, res) => {
  const { id } = req.params;
  const {
    empresaid,
    detalhes_fluxo,
    valor_orcamento,
    referencia_orcamento,
    de_user_id,
    de_tipo,
  } = req.body;

  if (!empresaid) {
    return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  }

  try {
    let valorNumero = null;
    if (valor_orcamento !== undefined && valor_orcamento !== null && valor_orcamento !== '') {
      const limpo = String(valor_orcamento).replace(',', '.');
      const parsed = parseFloat(limpo);
      if (!isNaN(parsed)) valorNumero = parsed;
    }

    const msg =
      detalhes_fluxo && String(detalhes_fluxo).trim().length > 0
        ? String(detalhes_fluxo).trim()
        : null;

    const campos = {
      status: 'aguardar_resposta_cliente',
      etapa_atual: 'orcamento',
      detalhes_fluxo: msg,
      referencia_orcamento:
        referencia_orcamento && String(referencia_orcamento).trim().length > 0
          ? String(referencia_orcamento).trim()
          : null,
    };

    if (valorNumero !== null) campos.valor_orcamento = valorNumero;

    const result = await atualizarWorkflowNotificacao(id, empresaid, campos);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada.' });
    }

    await registarPassoFluxo({
      notificacaoId: id,
      empresaid,
      de_user_id: de_user_id ? Number(de_user_id) : null,
      de_tipo: de_tipo || 'orcamentacao',
      para_tipo: 'cliente',
      status: 'aguardar_resposta_cliente',
      etapa: 'orcamento',
      mensagem: msg,
    });

    return res.status(200).json({
      message: 'Orçamento marcado como enviado ao cliente.',
      notificacao: result.rows[0],
    });
  } catch (error) {
    console.error('Erro em /notificacoes/:id/orcamento-enviado:', error);
    return res.status(500).json({ error: 'Erro ao marcar orçamento como enviado.' });
  }
});

// ⏳ Orçamentação marca "Aguardar resposta do fornecedor (falta valor)"
app.post('/notificacoes/:id/orcamento-aguardar-fornecedor', async (req, res) => {
  const { id } = req.params;
  const { empresaid, detalhes_fluxo, de_user_id, de_tipo } = req.body;

  if (!empresaid) {
    return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  }

  try {
    const msg =
      detalhes_fluxo && String(detalhes_fluxo).trim().length > 0
        ? String(detalhes_fluxo).trim()
        : null;

    const result = await atualizarWorkflowNotificacao(id, empresaid, {
      status: 'aguardar_resposta_fornecedor',
      etapa_atual: 'orcamento',
      detalhes_fluxo: msg,
    });

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada.' });
    }

    await registarPassoFluxo({
      notificacaoId: id,
      empresaid,
      de_user_id: de_user_id ? Number(de_user_id) : null,
      de_tipo: de_tipo || 'orcamentacao',
      para_tipo: 'fornecedor',
      status: 'aguardar_resposta_fornecedor',
      etapa: 'orcamento',
      mensagem: msg,
    });

    return res.status(200).json({
      message: 'Notificação marcada como a aguardar resposta do fornecedor.',
      notificacao: result.rows[0],
    });
  } catch (error) {
    console.error('Erro em /notificacoes/:id/orcamento-aguardar-fornecedor:', error);
    return res.status(500).json({
      error: 'Erro ao marcar como a aguardar resposta do fornecedor.',
    });
  }
});

// 🟠 Marcar orçamento APROVADO (Modelo B: escolhe e atribui o Técnico)
app.post('/notificacoes/:id/orcamento-aprovado', async (req, res) => {
  const { id } = req.params;

  console.log('🟠 /orcamento-aprovado body:', {
    id,
    empresaid: req.body.empresaid,
    responsavel_id: req.body.responsavel_id,
    detalhes_fluxo: req.body.detalhes_fluxo,
    de_user_id: req.body.de_user_id,
    de_tipo: req.body.de_tipo,
  });

  const {
    empresaid,
    responsavel_id,
    detalhes_fluxo,
    de_user_id,
    de_tipo,
    valor_orcamento,
    referencia_orcamento,
  } = req.body;

  if (!empresaid) {
    console.warn('400: empresaid em falta', req.body);
    return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  }

  if (!responsavel_id) {
    console.warn('400: responsavel_id em falta', req.body);
    return res.status(400).json({
      error: 'responsavel_id (técnico) é obrigatório ao aprovar orçamento.',
    });
  }

  try {
    const u = await pool.query(
      `SELECT id, nome, tipo_usuario
       FROM usuarios
       WHERE id = $1 AND empresaid = $2`,
      [Number(responsavel_id), Number(empresaid)]
    );

    if (u.rowCount === 0) {
      return res.status(400).json({ error: 'Responsável inválido para esta empresa.' });
    }

    const tipo = u.rows[0].tipo_usuario;
    const allowed = ['equipa_tecnica', 'equipa_manutencao', 'equipe']; // ok
    if (!allowed.includes(tipo)) {
      return res.status(400).json({
        error: `O responsável escolhido não é técnico. tipo_usuario=${tipo}`,
      });
    }

    let valorNumero = null;
    if (valor_orcamento !== undefined && valor_orcamento !== null && valor_orcamento !== '') {
      const limpo = String(valor_orcamento).replace(',', '.');
      const parsed = parseFloat(limpo);
      if (!isNaN(parsed)) valorNumero = parsed;
    }

    const msg =
      detalhes_fluxo && String(detalhes_fluxo).trim().length > 0
        ? String(detalhes_fluxo).trim()
        : null;

    const campos = {
      status: 'orcamento_aprovado',
      etapa_atual: 'tecnico',
      orcamento_aprovado: true,
      responsavel_id: Number(responsavel_id),
      detalhes_fluxo: msg,
    };

    if (valorNumero !== null) campos.valor_orcamento = valorNumero;

    if (referencia_orcamento !== undefined) {
      campos.referencia_orcamento =
        referencia_orcamento && String(referencia_orcamento).trim().length > 0
          ? String(referencia_orcamento).trim()
          : null;
    }

    const result = await atualizarWorkflowNotificacao(id, empresaid, campos);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada.' });
    }

    await registarPassoFluxo({
      notificacaoId: id,
      empresaid,
      de_user_id: de_user_id ? Number(de_user_id) : null,
      de_tipo: de_tipo || 'orcamentacao',
      para_tipo: 'tecnico',
      status: 'orcamento_aprovado',
      etapa: 'tecnico',
      mensagem: msg,
    });

    return res.status(200).json({
      message: 'Orçamento aprovado e enviado para Técnico.',
      notificacao: result.rows[0],
    });
  } catch (error) {
    console.error('🔥 ERRO /orcamento-aprovado:', error);
    console.error('🔥 STACK:', error?.stack);
    return res.status(500).json({
      error: 'Erro ao marcar orçamento aprovado.',
      detalhe: String(error?.message || error),
    });
  }
});

// ❌ Orçamentação → Orçamento recusado → devolve à ADMIN (Modelo B: atribui responsavel_id da Admin)
app.post('/notificacoes/:id/orcamento-recusado', async (req, res) => {
  const { id } = req.params;
  const { empresaid, detalhes_fluxo, de_user_id, de_tipo, responsavel_id } = req.body;

  if (!empresaid) {
    return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  }

  // ✅ Modelo B: volta à Admin, então tem de ficar atribuído a um Admin
  const adminIdFinal = responsavel_id ?? de_user_id;
  if (!adminIdFinal) {
    return res.status(400).json({
      error: 'responsavel_id (admin) ou de_user_id é obrigatório ao devolver à Administração.',
    });
  }

  try {
    // ✅ validar se adminIdFinal é mesmo admin e da empresa
    const u = await pool.query(
      `SELECT id, nome, tipo_usuario
       FROM usuarios
       WHERE id = $1 AND empresaid = $2`,
      [Number(adminIdFinal), Number(empresaid)]
    );

    if (u.rowCount === 0) {
      return res.status(400).json({ error: 'Responsável admin inválido para esta empresa.' });
    }

    if (u.rows[0].tipo_usuario !== 'admin') {
      return res.status(400).json({ error: 'O responsável escolhido não é admin.' });
    }

    const msg =
      detalhes_fluxo && String(detalhes_fluxo).trim().length > 0
        ? String(detalhes_fluxo).trim()
        : 'Orçamento recusado pelo cliente.';

    const result = await atualizarWorkflowNotificacao(id, empresaid, {
      status: 'orcamento_recusado',
      etapa_atual: 'admin',
      orcamento_aprovado: false,
      responsavel_id: Number(adminIdFinal), // ✅ Modelo B (fix)
      detalhes_fluxo: msg,
    });

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada.' });
    }

    await registarPassoFluxo({
      notificacaoId: id,
      empresaid,
      de_user_id: de_user_id ? Number(de_user_id) : null,
      de_tipo: de_tipo || 'orcamentacao',
      para_tipo: 'admin',
      status: 'orcamento_recusado',
      etapa: 'admin',
      mensagem: msg,
    });

    return res.status(200).json({
      message: 'Orçamento recusado e devolvido à Administração.',
      notificacao: result.rows[0],
    });
  } catch (error) {
    console.error('Erro em /notificacoes/:id/orcamento-recusado:', error);
    return res.status(500).json({ error: 'Erro ao marcar orçamento recusado.' });
  }
});

// 🟡 Técnico marca reparação concluída (Modelo B: atribui responsável de Contabilidade)
app.post('/notificacoes/:id/reparado', async (req, res) => {
  const { id } = req.params;
  const { empresaid, tecnico_id, responsavel_id, detalhes_fluxo, de_user_id, de_tipo } = req.body;

  if (!empresaid) {
    return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  }

  if (!responsavel_id) {
    return res.status(400).json({
      error: 'responsavel_id é obrigatório para enviar para Contabilidade.',
    });
  }

  try {
    // 🔹 Saber se é garantia
    const q = await pool.query(
      'SELECT em_garantia FROM notificacoes WHERE id = $1 AND empresaid = $2',
      [Number(id), Number(empresaid)]
    );

    if (q.rowCount === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada.' });
    }

    // ✅ Validar responsável contabilidade
    const u = await pool.query(
      `SELECT id, nome, tipo_usuario
       FROM usuarios
       WHERE id = $1 AND empresaid = $2`,
      [Number(responsavel_id), Number(empresaid)]
    );

    if (u.rowCount === 0) {
      return res.status(400).json({ error: 'Responsável inválido para esta empresa.' });
    }

    if (u.rows[0].tipo_usuario !== 'contabilidade') {
      return res.status(400).json({
        error: 'O responsável escolhido não é do tipo contabilidade.',
      });
    }

    const msg =
      detalhes_fluxo && String(detalhes_fluxo).trim().length > 0
        ? String(detalhes_fluxo).trim()
        : null;

    const campos = {
      status: 'reparado',
      etapa_atual: 'contabilidade',               // ✅ etapa consistente
      responsavel_id: Number(responsavel_id),     // ✅ Modelo B
      detalhes_fluxo: msg,
    };

    // Se quiseres manter tecnico_id na notificação
    if (tecnico_id != null) campos.tecnico_id = Number(tecnico_id);

    const result = await atualizarWorkflowNotificacao(id, empresaid, campos);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada.' });
    }

    await registarPassoFluxo({
      notificacaoId: id,
      empresaid,
      de_user_id: de_user_id ? Number(de_user_id) : (tecnico_id ? Number(tecnico_id) : null),
      de_tipo: de_tipo || 'tecnico',
      para_tipo: 'contabilidade',
      status: 'reparado',
      etapa: 'contabilidade',
      mensagem: msg,
    });

    return res.status(200).json({
      message: 'Reparação marcada como concluída e enviada para Contabilidade.',
      notificacao: result.rows[0],
    });
  } catch (error) {
    console.error('Erro em /notificacoes/:id/reparado:', error);
    return res.status(500).json({ error: 'Erro ao marcar reparação.' });
  }
});

// 🟢 CONTABILIDADE → Serviço em garantia / concluir processo (Modelo B)
app.post('/notificacoes/:id/concluir-garantia', async (req, res) => {
  const { id } = req.params;
  const { empresaid, responsavel_id, detalhes_fluxo, de_user_id, de_tipo } = req.body;

  if (!empresaid) {
    return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  }

  try {
    // 1) Buscar estado atual (garantia + responsavel atual)
    const chk = await pool.query(
      'SELECT em_garantia, responsavel_id FROM notificacoes WHERE id = $1 AND empresaid = $2',
      [Number(id), Number(empresaid)]
    );

    if (chk.rowCount === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada.' });
    }

    if (!chk.rows[0].em_garantia) {
      return res.status(400).json({
        error: 'Esta notificação NÃO está marcada como garantia. Use faturação normal.',
      });
    }

    // 2) Resolver responsável: body > BD
    const responsavelFinal = responsavel_id ? Number(responsavel_id) : chk.rows[0].responsavel_id;

    if (!responsavelFinal) {
      return res.status(400).json({ error: 'responsavel_id em falta (não existe responsável atual na notificação).' });
    }

    // 3) Validar que é contabilidade
    const u = await pool.query(
      `SELECT id, nome, tipo_usuario
       FROM usuarios
       WHERE id = $1 AND empresaid = $2`,
      [Number(responsavelFinal), Number(empresaid)]
    );

    if (u.rowCount === 0) {
      return res.status(400).json({ error: 'Responsável inválido para esta empresa.' });
    }

    if (u.rows[0].tipo_usuario !== 'contabilidade') {
      return res.status(400).json({
        error: 'O responsável escolhido (ou atual) não é do tipo contabilidade.',
      });
    }

    const msg =
      detalhes_fluxo && String(detalhes_fluxo).trim().length > 0
        ? String(detalhes_fluxo).trim()
        : null;

    const campos = {
      status: 'concluido_garantia',
      etapa_atual: 'concluido',
      fatura_paga: false,
      valor_servico_extra: null,
      responsavel_id: Number(responsavelFinal),
      detalhes_fluxo: msg,
    };

    const result = await atualizarWorkflowNotificacao(id, empresaid, campos);

    await registarPassoFluxo({
      notificacaoId: id,
      empresaid,
      de_user_id: de_user_id ? Number(de_user_id) : null,
      de_tipo: de_tipo || 'contabilidade',
      para_tipo: 'concluido',
      status: 'concluido_garantia',
      etapa: 'concluido',
      mensagem: msg || 'Serviço concluído em garantia.',
    });

    return res.status(200).json({
      message: 'Processo concluído em garantia.',
      notificacao: result.rows[0],
    });
  } catch (error) {
    console.error('Erro em /notificacoes/:id/concluir-garantia:', error);
    return res.status(500).json({ error: 'Erro ao concluir notificação em garantia.' });
  }
});

// ⏳ Contabilidade marca "Aguardar os dados do cliente para faturar" (Modelo B)
app.post('/notificacoes/:id/contabilidade-aguardar-dados-cliente', async (req, res) => {
  const { id } = req.params;
  const { empresaid, responsavel_id, detalhes_fluxo, de_user_id, de_tipo } = req.body;

  if (!empresaid) {
    return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  }

  try {
    // 1) Buscar estado atual (garantia + responsavel atual)
    const chk = await pool.query(
      'SELECT em_garantia, responsavel_id FROM notificacoes WHERE id = $1 AND empresaid = $2',
      [Number(id), Number(empresaid)]
    );

    if (chk.rowCount === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada.' });
    }

    if (chk.rows[0].em_garantia) {
      return res.status(400).json({
        error: 'Esta notificação está marcada como GARANTIA. Não deve faturar.',
      });
    }

    // 2) Resolver responsável: body > BD
    const responsavelFinal = responsavel_id ? Number(responsavel_id) : chk.rows[0].responsavel_id;

    if (!responsavelFinal) {
      return res.status(400).json({ error: 'responsavel_id em falta (não existe responsável atual na notificação).' });
    }

    // 3) Validar que é contabilidade
    const u = await pool.query(
      `SELECT id, nome, tipo_usuario
       FROM usuarios
       WHERE id = $1 AND empresaid = $2`,
      [Number(responsavelFinal), Number(empresaid)]
    );

    if (u.rowCount === 0) {
      return res.status(400).json({ error: 'Responsável inválido para esta empresa.' });
    }

    if (u.rows[0].tipo_usuario !== 'contabilidade') {
      return res.status(400).json({
        error: 'O responsável escolhido (ou atual) não é do tipo contabilidade.',
      });
    }

    const detalhe =
      detalhes_fluxo && String(detalhes_fluxo).trim().length > 0
        ? String(detalhes_fluxo).trim()
        : null;

    const campos = {
      status: 'aguardar_dados_cliente_fatura',
      etapa_atual: 'aguardar_faturacao',
      detalhes_fluxo: detalhe,
      fatura_paga: false,
      responsavel_id: Number(responsavelFinal),
    };

    const result = await atualizarWorkflowNotificacao(id, empresaid, campos);

    await registarPassoFluxo({
      notificacaoId: id,
      empresaid,
      de_user_id: de_user_id ? Number(de_user_id) : null,
      de_tipo: de_tipo || 'contabilidade',
      para_tipo: 'contabilidade',
      status: 'aguardar_dados_cliente_fatura',
      etapa: 'aguardar_faturacao',
      mensagem: detalhe,
    });

    return res.status(200).json({
      message: 'Marcado como a aguardar dados do cliente para faturar.',
      notificacao: result.rows[0],
    });
  } catch (error) {
    console.error('Erro em /notificacoes/:id/contabilidade-aguardar-dados-cliente:', error);
    return res.status(500).json({ error: 'Erro ao marcar a aguardar dados do cliente.' });
  }
});

// 💶 Contabilidade marca fatura ENVIADA
app.post('/notificacoes/:id/fatura-enviada', async (req, res) => {
  const { id } = req.params;
  const { empresaid, responsavel_id, detalhes_fluxo, de_user_id, de_tipo } = req.body;

  if (!empresaid) return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  if (!responsavel_id) return res.status(400).json({ error: 'responsavel_id é obrigatório.' });

  try {
    // ✅ validar responsável contabilidade
    const u = await pool.query(
      `SELECT id, tipo_usuario FROM usuarios WHERE id = $1 AND empresaid = $2`,
      [Number(responsavel_id), Number(empresaid)]
    );
    if (u.rowCount === 0) return res.status(400).json({ error: 'Responsável inválido para esta empresa.' });
    if (u.rows[0].tipo_usuario !== 'contabilidade') {
      return res.status(400).json({ error: 'O responsável escolhido não é do tipo contabilidade.' });
    }

    const msg =
      detalhes_fluxo && String(detalhes_fluxo).trim().length > 0
        ? String(detalhes_fluxo).trim()
        : null;

    const result = await atualizarWorkflowNotificacao(id, empresaid, {
      status: 'fatura_enviada',
      etapa_atual: 'aguardar_pagamento',
      fatura_paga: false,
      responsavel_id: Number(responsavel_id), // ✅ Modelo B
      detalhes_fluxo: msg,
    });

    if (result.rowCount === 0) return res.status(404).json({ error: 'Notificação não encontrada.' });

    await registarPassoFluxo({
      notificacaoId: id,
      empresaid,
      de_user_id: de_user_id ? Number(de_user_id) : null,
      de_tipo: de_tipo || 'contabilidade',
      para_tipo: 'contabilidade',
      status: 'fatura_enviada',
      etapa: 'aguardar_pagamento',
      mensagem: msg,
    });

    return res.status(200).json({
      message: 'Fatura marcada como enviada.',
      notificacao: result.rows[0],
    });
  } catch (error) {
    console.error('Erro em /notificacoes/:id/fatura-enviada:', error);
    return res.status(500).json({ error: 'Erro ao marcar fatura enviada.' });
  }
});

// ✅ Pagamento confirmado — processo concluído
app.post('/notificacoes/:id/pago', async (req, res) => {
  const { id } = req.params;
  const { empresaid, responsavel_id, detalhes_fluxo, de_user_id, de_tipo } = req.body;

  if (!empresaid) return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  if (!responsavel_id) return res.status(400).json({ error: 'responsavel_id é obrigatório.' });

  try {
    const u = await pool.query(
      `SELECT id, tipo_usuario FROM usuarios WHERE id = $1 AND empresaid = $2`,
      [Number(responsavel_id), Number(empresaid)]
    );
    if (u.rowCount === 0) return res.status(400).json({ error: 'Responsável inválido para esta empresa.' });
    if (u.rows[0].tipo_usuario !== 'contabilidade') {
      return res.status(400).json({ error: 'O responsável escolhido não é do tipo contabilidade.' });
    }

    const msg =
      detalhes_fluxo && String(detalhes_fluxo).trim().length > 0
        ? String(detalhes_fluxo).trim()
        : null;

    const result = await atualizarWorkflowNotificacao(id, empresaid, {
      status: 'pago',
      etapa_atual: 'concluido',
      fatura_paga: true,
      responsavel_id: Number(responsavel_id),
      detalhes_fluxo: msg,
      data_resolucao: new Date(), // opcional; só se tiveres a coluna
    });

    if (result.rowCount === 0) return res.status(404).json({ error: 'Notificação não encontrada.' });

    await registarPassoFluxo({
      notificacaoId: id,
      empresaid,
      de_user_id: de_user_id ? Number(de_user_id) : null,
      de_tipo: de_tipo || 'contabilidade',
      para_tipo: 'concluido',
      status: 'pago',
      etapa: 'concluido',
      mensagem: msg,
    });

    return res.status(200).json({
      message: 'Pagamento confirmado e notificação concluída.',
      notificacao: result.rows[0],
    });
  } catch (error) {
    console.error('Erro em /notificacoes/:id/pago:', error);
    return res.status(500).json({ error: 'Erro ao marcar como pago.' });
  }
});

// 📜 Histórico de fluxo de uma notificação
app.get('/notificacoes/:id/historico', async (req, res) => {
  const { id } = req.params;
  const { empresaid } = req.query;

  if (!empresaid) {
    return res
      .status(400)
      .json({ error: 'O parâmetro empresaid é obrigatório.' });
  }

  try {
    const query = `
      SELECT 
        h.id,
        h.de_user_id,
        h.de_tipo,
        h.para_tipo,
        h.status,
        h.etapa,
        h.mensagem,
        h.created_at,
        u.nome AS de_nome
      FROM notificacoes_fluxo h
      LEFT JOIN usuarios u ON u.id = h.de_user_id
      WHERE h.notificacao_id = $1
        AND h.empresaid = $2
      ORDER BY h.created_at ASC;
    `;

    const values = [Number(id), Number(empresaid)];
    const result = await pool.query(query, values);

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('❌ Erro ao buscar histórico da notificação:', error);
    return res.status(500).json({ error: 'Erro ao buscar histórico.' });
  }
});

async function lancarMensalidadesMes(mesReferencia) {
  if (!/^\d{4}-\d{2}$/.test(mesReferencia)) {
    throw new Error('Mês de referência inválido. Use YYYY-MM.');
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const clientesAtivosResult = await client.query(`
      SELECT DISTINCT
        c.id AS cliente_id,
        c.empresaid,
        COALESCE(c.valor_manutencao, 0) AS valor_manutencao
      FROM clientes c
      INNER JOIN associados a
        ON a.clienteid = c.id
        AND a.empresaid = c.empresaid
      WHERE COALESCE(c.valor_manutencao, 0) > 0;
    `);

    let criados = 0;
    let atualizados = 0;

    for (const clienteAtual of clientesAtivosResult.rows) {
      const resultado = await client.query(
        `
          INSERT INTO pagamentos_clientes (
            cliente_id,
            empresaid,
            mes_referencia,
            valor_manutencao,
            valor_extra,
            valor_pago,
            estado,
            observacoes,
            data_pagamento,
            updated_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            0,
            0,
            'pendente',
            NULL,
            NULL,
            NOW()
          )
          ON CONFLICT (cliente_id, empresaid, mes_referencia)
          DO UPDATE SET
            valor_manutencao = EXCLUDED.valor_manutencao,
            updated_at = NOW()
          RETURNING (xmax = 0) AS criado;
        `,
        [
          clienteAtual.cliente_id,
          clienteAtual.empresaid,
          mesReferencia,
          Number(clienteAtual.valor_manutencao || 0),
        ]
      );

      if (resultado.rows[0]?.criado) {
        criados += 1;
      } else {
        atualizados += 1;
      }
    }

    await client.query('COMMIT');

    return {
      mes_referencia: mesReferencia,
      clientes_processados: clientesAtivosResult.rows.length,
      registos_criados: criados,
      registos_atualizados: atualizados,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

app.post('/conta-corrente-clientes/lancar-mensalidades', async (req, res) => {
  const { mes_referencia } = req.body;

  if (!mes_referencia) {
    return res.status(400).json({
      error: 'mes_referencia é obrigatório.',
    });
  }

  try {
    const resultado = await lancarMensalidadesMes(mes_referencia);

    return res.status(200).json({
      message: 'Mensalidades lançadas com sucesso.',
      resultado,
    });
  } catch (error) {
    console.error('Erro ao lançar mensalidades:', error);

    return res.status(500).json({
      error: 'Erro ao lançar mensalidades.',
      detalhes: error.message,
    });
  }
});

cron.schedule('55 23 * * 0', async () => {
  console.log('🕒 Iniciando reset automático semanal...');

  try {
    const empresasResult = await pool.query(`
      SELECT id FROM empresas
    `);

    for (const empresa of empresasResult.rows) {
      try {
        console.log(`🔄 Reset empresa ${empresa.id}`);
        await resetStatusEmpresa(empresa.id);
      } catch (err) {
        console.error(`❌ Erro reset empresa ${empresa.id}:`, err.message);
      }
    }

    console.log('✅ Reset automático concluído.');
  } catch (error) {
    console.error('❌ Erro no cron semanal:', error);
  }
}, {
  timezone: 'Europe/Lisbon'
});

cron.schedule(
  '5 0 1 * *',
  async () => {
    const mesReferencia = moment().format('YYYY-MM');

    console.log(
      `📅 Iniciando lançamento automático das mensalidades de ${mesReferencia}...`
    );

    try {
      const resultado = await lancarMensalidadesMes(mesReferencia);

      console.log('✅ Mensalidades lançadas com sucesso:', resultado);
    } catch (error) {
      console.error(
        '❌ Erro no lançamento automático das mensalidades:',
        error
      );
    }
  },
  {
    timezone: 'Europe/Lisbon',
  }
);

// Inicia o servidor
  app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
