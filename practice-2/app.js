const express = require('express');

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

let products = [
  {
    id: 1,
    name: 'AK-12',
    category: 'Штурмовые винтовки',
    price: 145000,
    stock: 12,
    image: 'ak-12.jpeg',
    description: 'Платформа 5.45 с телескопическим прикладом и возможностью установки оптики.'
  },
  {
    id: 2,
    name: 'M4A1 Patrol',
    category: 'Карабины 5.56',
    price: 169000,
    stock: 9,
    image: 'm4a1.jpeg',
    description: 'Газоотводный карабин для тактических сценариев и тренировок на дистанции.'
  },
  {
    id: 3,
    name: 'Glock 17 Gen5',
    category: 'Пистолеты',
    price: 96000,
    stock: 21,
    image: 'glock-17.jpeg',
    description: 'Служебный пистолет с ударопрочной рамой и стабильной работой автоматики.'
  },
  {
    id: 4,
    name: 'Remington 870 Tactical',
    category: 'Дробовики',
    price: 119000,
    stock: 14,
    image: 'remington-870.jpeg',
    description: 'Помповый дробовик с надежной механикой и удобной посадкой для стрелка.'
  },
  {
    id: 5,
    name: 'Taurus .44 Hunter',
    category: 'Револьверы',
    price: 112000,
    stock: 8,
    image: 'taurus-44.jpeg',
    description: 'Мощный револьвер с усиленной рамкой и улучшенной балансировкой.'
  },
  {
    id: 6,
    name: 'SVD Marksman',
    category: 'Снайперские винтовки',
    price: 214000,
    stock: 5,
    image: 'ak-12.jpeg',
    description: 'Полуавтоматическая винтовка для точной стрельбы на средних и дальних дистанциях.'
  },
  {
    id: 7,
    name: 'Beretta 92FS',
    category: 'Пистолеты',
    price: 89000,
    stock: 18,
    image: 'glock-17.jpeg',
    description: 'Классическая стальная платформа 9x19 с плавной работой автоматики.'
  },
  {
    id: 8,
    name: 'MP5 SD',
    category: 'Пистолеты-пулеметы',
    price: 186000,
    stock: 7,
    image: 'm4a1.jpeg',
    description: 'Компактная система с интегрированным шумоподавлением для тактических задач.'
  },
  {
    id: 9,
    name: 'Mossberg 590A1',
    category: 'Дробовики',
    price: 124000,
    stock: 11,
    image: 'remington-870.jpeg',
    description: 'Прочный помповый дробовик с усиленным стволом и надежной механикой.'
  },
  {
    id: 10,
    name: 'CZ P-10 C',
    category: 'Пистолеты',
    price: 91000,
    stock: 16,
    image: 'taurus-44.jpeg',
    description: 'Современный полимерный пистолет с коротким и четким спуском.'
  }
];

app.get('/products', (req, res) => {
  res.json(products);
});

app.get('/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const product = products.find((item) => item.id === id);

  if (!product) {
    return res.status(404).json({ error: 'Товар не найден' });
  }

  res.json(product);
});

app.post('/products', (req, res) => {
  const { name, category, price, stock, image, description } = req.body;

  if (!name || !category || !Number.isFinite(Number(price))) {
    return res.status(400).json({ error: 'Нужно передать name, category и price' });
  }

  const newProduct = {
    id: products.length ? Math.max(...products.map((item) => item.id)) + 1 : 1,
    name: String(name).trim(),
    category: String(category).trim(),
    price: Number(price),
    stock: Number.isFinite(Number(stock)) ? Number(stock) : 0,
    image: image ? String(image).trim() : 'glock-17.jpeg',
    description: description ? String(description).trim() : ''
  };

  products.push(newProduct);
  res.status(201).json(newProduct);
});

app.put('/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const product = products.find((item) => item.id === id);

  if (!product) {
    return res.status(404).json({ error: 'Товар не найден' });
  }

  const { name, category, price, stock, image, description } = req.body;

  if (name !== undefined) product.name = String(name).trim();
  if (category !== undefined) product.category = String(category).trim();
  if (price !== undefined && Number.isFinite(Number(price))) product.price = Number(price);
  if (stock !== undefined && Number.isFinite(Number(stock))) product.stock = Number(stock);
  if (image !== undefined) product.image = String(image).trim();
  if (description !== undefined) product.description = String(description).trim();

  res.json(product);
});

app.delete('/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = products.findIndex((item) => item.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Товар не найден' });
  }

  products.splice(index, 1);
  res.status(200).json({ message: 'Товар удалён' });
});

app.get('/', (req, res) => {
  res.redirect('/index.html');
});

app.listen(port, () => {
  console.log(`Сервер запущен: http://localhost:${port}`);
});
