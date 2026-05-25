const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');
const bcrypt = require('bcrypt');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

let users = [];
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
  const title = String(product.title || '').trim();
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
  const title = String(raw.title || '').trim();
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

function findProductOr404(id, res) {
  const product = products.find((item) => item.id === id);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return null;
  }
  return product;
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
      title: 'Arms Store API with Auth',
      version: '1.1.0',
      description: 'API для управления каталогом оружейного магазина с авторизацией'
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Локальный сервер'
      }
    ],
    components: {
      schemas: {
        RegisterRequest: {
          type: 'object',
          required: ['email', 'first_name', 'last_name', 'password'],
          properties: {
            email: { type: 'string', example: 'user@test.local' },
            first_name: { type: 'string', example: 'Ivan' },
            last_name: { type: 'string', example: 'Petrov' },
            password: { type: 'string', example: 'qwerty123' }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', example: 'user@test.local' },
            password: { type: 'string', example: 'qwerty123' }
          }
        },
        ProductRequest: {
          type: 'object',
          required: ['title', 'category', 'description', 'price'],
          properties: {
            title: { type: 'string', example: 'AK-12' },
            category: { type: 'string', example: 'Штурмовые винтовки' },
            description: { type: 'string', example: 'Описание товара' },
            price: { type: 'number', example: 145000 },
            stock: { type: 'integer', example: 12 },
            image: { type: 'string', example: 'ak-12.jpeg' }
          }
        }
      }
    },
    paths: {
      '/api/auth/register': {
        post: {
          summary: 'Регистрация пользователя',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RegisterRequest' }
              }
            }
          },
          responses: {
            201: { description: 'Пользователь создан' },
            400: { description: 'Ошибка валидации' },
            409: { description: 'Пользователь уже существует' }
          }
        }
      },
      '/api/auth/login': {
        post: {
          summary: 'Вход пользователя',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginRequest' }
              }
            }
          },
          responses: {
            200: { description: 'Успешный вход' },
            400: { description: 'Ошибка валидации' },
            401: { description: 'Неверные учетные данные' }
          }
        }
      },
      '/api/products': {
        get: {
          summary: 'Список товаров',
          responses: {
            200: { description: 'Список товаров' }
          }
        },
        post: {
          summary: 'Создать товар',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProductRequest' }
              }
            }
          },
          responses: {
            201: { description: 'Товар создан' },
            400: { description: 'Ошибка валидации' }
          }
        }
      },
      '/api/products/{id}': {
        get: {
          summary: 'Получить товар по id',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: {
            200: { description: 'Товар найден' },
            404: { description: 'Товар не найден' }
          }
        },
        put: {
          summary: 'Обновить товар',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProductRequest' }
              }
            }
          },
          responses: {
            200: { description: 'Товар обновлен' },
            400: { description: 'Ошибка валидации' },
            404: { description: 'Товар не найден' }
          }
        },
        delete: {
          summary: 'Удалить товар',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: {
            204: { description: 'Товар удален' },
            404: { description: 'Товар не найден' }
          }
        }
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
    res.status(201).json({
      id: newUser.id,
      email: newUser.email,
      first_name: newUser.first_name,
      last_name: newUser.last_name
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

    const isPasswordValid = await bcrypt.compare(password, user.hashedPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/products', (req, res) => {
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

app.get('/api/products', (req, res) => {
  res.json(products);
});

app.get('/api/products/:id', (req, res) => {
  const product = findProductOr404(req.params.id, res);
  if (!product) return;
  res.json(product);
});

app.put('/api/products/:id', (req, res) => {
  const product = findProductOr404(req.params.id, res);
  if (!product) return;

  const validated = validateProductPayload(req.body);
  if (!validated.ok) {
    return res.status(400).json({ error: validated.error });
  }

  Object.assign(product, validated.value);
  res.json(product);
});

app.delete('/api/products/:id', (req, res) => {
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
