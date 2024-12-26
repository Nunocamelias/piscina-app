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
    localidade, // Novo campo
    codigo_postal, // Novo campo
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

  console.log('Dados recebidos:', req.body);

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
      sanitizeString(localidade), // Adicionado
      sanitizeString(codigo_postal), // Adicionado
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
      nome,
      morada,
      localidade, // Novo campo
      codigo_postal, // Novo campo
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
      periodicidade, // Campo existente
      condicionantes, // Campo existente
  } = req.body;

  console.log('Enviando dados:', req.body); // Para verificar os dados enviados
  try {
      const query = `
          UPDATE clientes 
          SET nome = $1, morada = $2, localidade = $3, codigo_postal = $4, google_maps = $5, email = $6, telefone = $7, info_acesso = $8, 
              comprimento = $9, largura = $10, profundidade_media = $11, volume = $12, tanque_compensacao = $13, 
              cobertura = $14, bomba_calor = $15, equipamentos_especiais = $16, ultima_substituicao = $17, valor_manutencao = $18, 
              periodicidade = $19, condicionantes = $20
          WHERE id = $21
          RETURNING *;
      `;
      const values = [
          nome,
          morada,
          localidade, // Novo campo
          codigo_postal, // Novo campo
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
          `{${condicionantes.join(',')}}`, // Converte o array para o formato correto
          id, // ID do cliente
      ];
      const result = await pool.query(query, values);
      res.status(200).json(result.rows[0]);
  } catch (error) {
      console.error('Erro ao atualizar cliente:', error);
      res.status(500).send('Erro ao atualizar cliente.');
  }
});

  app.get('/clientes', async (req, res) => {
    try {
      const query = 'SELECT * FROM clientes';
      const result = await pool.query(query);
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error.message); // Mensagem detalhada
      console.error('Detalhes do erro:', error.stack);           // Stack do erro
      res.status(500).send('Erro ao buscar clientes.');
    }
  });
  

  app.get('/clientes/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const query = 'SELECT * FROM clientes WHERE id = $1';
      const values = [id];
      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
      return res.status(404).send('Cliente não encontrado.');
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
    try {
      const query = 'DELETE FROM clientes WHERE id = $1 RETURNING *;';
      const values = [id];
      const result = await pool.query(query, values);
      if (result.rowCount === 0) {
      return res.status(404).send('Cliente não encontrado.');
      }
      res.status(200).send('Cliente apagado com sucesso.');
    } catch (error) {
      console.error('Erro ao apagar cliente:', error);
      res.status(500).send('Erro ao apagar cliente.');
    }
  });
  app.post('/equipes', async (req, res) => {
    const { nomeequipe, nome1, nome2, matricula, telefone, proximaInspecao } = req.body;
    try {
      const query = `
        INSERT INTO equipes (nomeequipe, nome1, nome2, matricula, telefone, proxima_inspecao)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
      `;
      const values = [
        nomeequipe, // Nome da equipe
        nome1,      // Primeiro membro
        nome2,      // Segundo membro
        matricula,  // Matrícula
        telefone,   // Telefone
        proximaInspecao, // Próxima inspeção
      ];
      const result = await pool.query(query, values);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Erro ao salvar equipe:', error);
      res.status(500).send('Erro ao salvar equipe.');
    }
  });
  app.get('/equipes', async (req, res) => {
      try {
      const query = `SELECT * FROM equipes ORDER BY id;`;
      const result = await pool.query(query);
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Erro ao buscar equipes:', error);
      res.status(500).send('Erro ao buscar equipes.');
    }
  });
  app.get('/equipes/:id', async (req, res) => {
      const { id } = req.params;
      try {
      const query = 'SELECT * FROM equipes WHERE id = $1;';
      const values = [id];
      const result = await pool.query(query, values);
      if (result.rows.length === 0) {
      return res.status(404).send('Equipe não encontrada.');
      }
      res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error('Erro ao buscar equipe:', error);
      res.status(500).send('Erro ao buscar equipe.');
    }
  });
  // Endpoint PUT para atualizar uma equipe
  app.put('/equipes/:id', async (req, res) => {
      const { id } = req.params;
      const { nomeequipe, nome1, nome2, matricula, telefone, proxima_inspecao } = req.body;
      try {
      const query = `
      UPDATE equipes
      SET nomeequipe = $1, nome1 = $2, nome2 = $3, matricula = $4, telefone = $5, proxima_inspecao = $6
      WHERE id = $7
      RETURNING *;
    `;
      const values = [nomeequipe, nome1, nome2, matricula, telefone, proxima_inspecao, id];
      const result = await pool.query(query, values);
      res.status(200).json(result.rows[0]);
    } catch (error) {
      console.error('Erro ao atualizar equipe:', error);
      res.status(500).send('Erro ao atualizar equipe.');
    }
});
  app.delete('/equipes/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const query = 'DELETE FROM equipes WHERE id = $1 RETURNING *;';
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
      const { equipeId, diaSemana } = req.query;
      if (!equipeId || !diaSemana) {
      return res.status(400).json({ error: 'EquipeId e diaSemana são obrigatórios.' });
    }
    try {
      const query = `
      SELECT c.*
      FROM associados a
      JOIN clientes c ON a.clienteId = c.id
      WHERE a.equipeId = $1 AND a.diaSemana = $2
    `;
      const values = [equipeId, diaSemana];
      const result = await pool.query(query, values);
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      res.status(500).json({ error: 'Erro ao buscar clientes.' });
    }
});
   // Rota para associar um cliente a uma equipe em um dia específico
  app.post('/associar-cliente', async (req, res) => {
      const { clienteId, equipeId, diaSemana } = req.body;
      if (!clienteId || !equipeId || !diaSemana) {
      return res.status(400).json({ error: 'ClienteId, equipeId e diaSemana são obrigatórios.' });
    }
    try {
      const query = `
      INSERT INTO associados (clienteId, equipeId, diaSemana)
      VALUES ($1, $2, $3)
      ON CONFLICT (clienteId, diaSemana) DO NOTHING
      RETURNING *;
    `;
      const values = [clienteId, equipeId, diaSemana];
      const result = await pool.query(query, values);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Erro ao associar cliente:', error);
      res.status(500).json({ error: 'Erro ao associar cliente.' });
    }
});
    // Rota para desassociar um cliente de um dia específico
    app.delete('/desassociar-cliente', async (req, res) => {
      const { clienteId, equipeId, diaSemana } = req.body;
      if (!clienteId || !equipeId || !diaSemana) {
      return res.status(400).json({ error: 'ClienteId, equipeId e diaSemana são obrigatórios.' });
    }
    try {
      const query = `
      DELETE FROM associados
      WHERE clienteId = $1 AND equipeId = $2 AND diaSemana = $3
      RETURNING *;
    `;
      const values = [clienteId, equipeId, diaSemana];
      const result = await pool.query(query, values);
      if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Associação não encontrada.' });
    }
      res.status(200).json({ message: 'Cliente desassociado com sucesso.' });
    }   catch (error) {
      console.error('Erro ao desassociar cliente:', error);
      res.status(500).json({ error: 'Erro ao desassociar cliente.' });
    }
});
    // Rota para buscar todas as equipes
  app.get('/equipes', async (req, res) => {
    try {
      const query = `
      SELECT * FROM equipes ORDER BY id;
    `;
      const result = await pool.query(query);
      res.status(200).json(result.rows);
    } catch (error) {
      console.error('Erro ao buscar equipes:', error);
      res.status(500).json({ error: 'Erro ao buscar equipes.' });
    }
});
app.get('/associados/:equipeId/:diaSemana', async (req, res) => {
  const { equipeId, diaSemana } = req.params;
  try {
    const query = `
      SELECT c.id AS clienteId, c.nome, c.morada, c.telefone
      FROM associados a
      INNER JOIN clientes c ON a.clienteId = c.id
      WHERE a.equipeId = $1 AND a.diaSemana = $2;
    `;
    const values = [equipeId, diaSemana];
    const result = await pool.query(query, values);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar associados:', error);
    res.status(500).send('Erro ao buscar associados.');
  }
});
app.post('/associados', async (req, res) => {
  const { equipeId, clienteId, diaSemana } = req.body;

  try {
    // Verifica se o cliente já está associado no mesmo dia
    const checkQuery = `
      SELECT * FROM associados
      WHERE clienteId = $1 AND diaSemana = $2;
    `;
    const checkResult = await pool.query(checkQuery, [clienteId, diaSemana]);

    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: 'Cliente já associado a este dia.' });
    }

    // Verifica a periodicidade do cliente e o total de associações
    const periodicidadeQuery = `
      SELECT periodicidade, 
        (SELECT COUNT(*) FROM associados WHERE clienteId = $1) AS total_associacoes
      FROM clientes
      WHERE id = $1;
    `;
    const periodicidadeResult = await pool.query(periodicidadeQuery, [clienteId]);
    const { periodicidade, total_associacoes } = periodicidadeResult.rows[0];

    if (total_associacoes >= periodicidade) {
      return res.status(400).json({ error: 'Limite de associações para este cliente foi atingido.' });
    }

    // Insere a nova associação
    const insertQuery = `
      INSERT INTO associados (equipeId, clienteId, diaSemana)
      VALUES ($1, $2, $3)
      RETURNING *;
    `;
    const result = await pool.query(insertQuery, [equipeId, clienteId, diaSemana]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao associar cliente:', error);
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
  const { diaSemana } = req.query;

  if (!diaSemana) {
    return res.status(400).json({ error: 'O parâmetro diaSemana é obrigatório.' });
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
      WHERE (CAST(c.periodicidade AS BIGINT) - COALESCE(a.total_associacoes, 0)) > 0
        AND NOT ($1 = ANY(c.condicionantes)); -- Exclui condicionantes
    `;

    const result = await pool.query(query, [diaSemana]);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar clientes disponíveis:', error);
    res.status(500).send('Erro ao buscar clientes disponíveis.');
  }
});




// Rota para obter contadores de clientes por dia da semana para uma equipe específica
app.get('/contador-clientes', async (req, res) => {
  const { equipeId } = req.query;

  if (!equipeId) {
    return res.status(400).json({ error: 'O parâmetro equipeId é obrigatório.' });
  }

  try {
    const query = `
      SELECT diasemana, COUNT(clienteid) AS total
      FROM associados
      WHERE equipeid = $1
      GROUP BY diasemana
    `;
    const values = [equipeId];
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
  const { nome, email, senha, tipo_usuario } = req.body;

  if (!nome || !email || !senha || !tipo_usuario) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  try {
    // Criptografa a senha antes de salvar no banco
    const hashedPassword = await bcrypt.hash(senha, 10);

    const query = `
      INSERT INTO usuarios (nome, email, senha, tipo_usuario)
      VALUES ($1, $2, $3, $4)
      RETURNING id, nome, email, tipo_usuario;
    `;
    const values = [nome, email, hashedPassword, tipo_usuario];

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
        u.senha AS senha 
      FROM usuarios u 
      WHERE u.email = $1
    `;

    const result = await pool.query(query, [email]);

    if (result.rows.length > 0) {
      const user = result.rows[0];

      // Log dos dados do usuário para debug
      console.log('Usuário encontrado no banco de dados:', user);

      // Verifica se a senha é válida
      const isPasswordValid = await bcrypt.compare(senha, user.senha);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Credenciais inválidas.' });
      }

      // Gera o token JWT
      const token = jwt.sign(
        { id: user.userId, tipo_usuario: user.tipo_usuario },
        'secreto',
        { expiresIn: '1h' }
      );

      // Log dos dados retornados ao cliente
      console.log('Dados retornados no login:', {
        token,
        user: {
          id: user.userid,
          nome: user.nome,
          tipo_usuario: user.tipo_usuario,
          equipeId: user.equipeid, // Certifique-se de mapear corretamente aqui
        },
      });

      // Retorna os dados do usuário e o token
      return res.json({
        token,
        user: {
          id: user.userid,
          nome: user.nome,
          tipo_usuario: user.tipo_usuario,
          equipeId: user.equipeid, // Certifique-se de mapear corretamente aqui
        },
      });
    } else {
      console.warn('Usuário não encontrado:', email);
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    return res.status(500).json({ error: 'Erro ao fazer login.' });
  }
});

app.get('/clientes-por-equipe', async (req, res) => {
  const { equipeId } = req.query;

  if (!equipeId) {
    return res.status(400).json({ error: 'equipeId é obrigatório.' });
  }

  try {
    const query = `
      SELECT c.id, c.nome, c.morada, c.telefone
      FROM clientes c
      INNER JOIN associados a ON c.id = a.clienteId
      WHERE a.equipeId = $1
    `;
    const result = await pool.query(query, [equipeId]);

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
  const { equipeId } = req.query;

  console.log('Recebido equipeId:', equipeId); // Adicione log para verificar

  if (!equipeId) {
    return res.status(400).json({ error: 'equipeId não fornecido.' });
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
        proxima_inspecao
      FROM equipes
      WHERE id = $1
    `;

    const result = await pool.query(query, [equipeId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipe não encontrada.' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar detalhes da equipe:', error);
    res.status(500).json({ error: 'Erro ao buscar detalhes da equipe.' });
  }
});

// Inicia o servidor
  app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
