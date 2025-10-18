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

// Middlewares
app.use(cors());
app.use(bodyParser.json());

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
      (empresaid, nome, morada, localidade, codigo_postal, google_maps, email, telefone, info_acesso, comprimento, largura, profundidade_media, volume, tanque_compensacao, cobertura, bomba_calor, equipamentos_especiais, ultima_substituicao, valor_manutencao, periodicidade, condicionantes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
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
      moment(ultima_substituicao).format('YYYY-MM-DD'),
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
    const result = await pool.query('SELECT id, nome FROM empresas WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa não encontrada.' });
    }

    res.json(result.rows[0]); // 🔹 Retorna apenas o primeiro resultado
  } catch (error) {
    console.error('Erro ao buscar empresa:', error);
    res.status(500).json({ error: 'Erro ao buscar empresa.' });
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
          tanque_compensacao = $13, cobertura = $14, bomba_calor = $15, equipamentos_especiais = $16, 
          ultima_substituicao = $17, valor_manutencao = $18, periodicidade = $19, condicionantes = $20, updated_at = NOW()
      WHERE id = $21 AND empresaid = $22
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
      moment(ultima_substituicao).format('YYYY-MM-DD'),
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
          c.ultima_substituicao,
          COALESCE(m.status, 'pendente') AS status
        FROM associados a
        JOIN clientes c ON a.clienteId = c.id
        LEFT JOIN manutencoes m 
          ON m.cliente_id = c.id 
          AND m.dia_semana = $2
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
      SELECT 
        a.diasemana,
        COUNT(DISTINCT a.clienteid) AS total,
        COALESCE(SUM(CASE WHEN m.status = 'concluida' THEN 1 ELSE 0 END), 0) AS concluidas,
        COALESCE(SUM(CASE WHEN m.status = 'nao_concluida' THEN 1 ELSE 0 END), 0) AS nao_concluidas
      FROM associados a
      INNER JOIN equipes e ON a.equipeid = e.id
      LEFT JOIN manutencoes m ON a.clienteid = m.cliente_id 
                              AND a.equipeid = m.equipe_id 
                              AND a.diasemana = m.dia_semana
      WHERE a.equipeid = $1 AND e.empresaid = $2
      GROUP BY a.diasemana;
    `;

    const values = [equipeId, empresaid];
    const result = await pool.query(query, values);

    // 🔹 Garante que a resposta é sempre um array, mesmo se não houver dados
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
  const { nome_empresa, email, senha, telefone, endereco } = req.body;

  console.log('Iniciando registro:');
  console.log('Dados recebidos:', { nome_empresa, email, telefone, endereco });

  // Validação dos campos obrigatórios
  if (!nome_empresa || !email || !senha || !telefone || !endereco) {
    console.error('Erro: Campos obrigatórios ausentes.');
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  try {
    // Verifica se o email já existe na tabela empresas
    console.log('Verificando email duplicado...');
    const emailCheckQuery = 'SELECT id FROM empresas WHERE email = $1';
    const emailCheckResult = await pool.query(emailCheckQuery, [email]);

    if (emailCheckResult.rows.length > 0) {
      console.warn('Email já registrado:', email);

      // Verificar se há um registro incompleto
      const empresaId = emailCheckResult.rows[0].id;
      const usuarioCheckQuery = 'SELECT id FROM usuarios WHERE empresaid = $1';
      const usuarioCheckResult = await pool.query(usuarioCheckQuery, [empresaId]);

      if (usuarioCheckResult.rows.length === 0) {
        // Caso não haja usuário associado, remova o registro incompleto
        console.log('Removendo registro incompleto da empresa:', empresaId);
        await pool.query('DELETE FROM empresas WHERE id = $1', [empresaId]);
      } else {
        return res.status(400).json({ error: 'Este email já está registrado.' });
      }
    }

    // Query para inserir a empresa (ID gerado automaticamente pelo banco)
    const empresaQuery = `
      INSERT INTO empresas (nome, email, telefone, endereco)
      VALUES ($1, $2, $3, $4)
      RETURNING id;
    `;
    const empresaValues = [nome_empresa, email, telefone, endereco];

    console.log('Executando query para inserir empresa...');
    const empresaResult = await pool.query(empresaQuery, empresaValues);
    const createdEmpresaId = empresaResult.rows[0].id;
    console.log('Empresa inserida com sucesso:', createdEmpresaId);

    // Criptografa a senha do administrador
    console.log('Criptografando senha...');
    const hashedPassword = await bcrypt.hash(senha, 10);

    // Query para inserir o usuário administrador
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

    console.log('Executando query para inserir usuário...');
    const usuarioResult = await pool.query(usuarioQuery, usuarioValues);
    console.log('Usuário inserido com sucesso:', usuarioResult.rows[0]);

    // Envia o email de confirmação
    //const confirmationLink = `${process.env.APP_URL}/confirmar-email?token=${usuarioResult.rows[0].token}`;
    //await transporter.sendMail({
      //from: process.env.EMAIL_FROM,
      //to: email,
      //subject: 'Confirme seu email - GES-POOL',
      //html: `<p>Olá, ${nome_empresa}!</p><p>Clique no link abaixo para confirmar seu email:</p><a href="${confirmationLink}">${confirmationLink}</a>`,
    //});

    //console.log('Email de confirmação enviado com sucesso.');
    res.status(201).json({ message: 'Registo realizado com sucesso!' });
  } catch (error) {
    console.error('Erro ao registrar empresa e usuário:', error);

    // Trata o erro de email duplicado
    if (error.code === '23505') {
      console.warn('Erro: Email duplicado.');
      return res.status(400).json({ error: 'Email já está registrado.' });
    }

    res.status(500).json({ error: 'Erro ao registrar empresa e usuário.' });
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


//Este endpoint verificará as credenciais do usuário e retornará o tipo de usuário
app.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  try {
    const query = `
      SELECT 
        u.id AS userId, 
        u.nome, 
        u.equipeid AS equipeId, 
        u.senha, 
        u.empresaid 
      FROM usuarios u 
      WHERE u.email = $1;
    `;

    const result = await pool.query(query, [email]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(senha, user.senha);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciais inválidas.' });
    }

    if (!user.empresaid) {
      return res.status(400).json({ error: 'Usuário não associado a uma empresa válida.' });
    }

    // Determinar o tipo de usuário com base em equipeId
    const tipoUsuario = user.equipeid ? 'equipe' : 'admin';

    const token = jwt.sign(
      { id: user.userId, tipo_usuario: tipoUsuario, empresaid: user.empresaid },
      process.env.JWT_SECRET || 'secreto', // Use variável de ambiente
      { expiresIn: '1h' }
    );

    res.json({
      token,
      user: {
        id: user.userId,
        nome: user.nome,
        tipo_usuario: tipoUsuario, // Calculado dinamicamente
        equipeId: user.equipeid,
        empresaid: user.empresaid,
      },
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ error: 'Erro ao fazer login.' });
  }
});


app.post('/usuarios', async (req, res) => {
  const { nome, email, senha, equipeid, empresaid } = req.body;

  if (!nome || !email || !senha || !empresaid) {
    return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser fornecidos.' });
  }

  // Determina o tipo de usuário com base no valor de equipeid
  const tipo_usuario = equipeid ? 'equipe' : 'admin';

  // Remova caracteres nulos
  const sanitizedNome = nome.replace(/\0/g, '');
  const sanitizedEmail = email.replace(/\0/g, '');

  try {
    const hashedPassword = await bcrypt.hash(senha, 10);
    const query = `
      INSERT INTO usuarios (nome, email, senha, tipo_usuario, equipeid, empresaid)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, nome, email, tipo_usuario, equipeid, empresaid;
    `;
    const values = [sanitizedNome, sanitizedEmail, hashedPassword, tipo_usuario, equipeid || null, empresaid];

    const result = await pool.query(query, values);
    res.status(201).json({ message: 'Usuário criado com sucesso!', usuario: result.rows[0] });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Erro ao criar usuário.' });
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
    const result = await pool.query(query, [equipeid, empresaid]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário.' });
  }
});


// Endpoint PUT para atualizar um usuário
app.put('/usuarios/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, email, senha, tipo_usuario, equipeid, empresaid } = req.body;

  if (!id || !nome || !email || !tipo_usuario || !empresaid) {
    return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser fornecidos.' });
  }

  try {
    // Gera o hash da senha, se fornecida
    const hashedPassword = senha ? await bcrypt.hash(senha, 10) : null;

    // Constrói dinamicamente o SQL, dependendo da presença de `senha`
    const senhaValuePart = hashedPassword ? [hashedPassword] : [];

    const query = `
  UPDATE usuarios
  SET
    nome = $1,
    email = $2,
    ${senha ? 'senha = $3,' : ''} 
    tipo_usuario = $4,
    equipeid = $5
  WHERE id = $6 AND empresaid = $7
  RETURNING *;
`;

    // Monta os valores dinamicamente, dependendo da presença de `senha`
    const values = [
      nome,
      email,
      ...senhaValuePart,
      tipo_usuario,
      equipeid || null,
      id,
      empresaid,
    ].filter((v) => v !== undefined); // Remove valores `undefined` para evitar erros no SQL

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado ou não pertence à empresa.' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário.' });
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
    return res.status(400).json({ error: 'Cliente ID, Dia da Semana e Empresa ID são obrigatórios.' });
  }

  try {
    const manutencaoQuery = `
      SELECT *
      FROM manutencoes
      WHERE cliente_id = $1 AND dia_semana = $2
      ORDER BY data_manutencao DESC
      LIMIT 1;
    `;
    const manutencaoResult = await pool.query(manutencaoQuery, [clienteId, diaSemana]);

    let manutencao;

    if (manutencaoResult.rows.length === 0) {
      console.log('Nenhuma manutenção encontrada. Criando uma nova...');

      const equipeQuery = `
        SELECT e.id
        FROM associados a
        JOIN equipes e ON a.equipeid = e.id
        WHERE a.clienteid = $1 AND a.diasemana = $2 AND e.empresaid = $3
        LIMIT 1;
      `;
      const equipeResult = await pool.query(equipeQuery, [clienteId, diaSemana, empresaid]);

      if (equipeResult.rows.length === 0) {
        return res.status(400).json({
          error: 'Nenhuma equipe associada encontrada para este cliente e dia da semana.',
        });
      }

      const equipeId = equipeResult.rows[0].id;

      const novaManutencaoQuery = `
        INSERT INTO manutencoes (cliente_id, equipe_id, dia_semana, status, data_manutencao, empresaid)
        VALUES ($1, $2, $3, 'pendente', NOW(), $4)
        RETURNING *;
      `;
      const novaManutencaoResult = await pool.query(novaManutencaoQuery, [
        clienteId,
        equipeId,
        diaSemana,
        empresaid, // Incluído como quarto parâmetro
      ]);
      manutencao = novaManutencaoResult.rows[0];

      const criarParametrosQuery = `
        INSERT INTO manutencoes_parametros (manutencao_id, parametro, valor_ultimo, valor_atual, produto_usado, quantidade_usada, status, empresaid)
        SELECT $1, parametro, NULL, NULL, NULL, 0, 'pendente', $2
        FROM parametros_quimicos
        WHERE empresaid = $2 AND ativo = TRUE;
      `;
      await pool.query(criarParametrosQuery, [manutencao.id, empresaid]);

      console.log('Nova manutenção criada com parâmetros padrão.');
    } else {
      manutencao = manutencaoResult.rows[0];
    }

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
        AND pq.ativo = TRUE;
    `;

    const parametrosResult = await pool.query(parametrosQuery, [manutencao.id, empresaid]);

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

    console.log('Parâmetros transformados:', parametrosTransformados);

    res.status(200).json({
      manutencao,
      parametros: parametrosTransformados,
    });
  } catch (error) {
    console.error('Erro ao buscar manutenção e parâmetros:', error);
    res.status(500).json({ error: 'Erro ao buscar manutenção e parâmetros.' });
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
        ativo = $12
      WHERE id = $13 AND empresaid = $14 RETURNING *`;
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
  const { status, parametros, empresaid } = req.body;

  console.log('📥 Dados recebidos no PUT /manutencoes/:id:', req.body);

  if (!empresaid) {
    return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  }

  if (!status || !['concluida', 'pendente', 'nao_concluida'].includes(status)) {
    return res.status(400).json({ error: 'Status inválido. Status permitidos: concluida, pendente, nao_concluida.' });
  }

  // **Recusa a atualização se houver parâmetros sem `valor_atual`**
  const parametrosInvalidos = parametros?.some((parametro) =>
    parametro.valor_atual === null ||
    parametro.valor_atual === undefined ||
    parametro.valor_atual === ''
  );

  if (parametrosInvalidos) {
    return res.status(400).json({ error: 'Todos os parâmetros devem ser preenchidos antes de concluir a manutenção.' });
  }

  try {
    // **Atualiza o status da manutenção**
    const updateManutencaoQuery = `
      UPDATE manutencoes
      SET status = $1
      WHERE id = $2 AND empresaid = $3
      RETURNING *;
    `;
    const manutencaoResult = await pool.query(updateManutencaoQuery, [status, id, empresaid]);

    if (manutencaoResult.rowCount === 0) {
      return res.status(400).json({ error: 'Erro ao atualizar status da manutenção.' });
    }

    console.log(`🔄 Manutenção ${id} atualizada para status: ${status}`);

    if (status === 'concluida') {
      console.log('📊 Atualizando parâmetros para manutenção:', id);

      for (const parametro of parametros) {
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
    }

    res.status(200).json({ message: 'Manutenção concluída com sucesso!' });
  } catch (error) {
    console.error('❌ Erro ao atualizar manutenção:', error);
    res.status(500).json({ error: 'Erro ao atualizar manutenção.' });
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

    const manutencaoQuery = 'SELECT * FROM manutencoes WHERE id = $1';
    const manutencaoResult = await pool.query(manutencaoQuery, [id]);

    const parametrosQuery = 'SELECT * FROM manutencoes_parametros WHERE manutencao_id = $1';
    const parametrosResult = await pool.query(parametrosQuery, [id]);

    res.status(200).json({
      ...manutencaoResult.rows[0],
      parametros: parametrosResult.rows,
    });
  } catch (error) {
    console.error('Erro ao buscar manutenção:', error);
    res.status(500).json({ error: 'Erro ao buscar manutenção.' });
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


app.post('/reset-status', async (req, res) => {
  const { empresaid } = req.body;

  if (!empresaid) {
    return res.status(400).json({ error: 'Empresaid é obrigatório.' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const clientesAtivosQuery = `
      SELECT DISTINCT ON (a.clienteid, a.diasemana)
        a.clienteid,
        a.equipeid,
        a.diasemana,
        m.id AS manutencao_id
      FROM associados a
      LEFT JOIN manutencoes m 
        ON m.cliente_id = a.clienteid 
        AND m.dia_semana = a.diasemana
      INNER JOIN clientes c ON a.clienteid = c.id
      INNER JOIN equipes e ON a.equipeid = e.id
      WHERE m.status = 'concluida'
        AND c.empresaid = $1
        AND e.empresaid = $1
      ORDER BY a.clienteid, a.diasemana, m.data_manutencao DESC;
    `;
    const clientesAtivosResult = await client.query(clientesAtivosQuery, [empresaid]);

    if (clientesAtivosResult.rows.length === 0) {
      return res.status(400).json({ error: 'Nenhuma manutenção encontrada para resetar.' });
    }

    const mensagensDeSucesso = [];

    for (const cliente of clientesAtivosResult.rows) {
      const novaManutencaoQuery = `
        INSERT INTO manutencoes (cliente_id, equipe_id, dia_semana, status, data_manutencao, empresaid)
        VALUES ($1, $2, $3, 'pendente', NOW(), $4)
        RETURNING id;
      `;
      const novaManutencaoResult = await client.query(novaManutencaoQuery, [
        cliente.clienteid,
        cliente.equipeid,
        cliente.diasemana,
        empresaid,
      ]);
      const novaManutencaoId = novaManutencaoResult.rows[0].id;

      const copiarParametrosQuery = `
        INSERT INTO manutencoes_parametros (manutencao_id, parametro, valor_ultimo, valor_atual, produto_usado, quantidade_usada, status, empresaid)
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
        WHERE mp.manutencao_id = $2 AND pq.ativo = TRUE AND pq.empresaid = $3;
      `;
      await client.query(copiarParametrosQuery, [novaManutencaoId, cliente.manutencao_id, empresaid]);

      const adicionarParametrosAtivosQuery = `
        INSERT INTO manutencoes_parametros (manutencao_id, parametro, valor_ultimo, valor_atual, produto_usado, quantidade_usada, status, empresaid)
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
            WHERE mp.manutencao_id = $1 AND mp.parametro = pq.parametro
          );
      `;
      await client.query(adicionarParametrosAtivosQuery, [novaManutencaoId, empresaid]);

      mensagensDeSucesso.push(`Nova manutenção criada para cliente ${cliente.clienteid}, dia ${cliente.diasemana}.`);
    }

    // 🔹 Resetar os contadores para 0 após reset das manutenções
    await client.query(`
      UPDATE manutencoes
      SET status = 'pendente'
      WHERE empresaid = $1;
    `, [empresaid]);

    await client.query('COMMIT');

    res.status(200).json({
      message: 'Manutenções resetadas com sucesso!',
      detalhes: mensagensDeSucesso,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao resetar status:', error);
    res.status(500).json({ error: 'Erro ao resetar status.', detalhes: error.message });
  } finally {
    client.release();
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
  const { manutencao_id, parametro, valor_atual, produto_usado, quantidade_usada, status, motivo, empresaid } = req.body;

  // 🧩 Validação inicial
  if (!manutencao_id || !parametro || !empresaid) {
    return res.status(400).json({ error: 'Dados incompletos: manutenção, parâmetro ou empresaid ausente.' });
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
        empresaid = EXCLUDED.empresaid;
    `;

    const values = [
      manutencao_id,
      parametro,
      valor_atual || null,
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
  let limite = null;
  let descricao = '';

  // 🧩 Define o limite e a descrição conforme o parâmetro
  if (parametro === 'alcalinidade' && valor_atual > 120) {
    limite = 120;
    descricao = 'A alcalinidade está acima de 120 ppm. É necessário repor parte da água da piscina.';
  } else if (parametro === 'acido cianurico' && valor_atual > 50) {
    limite = 50;
    descricao = 'O ácido cianúrico está acima de 50 ppm. É recomendada a reposição parcial da água da piscina.';
  } else if (parametro === 'sal' && valor_atual > 6) {
    limite = 6;
    descricao = 'O teor de sal está acima de 6 kg/m³. Verifique o equipamento de eletrólise e a concentração de sal.';
  }

  // Só continua se houver limite definido e o valor estiver fora do intervalo
  if (limite !== null) {
    const existeNotif = await pool.query(`
      SELECT id FROM notificacoes
      WHERE cliente_id = $1
        AND assunto = 'Parâmetro químico fora do intervalo'
        AND mensagem ILIKE $2
        AND status != 'resolvido'
        AND empresaid = $3
    `, [clienteId, `%${parametro}%`, empresaid]);

    if (existeNotif.rows.length === 0) {
      await pool.query(`
        INSERT INTO notificacoes (cliente_id, assunto, mensagem, status, data_criacao, empresaid)
        VALUES ($1, $2, $3, 'pendente', NOW(), $4)
      `, [
        clienteId,
        'Parâmetro químico fora do intervalo',
        descricao,
        empresaid
      ]);

      console.log(`📢 Notificação criada automaticamente (${parametro}) para o cliente ${clienteId}`);
    } else {
      console.log(`⚠️ Notificação já existente (${parametro}) para o cliente ${clienteId}, não duplicada.`);
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
    console.log('🚀 Parâmetros carregados do banco:', result.rows);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar parâmetros da manutenção:', error);
    res.status(500).json({ error: 'Erro ao buscar parâmetros da manutenção.' });
  }
});


