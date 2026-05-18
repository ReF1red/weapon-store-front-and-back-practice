const express = require('express');
const cors = require('cors');
const { nanoid } = require('nanoid');

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 3000;

app.use(express.json());
app.use(
  cors({
    origin: 'http://localhost:3001',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

const initialProducts = [
  {
    name: 'AK-12',
    category: 'Штурмовые винтовки',
    price: 145000,
    description: 'Платформа калибра 5.45 для динамической стрельбы и тренировок с навесным оборудованием.',
    stock: 12,
    image: 'ak-12.jpeg'
  },
  {
    name: 'M4A1 Patrol',
    category: 'Карабины 5.56',
    price: 169000,
    description: 'Компактный карабин с хорошей эргономикой, предназначенный для тактического применения.',
    stock: 9,
    image: 'm4a1.jpeg'
  },
  {
    name: 'Glock 17 Gen5',
    category: 'Пистолеты',
    price: 96000,
    description: 'Служебный пистолет с полимерной рамой, стабильной автоматикой и ресурсным стволом.',
    stock: 21,
    image: 'glock-17.jpeg'
  },
  {
    name: 'Remington 870 Tactical',
    category: 'Дробовики',
    price: 119000,
    description: 'Помповая конструкция с надежным затвором и уверенной работой в разных условиях.',
    stock: 14,
    image: 'remington-870.jpeg'
  },
  {
    name: 'Taurus .44 Hunter',
    category: 'Револьверы',
    price: 112000,
    description: 'Револьвер повышенной мощности с усиленной рамкой и сбалансированной отдачей.',
    stock: 8,
    image: 'taurus-44.jpeg'
  },
  {
    name: 'SVD Marksman',
    category: 'Снайперские винтовки',
    price: 214000,
    description: 'Полуавтоматическая винтовка для точной стрельбы на средних и дальних дистанциях.',
    stock: 5,
    image: 'ak-12.jpeg'
  },
  {
    name: 'Beretta 92FS',
    category: 'Пистолеты',
    price: 89000,
    description: 'Классическая стальная платформа 9x19 с плавной работой автоматики.',
    stock: 18,
    image: 'glock-17.jpeg'
  },
  {
    name: 'MP5 SD',
    category: 'Пистолеты-пулеметы',
    price: 186000,
    description: 'Компактная система с интегрированным шумоподавлением для тактических задач.',
    stock: 7,
    image: 'm4a1.jpeg'
  },
  {
    name: 'Mossberg 590A1',
    category: 'Дробовики',
    price: 124000,
    description: 'Прочный помповый дробовик с усиленным стволом и надежной механикой.',
    stock: 11,
    image: 'remington-870.jpeg'
  },
  {
    name: 'CZ P-10 C',
    category: 'Пистолеты',
    price: 91000,
    description: 'Современный полимерный пистолет с коротким и четким спуском.',
    stock: 16,
    image: 'taurus-44.jpeg'
  }
];

let products = initialProducts.map((item) => ({
  id: nanoid(6),
  ...item
}));

function findProductOr404(id, res) {
  const product = products.find((item) => item.id === id);

  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return null;
  }

  return product;
}

function normalizeIncomingPayload(payload) {
  return {
    name: payload.name !== undefined ? String(payload.name).trim() : undefined,
    category: payload.category !== undefined ? String(payload.category).trim() : undefined,
    description: payload.description !== undefined ? String(payload.description).trim() : undefined,
    image: payload.image !== undefined ? String(payload.image).trim() : undefined,
    price: payload.price !== undefined ? Number(payload.price) : undefined,
    stock: payload.stock !== undefined ? Number(payload.stock) : undefined
  };
}

app.use((req, res, next) => {
  res.on('finish', () => {
    console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);
    if (req.method === 'POST' || req.method === 'PATCH') {
      console.log('Body:', req.body);
    }
  });
  next();
});

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Arms Store API',
      version: '1.0.0',
      description: 'API для управления каталогом оружейного магазина'
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Локальный сервер'
      }
    ]
  },
  apis: ['./app.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - name
 *         - category
 *         - price
 *         - description
 *         - stock
 *       properties:
 *         id:
 *           type: string
 *           description: Уникальный ID товара
 *         name:
 *           type: string
 *           description: Название модели
 *         category:
 *           type: string
 *           description: Категория оружия
 *         price:
 *           type: integer
 *           description: Цена в рублях
 *         description:
 *           type: string
 *           description: Описание и характеристики
 *         stock:
 *           type: integer
 *           description: Количество на складе
 *         image:
 *           type: string
 *           description: Имя файла изображения из public/images
 *       example:
 *         id: "abc123"
 *         name: "Glock 17 Gen5"
 *         category: "Пистолеты"
 *         price: 96000
 *         description: "Служебный пистолет с полимерной рамой и стабильной автоматикой"
 *         stock: 21
 *         image: "glock-17.jpeg"
 */

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создать новый товар
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       201:
 *         description: Товар успешно создан
 *       400:
 *         description: Ошибка в данных запроса
 */
app.post('/api/products', (req, res) => {
  const payload = normalizeIncomingPayload(req.body ?? {});

  if (!payload.name || !payload.category || !payload.description) {
    return res.status(400).json({ error: 'Missing required text fields' });
  }

  if (!Number.isFinite(payload.price) || payload.price <= 0) {
    return res.status(400).json({ error: 'Price must be a positive number' });
  }

  if (!Number.isInteger(payload.stock) || payload.stock < 0) {
    return res.status(400).json({ error: 'Stock must be a non-negative integer' });
  }

  const newProduct = {
    id: nanoid(6),
    name: payload.name,
    category: payload.category,
    price: payload.price,
    description: payload.description,
    stock: payload.stock,
    image: payload.image || 'glock-17.jpeg'
  };

  products.push(newProduct);
  res.status(201).json(newProduct);
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Получить список всех товаров
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Список товаров
 */
app.get('/api/products', (req, res) => {
  res.json(products);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получить товар по ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID товара
 *     responses:
 *       200:
 *         description: Данные товара
 *       404:
 *         description: Товар не найден
 */
app.get('/api/products/:id', (req, res) => {
  const product = findProductOr404(req.params.id, res);
  if (!product) return;

  res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   patch:
 *     summary: Обновить товар
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID товара
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       200:
 *         description: Обновлённый товар
 *       400:
 *         description: Ошибка данных
 *       404:
 *         description: Товар не найден
 */
app.patch('/api/products/:id', (req, res) => {
  const product = findProductOr404(req.params.id, res);
  if (!product) return;

  const payload = normalizeIncomingPayload(req.body ?? {});

  if (
    payload.name === undefined &&
    payload.category === undefined &&
    payload.price === undefined &&
    payload.description === undefined &&
    payload.stock === undefined &&
    payload.image === undefined
  ) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  if (payload.name !== undefined) {
    if (!payload.name) return res.status(400).json({ error: 'Name cannot be empty' });
    product.name = payload.name;
  }

  if (payload.category !== undefined) {
    if (!payload.category) return res.status(400).json({ error: 'Category cannot be empty' });
    product.category = payload.category;
  }

  if (payload.description !== undefined) {
    if (!payload.description) return res.status(400).json({ error: 'Description cannot be empty' });
    product.description = payload.description;
  }

  if (payload.price !== undefined) {
    if (!Number.isFinite(payload.price) || payload.price <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }
    product.price = payload.price;
  }

  if (payload.stock !== undefined) {
    if (!Number.isInteger(payload.stock) || payload.stock < 0) {
      return res.status(400).json({ error: 'Stock must be a non-negative integer' });
    }
    product.stock = payload.stock;
  }

  if (payload.image !== undefined) {
    product.image = payload.image || 'glock-17.jpeg';
  }

  res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удалить товар
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID товара
 *     responses:
 *       204:
 *         description: Товар удалён
 *       404:
 *         description: Товар не найден
 */
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
