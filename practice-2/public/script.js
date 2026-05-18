const container = document.getElementById('products-container');

const renderProducts = (products) => {
  if (!products.length) {
    container.innerHTML = '<div class="error">Каталог пуст</div>';
    return;
  }

  container.innerHTML = products
    .map((product) => {
      const imageName = product.image || getImageName(product.name);
      return `
        <article class="card">
          <img
            class="card__image"
            src="images/${imageName}"
            alt="${product.name}"
            onerror="this.onerror=null;this.src='images/glock-17.jpeg';"
          >
          <div class="card__content">
            <div class="card__meta">
              <span class="badge">${product.category || 'Категория'}</span>
              <span class="badge badge--accent">Остаток: ${product.stock ?? 0}</span>
            </div>
            <h2 class="card__title">${product.name}</h2>
            <p class="card__description">${product.description || 'Описание отсутствует'}</p>

            <div class="card__bottom">
              <p class="card__price">${Number(product.price).toLocaleString('ru-RU')} ₽</p>
              <button class="card__button" type="button">Подробнее</button>
            </div>
          </div>
        </article>
      `;
    })
    .join('');
};

const loadProducts = async () => {
  try {
    const response = await fetch('/products');

    if (!response.ok) {
      throw new Error('Сервер вернул ошибку');
    }

    const products = await response.json();
    renderProducts(products);
  } catch (error) {
    container.innerHTML = `<div class="error">Ошибка загрузки: ${error.message}</div>`;
  }
};

function getImageName(name) {
  const imageMap = {
    'AK-12': 'ak-12.jpeg',
    'M4A1 Patrol': 'm4a1.jpeg',
    'Glock 17 Gen5': 'glock-17.jpeg',
    'Remington 870 Tactical': 'remington-870.jpeg',
    'Taurus .44 Hunter': 'taurus-44.jpeg',
    'SVD Marksman': 'ak-12.jpeg',
    'Beretta 92FS': 'glock-17.jpeg',
    'MP5 SD': 'm4a1.jpeg',
    'Mossberg 590A1': 'remington-870.jpeg',
    'CZ P-10 C': 'taurus-44.jpeg'
  };

  return imageMap[name] || 'glock-17.jpeg';
}

loadProducts();
