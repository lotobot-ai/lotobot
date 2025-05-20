const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const app = express();
const port = process.env.PORT || 3000;

// Habilitar CORS e JSON
app.use(cors());
app.use(express.json());

// Em produção, use um banco de dados real (MongoDB, PostgreSQL, etc.)
// Este é apenas um exemplo para demonstração
const validTokens = {
  // Token de administrador (acesso vitalício)
  'ADMIN_LOTOBOT_2025': {
    expiry: new Date(2099, 11, 31).toISOString(), // Válido até 31/12/2099
    plan: 'admin',
    createdAt: new Date().toISOString(),
    isAdmin: true
  },
  // Token de administrador fixo mais forte
  'ADM_LOTOBOT_252023@#$': {
    expiry: new Date(2099, 11, 31).toISOString(), // Válido até 31/12/2099
    plan: 'admin',
    createdAt: new Date().toISOString(),
    isAdmin: true
  },
  // Token: {expiry, plan}
  'DEMO123': {
    expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
    plan: 'basic',
    createdAt: new Date().toISOString()
  },
  'PREMIUM456': {
    expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 dias
    plan: 'premium',
    createdAt: new Date().toISOString()
  }
};

// Chave secreta para API - em produção, use variáveis de ambiente
const API_SECRET = process.env.API_SECRET || 'sua_chave_secreta_aqui';

// Rota para página inicial
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>LotoBot Token Validator API</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          .endpoint { background: #f4f4f4; padding: 10px; margin: 10px 0; border-radius: 5px; }
          code { background: #e0e0e0; padding: 2px 5px; border-radius: 3px; }
          .price { font-size: 24px; font-weight: bold; color: #28a745; margin: 10px 0; }
        </style>
      </head>
      <body>
        <h1>LotoBot Token Validator API</h1>
        <p>Esta é a API de validação de tokens do LotoBot.</p>
        
        <h2>Plano Disponível:</h2>
        <div class="endpoint">
          <p class="price">Acesso vitalício ao sistema de geração de jogos com IA</p>
        </div>
        
        <h2>Endpoints disponíveis:</h2>
        <div class="endpoint">
          <h3>POST /validate-token</h3>
          <p>Valida um token de acesso.</p>
          <p>Corpo da requisição: <code>{"token": "SEU_TOKEN"}</code></p>
        </div>
        
        <p>© ${new Date().getFullYear()} LotoBot - Todos os direitos reservados</p>
      </body>
    </html>
  `);
});

// Endpoint para validar tokens
app.post('/validate-token', (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ valid: false, message: 'Token não fornecido' });
  }
  
  // Verificar se o token existe e não expirou
  if (validTokens[token] && new Date(validTokens[token].expiry) > new Date()) {
    return res.json({
      valid: true,
      expiry: validTokens[token].expiry,
      plan: validTokens[token].plan,
      isAdmin: validTokens[token].isAdmin || false
    });
  }
  
  return res.json({ valid: false, message: 'Token inválido ou expirado' });
});

// Endpoint para criar tokens (protegido por chave de API)
app.post('/create-token', (req, res) => {
  const { apiKey, planType, durationDays } = req.body;
  
  // Verificar chave de API
  if (apiKey !== API_SECRET) {
    return res.status(401).json({ success: false, message: 'Chave de API inválida' });
  }
  
  // Gerar token único
  const token = generateUniqueToken();
  
  // Calcular data de expiração
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + (durationDays || 30));
  
  // Armazenar token
  validTokens[token] = {
    expiry: expiry.toISOString(),
    plan: planType || 'basic',
    createdAt: new Date().toISOString()
  };
  
  return res.json({
    success: true,
    token,
    expiry: expiry.toISOString(),
    plan: planType || 'basic'
  });
});

// Endpoint para criar tokens de clientes (acesso vitalício)
app.post('/create-customer-token', (req, res) => {
  const { apiKey } = req.body;
  
  // Verificar chave de API
  if (apiKey !== API_SECRET) {
    return res.status(401).json({ success: false, message: 'Chave de API inválida' });
  }
  
  // Gerar token único
  const token = generateUniqueToken();
  
  // Calcular data de expiração (muito distante para acesso "vitalício")
  const expiry = new Date(2099, 11, 31); // 31/12/2099
  
  // Armazenar token
  validTokens[token] = {
    expiry: expiry.toISOString(),
    plan: 'standard', // Plano único
    createdAt: new Date().toISOString()
  };
  
  return res.json({
    success: true,
    token,
    expiry: expiry.toISOString(),
    plan: 'standard'
  });
});

// Endpoint para listar todos os tokens (protegido)
app.get('/list-tokens', (req, res) => {
  const { apiKey } = req.query;
  
  if (apiKey !== API_SECRET) {
    return res.status(401).json({ success: false, message: 'Chave de API inválida' });
  }
  
  return res.json({
    success: true,
    tokens: validTokens
  });
});

// Endpoint para revogar um token (protegido)
app.post('/revoke-token', (req, res) => {
  const { apiKey, token } = req.body;
  
  if (apiKey !== API_SECRET) {
    return res.status(401).json({ success: false, message: 'Chave de API inválida' });
  }
  
  if (!validTokens[token]) {
    return res.status(404).json({ success: false, message: 'Token não encontrado' });
  }
  
  // Expirar o token imediatamente
  validTokens[token].expiry = new Date(0).toISOString();
  
  return res.json({
    success: true,
    message: 'Token revogado com sucesso'
  });
});

// Função para gerar token único
function generateUniqueToken() {
  // Gerar string aleatória de 10 caracteres
  const randomPart = crypto.randomBytes(5).toString('hex');
  // Adicionar timestamp para garantir unicidade
  const timestampPart = Date.now().toString(36);
  // Combinar as partes
  return `${randomPart}${timestampPart}`.toUpperCase();
}

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor de validação de tokens rodando na porta ${port}`);
});

