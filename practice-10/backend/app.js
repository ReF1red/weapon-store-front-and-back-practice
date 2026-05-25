const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = Number(process.env.PORT) || 3000;

const ACCESS_SECRET = process.env.ACCESS_SECRET || 'arms_store_access_secret_2026';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'arms_store_refresh_secret_2026';
const ACCESS_EXPIRES_IN = process.env.ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || '7d';

app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

let users = [];
let refreshTokens = new Set();
let products = [
  { id: nanoid(6), title: 'AK-12', category: 'Штурмовые винтовки', price: 145000, description: 'Платформа калибра 5.45 для динамической стрельбы и тренировок с навесным оборудованием.', stock: 12, image: 'ak-12.jpeg' },
  { id: nanoid(6), title: 'M4A1 Patrol', category: 'Карабины 5.56', price: 169000, description: 'Компактный карабин с хорошей эргономикой, предназначенный для тактического применения.', stock: 9, image: 'm4a1.jpeg' },
  { id: nanoid(6), title: 'Glock 17 Gen5', category: 'Пистолеты', price: 96000, description: 'Служебный пистолет с полимерной рамой, стабильной автоматикой и ресурсным стволом.', stock: 21, image: 'glock-17.jpeg' },
  { id: nanoid(6), title: 'Remington 870 Tactical', category: 'Дробовики', price: 119000, description: 'Помповая конструкция с надежным затвором и уверенной работой в разных условиях.', stock: 14, image: 'remington-870.jpeg' },
  { id: nanoid(6), title: 'Taurus .44 Hunter', category: 'Револьверы', price: 112000, description: 'Револьвер повышенной мощности с усиленной рамкой и сбалансированной отдачей.', stock: 8, image: 'taurus-44.jpeg' },
  { id: nanoid(6), title: 'SVD Marksman', category: 'Снайперские винтовки', price: 214000, description: 'Полуавтоматическая винтовка для точной стрельбы на средних и дальних дистанциях.', stock: 5, image: 'ak-12.jpeg' },
  { id: nanoid(6), title: 'Beretta 92FS', category: 'Пистолеты', price: 89000, description: 'Классическая стальная платформа 9x19 с плавной работой автоматики.', stock: 18, image: 'glock-17.jpeg' },
  { id: nanoid(6), title: 'MP5 SD', category: 'Пистолеты-пулеметы', price: 186000, description: 'Компактная система с интегрированным шумоподавлением для тактических задач.', stock: 7, image: 'm4a1.jpeg' },
  { id: nanoid(6), title: 'Mossberg 590A1', category: 'Дробовики', price: 124000, description: 'Прочный помповый дробовик с усиленным стволом и надежной механикой.', stock: 11, image: 'remington-870.jpeg' },
  { id: nanoid(6), title: 'CZ P-10 C', category: 'Пистолеты', price: 91000, description: 'Современный полимерный пистолет с коротким и четким спуском.', stock: 16, image: 'taurus-44.jpeg' }
].map(normalizeProductShape);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeProductShape(product) {
  const title = String(product.title || product.name || '').trim();
  return {
    ...product,
    title,
    category: String(product.category || '').trim(),
    description: String(product.description || '').trim(),
    price: Number(product.price),
    stock: Number.isInteger(Number(product.stock)) ? Number(product.stock) : 0,
    image: String(product.image || 'glock-17.jpeg').trim() || 'glock-17.jpeg'
  };
}

function validateProductPayload(raw) {
  const title = String(raw.title || raw.name || '').trim();
  const category = String(raw.category || '').trim();
  const description = String(raw.description || '').trim();
  const price = Number(raw.price);
  const stock = raw.stock === undefined ? 100 : Number(raw.stock);
  const image = String(raw.image || 'glock-17.jpeg').trim() || 'glock-17.jpeg';

  if (!title || !category || !description) {
    return { ok: false, error: 'title, category and description are required' };
  }

  if (!Number.isFinite(price) || price <= 0) {
    return { ok: false, error: 'price must be a positive number' };
  }

  if (!Number.isInteger(stock) || stock < 0) {
    return { ok: false, error: 'stock must be an integer >= 0' };
  }

  return {
    ok: true,
    value: {
      title,
      category,
      price,
      description,
      stock,
      image
    }
  };
}

function findUserByEmail(email) {
  const cleanEmail = normalizeEmail(email);
  return users.find((user) => normalizeEmail(user.email) === cleanEmail);
}

function findUserById(id) {
  return users.find((user) => user.id === id);
}

function findProductOr404(id, res) {
  const product = products.find((item) => item.id === id);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return null;
  }
  return product;
}

