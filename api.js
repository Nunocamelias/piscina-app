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
  user: process.env.DB_USER || 'piscina_app_user',
  host: process.env.DB_HOST || 'dpg-csjc1mm8ii6s73d2i0i0-a.oregon-postgres.render.com',
  database: process.env.DB_DATABASE || 'piscina_app',
  password: process.env.DB_PASSWORD || 'onGdUEYONb0S32wbf7SS9W5Zf0lSd5J6',
  port: process.env.DB_PORT || 5432,
  ssl: { rejectUnauthorized: false },
});

// Endpoint POST para adicionar cliente
app.post('/clientes', async (req, res) => {
    const {
      empresaid, // Inclua o campo empresaid aqui
      nome,
      morada,
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
    } = req.body;
  
    console.log('Dados recebidos:', req.body);
  
    try {
      const query = `
        INSERT INTO clientes 
        (empresaid, nome, morada, google_maps, email, telefone, info_acesso, comprimento, largura, profundidade_media, volume, tanque_compensacao, cobertura, bomba_calor, equipamentos_especiais, ultima_substituicao)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *;
      `;
      const values = [
        empresaid, // Envia o valor do empresaid corretamente
        nome,
        morada,
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
      google_maps,
      email,
      telefone,
      info_acesso,
      comprimento,
      largura,
      profundidade_media,
      volume, // Inclui o campo volume
      tanque_compensacao,
      cobertura,
      bomba_calor,
      equipamentos_especiais,
      ultima_substituicao,
    } = req.body;
  
    console.log('Enviando dados:', req.body); // Corrigido para req.body
  
    try {
      const query = `
        UPDATE clientes 
        SET nome = $1, morada = $2, google_maps = $3, email = $4, telefone = $5, info_acesso = $6, 
            comprimento = $7, largura = $8, profundidade_media = $9, volume = $10, tanque_compensacao = $11, 
            cobertura = $12, bomba_calor = $13, equipamentos_especiais = $14, ultima_substituicao = $15
        WHERE id = $16
        RETURNING *;
      `;
      const values = [
        nome,
        morada,
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
      console.error('Erro ao buscar clientes:', error);
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
      const query = 'SELECT * FROM equipes;';
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
  

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});
