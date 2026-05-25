const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
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
const COOKIE_SECURE = process.env.COOKIE_SECURE === 'true';
const HOST = process.env.HOST || '127.0.0.1';

const dataDir = path.join(__dirname, 'data');
const usersFile = path.join(dataDir, 'users.json');
const productsFile = path.join(dataDir, 'products.json');

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

let users = [];
let products = [];
let refreshTokens = new Set();

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeProductShape(product) {
  const title = String(product.title || product.name || '').trim();
  return {
    id: String(product.id || nanoid(6)),
    title,
    category: String(product.category || '').trim(),
    price: Number(product.price),
    description: String(product.description || '').trim(),
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

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function loadJson(filePath, fallback) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return fallback;
  }
}

function saveUsers() {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

function saveProducts() {
  fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
}

async function hydrateData() {
  ensureDataDir();

  const rawUsers = loadJson(usersFile, []);
  users = [];

  for (const rawUser of rawUsers) {
    const email = normalizeEmail(rawUser.email);
    const firstName = String(rawUser.first_name || '').trim();
    const lastName = String(rawUser.last_name || '').trim();
    const role = ['user', 'seller', 'admin'].includes(rawUser.role) ? rawUser.role : 'user';
    const isActive = rawUser.isActive !== false;

    let hashedPassword = String(rawUser.hashedPassword || '');
    const plainPassword = String(rawUser.password || '');

    if (!hashedPassword && plainPassword) {
      hashedPassword = await bcrypt.hash(plainPassword, 10);
    }

    if (!email || !firstName || !lastName || !hashedPassword) {
      continue;
    }

    users.push({
      id: String(rawUser.id || nanoid(6)),
      email,
      first_name: firstName,
      last_name: lastName,
      role,
      hashedPassword,
      isActive
    });
  }

  const rawProducts = loadJson(productsFile, []);
  products = rawProducts
    .map(normalizeProductShape)
    .filter((product) => (
      product.title
      && product.category
      && product.description
      && Number.isFinite(product.price)
      && product.price > 0
      && Number.isInteger(product.stock)
      && product.stock >= 0
    ));

  saveUsers();
  saveProducts();
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
    { sub: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
}

function setAuthCookies(res, accessToken, refreshToken) {
  const common = {
    httpOnly: true,
    sameSite: 'lax',
    secure: COOKIE_SECURE
  };

  res.cookie('accessToken', accessToken, { ...common, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...common, maxAge: 7 * 24 * 60 * 60 * 1000 });
}

function authMiddleware(req, res, next) {
  const cookieToken = req.cookies.accessToken;
  const header = req.headers.authorization || '';
  const [scheme, bearerToken] = header.split(' ');
  const token = cookieToken || (scheme === 'Bearer' ? bearerToken : null);

  if (!token) {
    return res.status(401).json({ error: 'No access token' });
  }

  try {
    req.user = jwt.verify(token, ACCESS_SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function roleMiddleware(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient rights' });
    }

    next();
  };
}

app.use((req, res, next) => {
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);
  });
  next();
});

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Arms Store API',
      version: '1.1.0',
      description: 'API для управления каталогом оружейного магазина с ролями и корзиной'
    },
    servers: [{ url: `http://localhost:${port}` }],
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
        UserUpdateRequest: {
          type: 'object',
          properties: { first_name: { type: 'string' }, last_name: { type: 'string' }, role: { type: 'string', enum: ['user', 'seller', 'admin'] }, isActive: { type: 'boolean' }, password: { type: 'string' } }
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
      '/api/auth/login': { post: { summary: 'Вход пользователя', requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } }, responses: { 200: { description: 'Успешный вход' }, 400: { description: 'Ошибка валидации' }, 401: { description: 'Неверные данные' } } } },
      '/api/auth/refresh': { post: { summary: 'Обновить сессию по refresh cookie', responses: { 200: { description: 'Сессия обновлена' }, 400: { description: 'Нет refresh token' }, 401: { description: 'Refresh token невалиден' } } } },
      '/api/auth/logout': { post: { summary: 'Выход из системы', responses: { 200: { description: 'Выход выполнен' } } } },
      '/api/auth/me': { get: { summary: 'Текущий пользователь', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Данные пользователя' }, 401: { description: 'Нет/невалидный токен' } } } },
      '/api/users': { get: { summary: 'Список пользователей (admin)', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Список пользователей' }, 403: { description: 'Недостаточно прав' } } } },
      '/api/users/{id}': {
        get: { summary: 'Пользователь по id (admin)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Пользователь найден' }, 403: { description: 'Недостаточно прав' }, 404: { description: 'Пользователь не найден' } } },
        put: { summary: 'Обновить пользователя (admin)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/UserUpdateRequest' } } } }, responses: { 200: { description: 'Пользователь обновлен' }, 400: { description: 'Ошибка валидации' }, 403: { description: 'Недостаточно прав' }, 404: { description: 'Пользователь не найден' } } },
        delete: { summary: 'Блокировка пользователя (admin)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Пользователь заблокирован' }, 403: { description: 'Недостаточно прав' }, 404: { description: 'Пользователь не найден' } } }
      },
      '/api/products': {
        get: { summary: 'Список товаров (user/seller/admin)', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Список товаров' }, 401: { description: 'Нет токена' }, 403: { description: 'Недостаточно прав' } } },
        post: { summary: 'Создать товар (seller/admin)', security: [{ bearerAuth: [] }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductRequest' } } } }, responses: { 201: { description: 'Товар создан' }, 400: { description: 'Ошибка валидации' }, 403: { description: 'Недостаточно прав' } } }
      },
      '/api/products/{id}': {
        get: { summary: 'Товар по id (user/seller/admin)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Товар найден' }, 403: { description: 'Недостаточно прав' }, 404: { description: 'Товар не найден' } } },
        put: { summary: 'Обновить товар (seller/admin)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductRequest' } } } }, responses: { 200: { description: 'Товар обновлен' }, 400: { description: 'Ошибка валидации' }, 403: { description: 'Недостаточно прав' }, 404: { description: 'Товар не найден' } } },
        delete: { summary: 'Удалить товар (seller/admin)', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 204: { description: 'Товар удален' }, 403: { description: 'Недостаточно прав' }, 404: { description: 'Товар не найден' } } }
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
      role: 'user',
      hashedPassword,
      isActive: true
    };

    users.push(newUser);
    saveUsers();

    res.status(201).json({
      id: newUser.id,
      email: newUser.email,
      first_name: newUser.first_name,
      last_name: newUser.last_name,
      role: newUser.role
    });
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

    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is blocked' });
    }

    const isValid = await bcrypt.compare(password, user.hashedPassword);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    refreshTokens.add(refreshToken);

    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/refresh', (req, res) => {
  const refreshToken = String(req.cookies.refreshToken || req.body.refreshToken || '').trim();

  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken is required' });
  }

  if (!refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = findUserById(payload.sub);

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found or blocked' });
    }

    refreshTokens.delete(refreshToken);

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    refreshTokens.add(newRefreshToken);

    setAuthCookies(res, newAccessToken, newRefreshToken);
    res.json({ success: true });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const refreshToken = String(req.cookies.refreshToken || req.body.refreshToken || '').trim();

  if (refreshToken) {
    refreshTokens.delete(refreshToken);
  }

  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  res.json({ success: true });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const user = findUserById(req.user.sub);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role });
});