function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  try {
    req.user = jwt.verify(token, ACCESS_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function getRefreshTokenFromHeaders(req) {
  const xRefreshToken = String(req.headers['x-refresh-token'] || '').trim();
  if (xRefreshToken) {
    return xRefreshToken;
  }

  const authHeader = String(req.headers.authorization || '');
  const [scheme, token] = authHeader.split(' ');
  if (scheme === 'Bearer' && token) {
    return token.trim();
  }

  return '';
}

app.use((req, res, next) => {
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);
    if (req.method === 'POST' || req.method === 'PUT') {
      console.log('Body:', req.body);
    }
  });
  next();
});

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Arms Store API with Refresh Tokens',
      version: '1.1.0',
      description: 'API для управления каталогом оружейного магазина с JWT и refresh-токенами'
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Локальный сервер'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        RegisterRequest: {
          type: 'object',
          required: ['email', 'first_name', 'last_name', 'password'],
          properties: { email: { type: 'string' }, first_name: { type: 'string' }, last_name: { type: 'string' }, password: { type: 'string' } }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: { email: { type: 'string' }, password: { type: 'string' } }
        },
        ProductRequest: {
          type: 'object',
          required: ['title', 'category', 'description', 'price'],
          properties: { title: { type: 'string' }, category: { type: 'string' }, description: { type: 'string' }, price: { type: 'number' }, stock: { type: 'integer' }, image: { type: 'string' } }
        }
      }
    },
    paths: {
      '/api/auth/register': { post: { summary: 'Регистрация пользователя', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } } }, responses: { 201: { description: 'Пользователь создан' }, 400: { description: 'Ошибка валидации' }, 409: { description: 'Пользователь уже существует' } } } },
      '/api/auth/login': { post: { summary: 'Вход пользователя', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } }, responses: { 200: { description: 'Пара токенов выдана' }, 400: { description: 'Ошибка валидации' }, 401: { description: 'Неверные данные' } } } },
      '/api/auth/refresh': { post: { summary: 'Обновить токены по refresh header', parameters: [{ name: 'x-refresh-token', in: 'header', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Новые токены' }, 400: { description: 'Нет refresh token в header' }, 401: { description: 'Refresh token невалиден' } } } },
      '/api/auth/logout': { post: { summary: 'Логаут (инвалидация refresh token)', parameters: [{ name: 'x-refresh-token', in: 'header', required: false, schema: { type: 'string' } }], responses: { 200: { description: 'Выход выполнен' } } } },
      '/api/auth/me': { get: { summary: 'Текущий пользователь', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Данные пользователя' }, 401: { description: 'Нет/невалидный токен' } } } },
      '/api/products': {
        get: { summary: 'Список товаров', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Список товаров' }, 401: { description: 'Нет токена' } } },
        post: { summary: 'Создать товар', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductRequest' } } } }, responses: { 201: { description: 'Товар создан' }, 400: { description: 'Ошибка валидации' }, 401: { description: 'Нет токена' } } }
      },
      '/api/products/{id}': {
        get: { summary: 'Товар по id', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Товар найден' }, 401: { description: 'Нет токена' }, 404: { description: 'Товар не найден' } } },
        put: { summary: 'Обновить товар', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductRequest' } } } }, responses: { 200: { description: 'Товар обновлен' }, 400: { description: 'Ошибка валидации' }, 401: { description: 'Нет токена' }, 404: { description: 'Товар не найден' } } },
        delete: { summary: 'Удалить товар', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 204: { description: 'Товар удален' }, 401: { description: 'Нет токена' }, 404: { description: 'Товар не найден' } } }
      }
    }
  },
  apis: ['./app.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.post('/api/auth/register', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const firstName = String(req.body.first_name || '').trim();
    const lastName = String(req.body.last_name || '').trim();
    const password = String(req.body.password || '');

    if (!email || !firstName || !lastName || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (findUserByEmail(email)) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      id: nanoid(6),
      email,
      first_name: firstName,
      last_name: lastName,
      hashedPassword
    };

    users.push(newUser);
    res.status(201).json({ id: newUser.id, email: newUser.email, first_name: newUser.first_name, last_name: newUser.last_name });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    refreshTokens.add(refreshToken);

    res.status(200).json({ accessToken, refreshToken });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/refresh', (req, res) => {
  const refreshToken = getRefreshTokenFromHeaders(req);

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token header is required' });
  }

  if (!refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = findUserById(payload.sub);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    refreshTokens.delete(refreshToken);

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    refreshTokens.add(newRefreshToken);

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const refreshToken = getRefreshTokenFromHeaders(req);
  if (refreshToken) {
    refreshTokens.delete(refreshToken);
  }
  res.json({ success: true });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = findUserById(req.user.sub);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name });
});

app.post('/api/products', authMiddleware, (req, res) => {
  const validated = validateProductPayload(req.body);
  if (!validated.ok) {
    return res.status(400).json({ error: validated.error });
  }

  const newProduct = {
    id: nanoid(6),
    ...validated.value
  };

  products.push(newProduct);
  res.status(201).json(newProduct);
});

app.get('/api/products', authMiddleware, (req, res) => {
  res.json(products);
});

app.get('/api/products/:id', authMiddleware, (req, res) => {
  const product = findProductOr404(req.params.id, res);
  if (!product) return;
  res.json(product);
});

app.put('/api/products/:id', authMiddleware, (req, res) => {
  const product = findProductOr404(req.params.id, res);
  if (!product) return;

  const validated = validateProductPayload(req.body);
  if (!validated.ok) {
    return res.status(400).json({ error: validated.error });
  }

  Object.assign(product, validated.value);
  res.json(product);
});

app.delete('/api/products/:id', authMiddleware, (req, res) => {
  const exists = products.some((item) => item.id === req.params.id);

  if (!exists) {
    return res.status(404).json({ error: 'Product not found' });
  }

  products = products.filter((item) => item.id !== req.params.id);
  res.status(204).send();
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Swagger UI available at http://localhost:${port}/api-docs`);
});