app.post('/manutencoes/concluir', async (req, res) => {
  const { cliente_id, equipe_id, dia_semana, parametros, status, empresaid } = req.body;

  if (!cliente_id || !equipe_id || !dia_semana || !empresaid) {
    return res.status(400).json({ error: 'Dados incompletos para concluir a manutenção ou empresaid ausente.' });
  }

  try {
    // Validação do `empresaid`
    const validaEmpresaQuery = `
      SELECT 1 
      FROM clientes c
      JOIN equipes e ON e.id = $2
      WHERE c.id = $1 AND c.empresaid = $3 AND e.empresaid = $3;
    `;
    const validaEmpresaResult = await pool.query(validaEmpresaQuery, [cliente_id, equipe_id, empresaid]);

    if (validaEmpresaResult.rows.length === 0) {
      return res.status(403).json({ error: 'Cliente ou equipe não pertencem à empresa especificada.' });
    }

    const query = `
      INSERT INTO manutencoes (cliente_id, equipe_id, dia_semana, status, data_manutencao)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *;
    `;
    const values = [cliente_id, equipe_id, dia_semana, status];
    const result = await pool.query(query, values);

    const manutencaoId = result.rows[0].id;

    // Insira parâmetros associados
    if (parametros && parametros.length > 0) {
      for (const parametro of parametros) {
        const validaParametroQuery = `
          SELECT 1 
          FROM parametros_quimicos 
          WHERE parametro = $1 AND empresaid = $2 AND ativo = TRUE;
        `;
        const validaParametroResult = await pool.query(validaParametroQuery, [parametro.parametro, empresaid]);

        if (validaParametroResult.rows.length === 0) {
          console.warn(`Parâmetro ${parametro.parametro} não pertence à empresa ${empresaid}. Ignorado.`);
          continue;
        }

        const parametroQuery = `
          INSERT INTO manutencoes_parametros (manutencao_id, parametro, valor_atual, produto_usado, quantidade_usada)
          VALUES ($1, $2, $3, $4, $5);
        `;
        await pool.query(parametroQuery, [
          manutencaoId,
          parametro.parametro,
          parametro.valor_atual || null,
          parametro.produto_usado || null,
          parametro.quantidade_usada || 0,
        ]);
      }
    }

    res.status(201).json({ message: 'Manutenção concluída com sucesso.', id: manutencaoId });
  } catch (error) {
    console.error('Erro ao concluir manutenção:', error);
    res.status(500).json({ error: 'Erro ao concluir manutenção.' });
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
        n.atribuido_a,
        c.nome AS cliente_nome,
        c.morada AS cliente_morada,
        c.email AS cliente_email,
        e.nomeequipe AS equipe_nome
      FROM notificacoes n
      LEFT JOIN clientes c ON n.cliente_id = c.id
      LEFT JOIN associados a ON a.clienteid = c.id
      LEFT JOIN equipes e ON a.equipeid = e.id
      WHERE n.cliente_id IS NOT NULL 
        AND n.empresaid = $1
      ORDER BY n.data_criacao DESC;
    `;

    const result = await pool.query(notificacoesQuery, [Number(empresaid)]);

    if (result.rows.length === 0) {
      return res.status(200).json([]); // ✅ Retorna um array vazio em vez de 404
    }

    // 🔹 Remove duplicadas com base no ID antes de enviar
    const unicas = Array.from(new Map(result.rows.map(n => [n.id, n])).values());
    console.log('📥 Notificações carregadas (únicas):', unicas);

    res.status(200).json(unicas);
  } catch (error) {
    console.error('❌ Erro ao buscar notificações:', error);
    res.status(500).json({ error: 'Erro ao buscar notificações.' });
  }
});


app.post('/notificacoes', async (req, res) => {
  console.log('📥 Dados recebidos no backend:', JSON.stringify(req.body, null, 2));

  const { cliente_id, clienteId, assunto, parametro, mensagem, empresaid, anexos, valor_servico_extra } = req.body;
    console.log('📨 Nova notificação recebida:');
  console.log('Cliente ID:', cliente_id);
  console.log('Assunto:', assunto);
  console.log('Mensagem:', mensagem);
  console.log('Empresa ID:', empresaid);
  console.log('Anexos recebidos:', anexos ? anexos.map((a) => a.slice(0, 60) + '...') : 'Nenhum');
  console.log('Valor serviço extra:', valor_servico_extra);

  const clienteFinal = cliente_id || clienteId;

  // 🛠️ Validação dos dados recebidos
  if (!clienteFinal || !mensagem || !empresaid) {
    console.warn('⚠️ Campos obrigatórios ausentes:', { cliente_id, clienteId, mensagem, empresaid });
    return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser fornecidos.' });
  }

  try {
    // **🔹 Ajuste:** `parametro` pode ser opcional (usado para distinguir entre notificações de parâmetros químicos e relatórios de anomalias)
    const assunto = parametro ? parametro : 'Relatório de Anomalia';

    // **🔹 Ajuste:** Conversão dos anexos para JSONB válido
    const anexosJson = anexos && anexos.length > 0 ? JSON.stringify(anexos) : null;

    const query = `
      INSERT INTO notificacoes (cliente_id, assunto, mensagem, status, data_criacao, empresaid, anexos, valor_servico_extra)
      VALUES ($1, $2, $3, 'pendente', NOW(), $4, $5, $6)
      RETURNING *;
    `;

    const values = [
      clienteFinal,
      assunto,
      mensagem,
      empresaid,
      anexosJson, // Envio correto para JSONB
      valor_servico_extra ? parseFloat(valor_servico_extra) : 0,
    ];

    console.log('📤 Query para o banco de dados:', query);
    console.log('🔹 Valores enviados para o banco de dados:', values);

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(200).json({ message: 'Notificação já existe e está pendente.' });
    }

    res.status(201).json({ message: 'Notificação criada com sucesso!', notificacao: result.rows[0] });

  } catch (error) {
    console.error('❌ Erro ao criar notificação:', error);

    // 🛠️ Melhor diagnóstico do erro
    if (error.code) {
      console.error(`🚨 Código de erro SQL: ${error.code}`);
    }

    res.status(500).json({ error: 'Erro ao criar notificação.' });
  }
});

app.put('/notificacoes/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, empresaid } = req.body;

  if (!status || !empresaid) {
    return res.status(400).json({ error: 'Os campos status e empresaid são obrigatórios.' });
  }

  try {
    const query = `
      UPDATE notificacoes
      SET status = $1, data_atualizacao_status = NOW()
      WHERE id = $2 AND empresaid = $3
      RETURNING *;
    `;
    const values = [status, id, empresaid];

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada ou não pertence à empresa.' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar status da notificação:', error);
    res.status(500).json({ error: 'Erro ao atualizar status da notificação.' });
  }
});
app.put('/notificacoes/:id/responsavel', async (req, res) => {
  const { id } = req.params;
  const { atribuido_a, empresaid } = req.body;

  if (!atribuido_a) {
    return res.status(400).json({ error: 'Nome do responsável é obrigatório.' });
  }

  try {
    await pool.query(
      'UPDATE notificacoes SET atribuido_a = $1 WHERE id = $2 AND empresaid = $3',
      [atribuido_a, id, empresaid]
    );

    res.json({ message: 'Responsável atualizado com sucesso!' });
  } catch (error) {
    console.error('Erro ao atualizar responsável:', error);
    res.status(500).json({ error: 'Erro no servidor' });
  }
});
app.put('/notificacoes/:id/update', async (req, res) => {
  const { id } = req.params;
  const { status, atribuido_a, empresaid } = req.body;

  try {
    if (!empresaid) {
      return res.status(400).json({ error: 'Empresaid é obrigatório.' });
    }

    let query = 'UPDATE notificacoes SET ';
    const values = [];
    let count = 1;

    if (status) {
      query += `status = $${count}, `;
      values.push(status);
      count++;
    }

    if (atribuido_a !== undefined) { // ✅ Garante que o campo pode ser vazio ("")
      query += `atribuido_a = $${count}, `;
      values.push(atribuido_a);
      count++;
    }

    // 🔹 Remover a última vírgula e espaço extra
    query = query.trim().replace(/,$/, '');
    query += ` WHERE id = $${count} AND empresaid = $${count + 1}`;

    values.push(Number(id), Number(empresaid)); // ✅ Garante que são números

    console.log('🛠️ SQL Query:', query, 'Valores:', values); // 🔹 Debug opcional

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada ou sem permissão para editar.' });
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

// Inicia o servidor
  app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});