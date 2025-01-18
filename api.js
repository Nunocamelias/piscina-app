require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Pool } = require('pg');
const moment = require('moment'); // Certifique-se de que o moment.js está instalado: npm install moment

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
    const {
      empresaid,
      nomeequipe,
      nome1,
      nome2,
      matricula,
      telefone,
      proximaInspecao,
      validadeSeguro, // Novo campo
    } = req.body;
  
    if (!empresaid) {
      return res.status(400).send('O campo empresaid é obrigatório.');
    }
  
    try {
      const query = `
        INSERT INTO equipes (empresaid, nomeequipe, nome1, nome2, matricula, telefone, proxima_inspecao, validade_seguro)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `;
      const values = [empresaid, nomeequipe, nome1, nome2, matricula, telefone, proximaInspecao, validadeSeguro];
      const result = await pool.query(query, values);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Erro ao salvar equipe:', error);
      res.status(500).send('Erro ao salvar equipe.');
    }
  });
  // Endpoint GET para buscar todas as equipes de uma empresa
app.get('/equipes', async (req, res) => {
  const { empresaid } = req.query; // Inclui o empresaid como filtro

  if (!empresaid) {
    return res.status(400).send('O parâmetro empresaid é obrigatório.');
  }

  try {
    const query = `
      SELECT * 
      FROM equipes 
      WHERE empresaid = $1;
    `;
    const values = [empresaid];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).send('Nenhuma equipe encontrada para esta empresa.');
    }

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar equipes:', error);
    res.status(500).send('Erro ao buscar equipes.');
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
      proximaInspecao,
      validadeSeguro, // Novo campo
    } = req.body;
  
    const { id } = req.params;
  
    if (!empresaid) {
      return res.status(400).send('O campo empresaid é obrigatório.');
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
  
      // Atualizar a equipe
      const query = `
        UPDATE equipes
        SET nomeequipe = $1, nome1 = $2, nome2 = $3, matricula = $4, telefone = $5, proxima_inspecao = $6, validade_seguro = $7
        WHERE id = $8
        RETURNING *;
      `;
      const values = [nomeequipe, nome1, nome2, matricula, telefone, proximaInspecao, validadeSeguro, id];
      const result = await pool.query(query, values);
      res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error('Erro ao atualizar equipe:', error);
      res.status(500).send('Erro ao atualizar equipe.');
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
      SELECT diasemana, COUNT(clienteid) AS total
      FROM associados a
      INNER JOIN equipes e ON a.equipeid = e.id
      WHERE a.equipeid = $1 AND e.empresaid = $2
      GROUP BY diasemana
    `;
    const values = [equipeId, empresaid];
    const result = await pool.query(query, values);

    // Formata os resultados para serem enviados de forma mais direta
    const contadores = result.rows.reduce((acc, row) => {
      acc[row.diasemana] = parseInt(row.total, 10);
      return acc;
    }, {});
    res.status(200).json(contadores);
  } catch (error) {
    console.error('Erro ao buscar contadores de clientes:', error);
    res.status(500).json({ error: 'Erro ao buscar contadores de clientes.' });
  }
});

//Esse endpoint permitirá adicionar novos usuários ao sistema
const bcrypt = require('bcrypt'); // Para criptografar senhas

app.post('/register', async (req, res) => {
  const { nome, email, senha, tipo_usuario, empresaid } = req.body;

  if (!nome || !email || !senha || !tipo_usuario || !empresaid) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  try {
    // Criptografa a senha antes de salvar no banco
    const hashedPassword = await bcrypt.hash(senha, 10);

    const query = `
      INSERT INTO usuarios (nome, email, senha, tipo_usuario, empresaid)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, nome, email, tipo_usuario, empresaid;
    `;
    const values = [nome, email, hashedPassword, tipo_usuario, empresaid];

    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({ error: 'Erro ao registrar usuário.' });
  }
});
//Este endpoint verificará as credenciais do usuário e retornará o tipo de usuário
const jwt = require('jsonwebtoken'); // Para gerar tokens JWT

app.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  try {
    // Consulta para buscar o usuário pelo email
    const query = `
      SELECT 
        u.id AS userId, 
        u.nome AS nome, 
        u.tipo_usuario, 
        u.equipeid AS equipeId, 
        u.senha AS senha,
        u.empresaid AS empresaid -- Recupera o empresaid diretamente
      FROM usuarios u 
      WHERE u.email = $1
    `;

    const result = await pool.query(query, [email]);

    if (result.rows.length > 0) {
      const user = result.rows[0];

      // Verifica se a senha é válida
      const isPasswordValid = await bcrypt.compare(senha, user.senha);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Credenciais inválidas.' });
      }

      // Verifica se o campo empresaid está presente
      if (!user.empresaid) {
        return res.status(400).json({ error: 'Empresaid não está definido para este usuário.' });
      }

      // Gera o token JWT
      const token = jwt.sign(
        { id: user.userId, tipo_usuario: user.tipo_usuario, empresaid: user.empresaid },
        'secreto',
        { expiresIn: '1h' }
      );

      // Retorna os dados do usuário e o token
      return res.json({
        token,
        user: {
          id: user.userId,
          nome: user.nome,
          tipo_usuario: user.tipo_usuario,
          equipeId: user.equipeid,
          empresaid: user.empresaid, // Inclui empresaid no retorno
        },
      });
    } else {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    return res.status(500).json({ error: 'Erro ao fazer login.' });
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
      console.log("Nenhuma manutenção encontrada. Criando uma nova...");

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

      console.log("Nova manutenção criada com parâmetros padrão.");
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

app.get('/parametros-quimicos', async (req, res) => {
  const { ativo, empresaid } = req.query; // Aceitar o filtro por empresaid e ativo

  if (!empresaid) {
    return res.status(400).json({ error: 'O parâmetro empresaid é obrigatório.' });
  }

  let query = 'SELECT * FROM parametros_quimicos WHERE empresaid = $1';
  const values = [empresaid];

  if (ativo === 'true') {
    query += ' AND ativo = TRUE';
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

  // Validação dos dados recebidos
  if (!empresaid) {
    return res.status(400).json({ error: "Empresaid é obrigatório." });
  }

  if (!parametros || parametros.length === 0) {
    return res.status(400).json({ error: "Parâmetros são obrigatórios para concluir a manutenção." });
  }

  try {
    // Verifica se a manutenção pertence à empresa
    const verificarManutencaoQuery = `
      SELECT m.id
      FROM manutencoes m
      INNER JOIN clientes c ON m.cliente_id = c.id
      WHERE m.id = $1 AND c.empresaid = $2;
    `;
    const verificarResult = await pool.query(verificarManutencaoQuery, [id, empresaid]);

    if (verificarResult.rowCount === 0) {
      return res.status(404).json({ error: "Manutenção não encontrada ou não pertence à empresa." });
    }

    // Atualiza o status da manutenção
    const updateManutencaoQuery = `
      UPDATE manutencoes
      SET status = $1
      WHERE id = $2 AND empresaid = $3
      RETURNING *;
    `;
    const manutencaoResult = await pool.query(updateManutencaoQuery, [status, id, empresaid]);

    if (manutencaoResult.rowCount === 0) {
      return res.status(400).json({ error: "Erro ao atualizar status da manutenção." });
    }

    console.log("Atualizando parâmetros para manutenção:", id);

    // Atualiza os parâmetros químicos
    for (const parametro of parametros) {
      const updateParametroQuery = `
        INSERT INTO manutencoes_parametros (
          manutencao_id, parametro, valor_atual, produto_usado, quantidade_usada, status, empresaid
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (manutencao_id, parametro)
        DO UPDATE SET 
          valor_atual = $3,
          produto_usado = $4,
          quantidade_usada = $5,
          status = CASE
            WHEN manutencoes_parametros.status = 'pendente' THEN $6
            ELSE manutencoes_parametros.status
          END,
          empresaid = $7;
      `;

      const parametroValues = [
        id,
        parametro.parametro,
        parametro.valor_atual || null,
        parametro.produto_usado || null,
        parametro.quantidade_usada || 0,
        parametro.status || 'pendente',
        empresaid, // Adicionado aqui
      ];

      console.log("Atualizando parâmetro:", parametroValues);

      await pool.query(updateParametroQuery, parametroValues);
    }

    res.status(200).json({ message: "Manutenção concluída com sucesso." });
  } catch (error) {
    console.error("Erro ao atualizar manutenção:", error);
    res.status(500).json({ error: "Erro ao atualizar manutenção." });
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

    const manutencaoQuery = `SELECT * FROM manutencoes WHERE id = $1`;
    const manutencaoResult = await pool.query(manutencaoQuery, [id]);

    const parametrosQuery = `SELECT * FROM manutencoes_parametros WHERE manutencao_id = $1`;
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
        parametro.status || "pendente",
      ];
      await pool.query(parametroQuery, parametroValues);
    }

    res.status(200).json({ message: "Parâmetros atualizados com sucesso." });
  } catch (error) {
    console.error("Erro ao atualizar parâmetros:", error);
    res.status(500).json({ error: "Erro ao atualizar parâmetros." });
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


app.post('/manutencoes_parametros', async (req, res) => {
  const { manutencao_id, parametro, valor_atual, produto_usado, quantidade_usada, status, motivo, empresaid } = req.body;

  // Validação inicial
  if (!manutencao_id || !parametro || !empresaid) {
    return res.status(400).json({ error: 'Dados incompletos: manutenção, parâmetro ou empresaid ausente.' });
  }

  try {
    // Validação do `empresaid`
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

    // Inserção ou atualização do parâmetro
    const query = `
      INSERT INTO manutencoes_parametros (
        manutencao_id, parametro, valor_atual, produto_usado, quantidade_usada, status, motivo, empresaid
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (manutencao_id, parametro)
      DO UPDATE SET
        valor_atual = $3,
        produto_usado = $4,
        quantidade_usada = $5,
        status = $6,
        motivo = $7,
        empresaid = $8;
    `;
    const values = [
      manutencao_id,
      parametro,
      valor_atual || null,
      produto_usado || null,
      quantidade_usada || 0,
      status,
      motivo || '',
      empresaid, // Adicionado aqui
    ];

    await pool.query(query, values);

    res.status(200).json({ message: 'Status do parâmetro registrado com sucesso.' });
  } catch (error) {
    console.error('Erro ao registrar status do parâmetro:', error);
    res.status(500).json({ error: 'Erro ao registrar status do parâmetro.' });
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

    res.status(201).json({ message: "Manutenção concluída com sucesso.", id: manutencaoId });
  } catch (error) {
    console.error("Erro ao concluir manutenção:", error);
    res.status(500).json({ error: "Erro ao concluir manutenção." });
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
  const { empresaid } = req.query; // Certifica-se de que o empresaid é recebido

  if (!empresaid) {
    return res.status(400).json({ error: 'O parâmetro empresaid é obrigatório.' });
  }

  try {
    const notificacoesQuery = `
      SELECT 
        n.id,
        n.assunto,
        n.mensagem,
        n.status,
        n.data_criacao,
        n.data_resolucao,
        c.nome AS cliente_nome,
        c.morada AS cliente_morada,
        c.email AS cliente_email,
        e.nome AS equipe_nome
      FROM notificacoes n
      LEFT JOIN clientes c ON n.cliente_id = c.id
      LEFT JOIN associados a ON a.clienteid = c.id
      LEFT JOIN equipes e ON a.equipeid = e.id
      WHERE n.cliente_id IS NOT NULL AND n.empresaid = $1
      ORDER BY n.data_criacao DESC;
    `;
    const result = await pool.query(notificacoesQuery, [empresaid]); // Passa o parâmetro empresaid
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Nenhuma notificação encontrada.' });
    }
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    res.status(500).json({ error: 'Erro ao buscar notificações.' });
  }
});

app.post('/notificacoes', async (req, res) => {
  const { clienteId, parametro, mensagem, empresaid } = req.body;

  // Validação dos dados recebidos
  if (!clienteId || !parametro || !mensagem || !empresaid) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios, incluindo empresaid.' });
  }

  try {
    // Inserção de notificação, garantindo que não existem duplicadas
    const query = `
      INSERT INTO notificacoes (cliente_id, assunto, mensagem, status, data_criacao, empresaid)
      SELECT $1, $2::VARCHAR, $3, 'pendente', NOW(), $4
      WHERE NOT EXISTS (
        SELECT 1 FROM notificacoes
        WHERE cliente_id = $1 AND assunto = $2 AND mensagem = $3 AND status = 'pendente' AND empresaid = $4
      )
      RETURNING *;
    `;
    const result = await pool.query(query, [clienteId, parametro, mensagem, empresaid]);

    if (result.rowCount === 0) {
      return res.status(200).json({ message: 'Notificação já existe e está pendente.' });
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao criar notificação:', error);
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