app.get('/api/users', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const safeUsers = users.map((item) => ({
    id: item.id,
    email: item.email,
    first_name: item.first_name,
    last_name: item.last_name,
    role: item.role,
    isActive: item.isActive
  }));
  res.json(safeUsers);
});

app.get('/api/users/:id', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const user = findUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role, isActive: user.isActive });
});

app.put('/api/users/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  try {
    const user = findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const firstName = req.body.first_name === undefined ? user.first_name : String(req.body.first_name).trim();
    const lastName = req.body.last_name === undefined ? user.last_name : String(req.body.last_name).trim();
    const role = req.body.role === undefined ? user.role : String(req.body.role);
    const isActive = req.body.isActive === undefined ? user.isActive : Boolean(req.body.isActive);
    const password = req.body.password === undefined ? '' : String(req.body.password);

    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'first_name and last_name cannot be empty' });
    }

    if (!['user', 'seller', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (req.user.sub === user.id && role !== 'admin') {
      return res.status(400).json({ error: 'Admin cannot remove own admin role' });
    }

    if (req.user.sub === user.id && !isActive) {
      return res.status(400).json({ error: 'Admin cannot block own account' });
    }

    user.first_name = firstName;
    user.last_name = lastName;
    user.role = role;
    user.isActive = isActive;

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      user.hashedPassword = await bcrypt.hash(password, 10);
    }

    saveUsers();

    res.json({ id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, role: user.role, isActive: user.isActive });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/users/:id', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const user = findUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (req.user.sub === user.id) {
    return res.status(400).json({ error: 'You cannot block your own account' });
  }

  user.isActive = false;
  saveUsers();
  res.json({ message: 'User blocked' });
});

app.post('/api/products', authMiddleware, roleMiddleware(['seller', 'admin']), (req, res) => {
  const validated = validateProductPayload(req.body);
  if (!validated.ok) {
    return res.status(400).json({ error: validated.error });
  }

  const newProduct = {
    id: nanoid(6),
    ...validated.value
  };

  products.push(newProduct);
  saveProducts();
  res.status(201).json(newProduct);
});

app.get('/api/products', authMiddleware, roleMiddleware(['user', 'seller', 'admin']), (req, res) => {
  res.json(products);
});

app.get('/api/products/:id', authMiddleware, roleMiddleware(['user', 'seller', 'admin']), (req, res) => {
  const product = findProductOr404(req.params.id, res);
  if (!product) return;
  res.json(product);
});

app.put('/api/products/:id', authMiddleware, roleMiddleware(['seller', 'admin']), (req, res) => {
  const product = findProductOr404(req.params.id, res);
  if (!product) return;

  const validated = validateProductPayload(req.body);
  if (!validated.ok) {
    return res.status(400).json({ error: validated.error });
  }

  Object.assign(product, validated.value);
  saveProducts();
  res.json(product);
});

app.delete('/api/products/:id', authMiddleware, roleMiddleware(['seller', 'admin']), (req, res) => {
  const exists = products.some((item) => item.id === req.params.id);
  if (!exists) {
    return res.status(404).json({ error: 'Product not found' });
  }

  products = products.filter((item) => item.id !== req.params.id);
  saveProducts();
  res.status(204).send();
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

hydrateData().then(() => {
  app.listen(port, HOST, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Swagger UI available at http://localhost:${port}/api-docs`);
  });
});
