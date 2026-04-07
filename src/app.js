const express = require('express');
const path = require('path');
require('dotenv').config();
const cors = require('cors');
const helmet = require('helmet');
const errorHandler = require('./middlewares/errorHandler');

// Inicialização da aplicação
const app = express();

const cspDirectives = {
  defaultSrc: ["'self'"],
  baseUri: ["'self'"],
  connectSrc: ["'self'"],
  fontSrc: ["'self'", 'data:'],
  formAction: ["'self'"],
  frameAncestors: ["'none'"],
  imgSrc: ["'self'", 'data:', 'blob:'],
  objectSrc: ["'none'"],
  scriptSrc: ["'self'"],
  scriptSrcAttr: ["'none'"],
  styleSrc: ["'self'"],
};

const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

function getRequestOrigin(req) {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  return `${protocol}://${req.get('host')}`;
}

function corsOriginValidator(origin, callback) {
  if (!origin) {
    callback(null, true);
    return;
  }

  const allowedOrigins = new Set(corsOrigins);

  callback(null, allowedOrigins.has(origin));
}

function corsOptionsDelegate(req, callback) {
  const origin = req.header('Origin');
  const requestOrigin = origin ? getRequestOrigin(req) : null;

  if (!origin || origin === requestOrigin) {
    callback(null, {
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      origin: true,
    });
    return;
  }

  corsOriginValidator(origin, (error, isAllowed) => {
    callback(error, {
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      origin: isAllowed,
    });
  });
}

// Middlewares globais
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: cspDirectives,
    },
  })
);
app.use(cors(corsOptionsDelegate));
app.use(express.json({ limit: '100kb' }));

// Arquivos estáticos (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Rotas da aplicação
const userRoutes = require('./routes/user.routes');
app.use('/usuarios', userRoutes);

const contaRoutes = require('./routes/conta.routes');
app.use('/contas', contaRoutes);

const categoriaRoutes = require('./routes/category.routes');
app.use('/categorias', categoriaRoutes);

const transacaoRoutes = require('./routes/transacao.routes');
app.use('/transacoes', transacaoRoutes);

const salarioRoutes = require('./routes/salario.routes');
app.use('/salarios', salarioRoutes);

const resumoRoutes = require('./routes/resumo.routes');
app.use('/resumo', resumoRoutes);

const listaDesejoRoutes = require('./routes/listaDesejo.routes');
app.use('/lista-desejos', listaDesejoRoutes);

const carteiraRoutes = require('./routes/carteira.routes');
app.use('/carteira', carteiraRoutes);

const historicoRoutes = require('./routes/historico.routes');
app.use('/historico', historicoRoutes);

const faturaRoutes = require('./routes/fatura.routes');
app.use('/faturas', faturaRoutes);

// Middleware global de tratamento de erros (deve ficar por último)
app.use(errorHandler);

module.exports = app;
