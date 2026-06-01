let products = [];

const container = document.getElementById('products-container');
const addBtn = document.getElementById('addBtn');
const modal = document.getElementById('modal');
const closeModal = document.getElementById('closeModal');
const productForm = document.getElementById('productForm');
const modalTitle = document.getElementById('modalTitle');
let editingId = null;

const defaultProducts = [
        {
                "id": "1",
                "name": "M4A1 Patrol",
                "category": "Карабины 5.56",
                "price": 169000,
                "description": "Компактный карабин с хорошей эргономикой для тактических задач.",
                "stock": 9,
                "image": "m4a1.jpeg"
        },
        {
                "id": "2",
                "name": "Glock 17 Gen5",
                "category": "Пистолеты",
                "price": 96000,
                "description": "Служебный пистолет с полимерной рамой и ресурсным стволом.",
                "stock": 21,
                "image": "glock-17.jpeg"
        },
        {
                "id": "3",
                "name": "Remington 870 Tactical",
                "category": "Дробовики",
                "price": 119000,
                "description": "Надежный помповый дробовик для охраны и спорта.",
                "stock": 14,
                "image": "remington-870.jpeg"
        },
        {
                "id": "4",
                "name": "Taurus .44 Hunter",
                "category": "Револьверы",
                "price": 112000,
                "description": "Мощный револьвер с усиленной рамкой и уверенной баллистикой.",
                "stock": 8,
                "image": "taurus-44.jpeg"
        },
        {
                "id": "5",
                "name": "SVD Marksman",
                "category": "Снайперские винтовки",
                "price": 214000,
                "description": "Полуавтоматическая платформа для точной стрельбы на дистанции.",
                "stock": 5,
                "image": "ak-12.jpeg"
        },
        {
                "id": "6",
                "name": "Beretta 92FS",
                "category": "Пистолеты",
                "price": 89000,
                "description": "Классическая стальная платформа 9x19 для тренировок и службы.",
                "stock": 18,
                "image": "glock-17.jpeg"
        },
        {
                "id": "7",
                "name": "MP5 SD",
                "category": "Пистолеты-пулеметы",
                "price": 186000,
                "description": "Компактная система с интегрированным шумоподавлением.",
                "stock": 7,
                "image": "m4a1.jpeg"
        },
        {
                "id": "8",
                "name": "Mossberg 590A1",
                "category": "Дробовики",
                "price": 124000,
                "description": "Прочный помповый дробовик с усиленным стволом.",
                "stock": 11,
                "image": "remington-870.jpeg"
        },
        {
                "id": "9",
                "name": "CZ P-10 C",
                "category": "Пистолеты",
                "price": 91000,
                "description": "Современный полимерный пистолет с коротким и четким спуском.",
                "stock": 16,
                "image": "taurus-44.jpeg"
        },
        {
                "id": "10",
                "name": "AK-12",
                "category": "Штурмовые винтовки",
                "price": 178000,
                "description": "Современная модульная винтовка под платформу 5.45.",
                "stock": 10,
                "image": "ak-12.jpeg"
        }
];
const imageMap = {
        "M4A1 Patrol": "m4a1.jpeg",
        "Glock 17 Gen5": "glock-17.jpeg",
        "Remington 870 Tactical": "remington-870.jpeg",
        "Taurus .44 Hunter": "taurus-44.jpeg",
        "SVD Marksman": "ak-12.jpeg",
        "Beretta 92FS": "glock-17.jpeg",
        "MP5 SD": "m4a1.jpeg",
        "Mossberg 590A1": "remington-870.jpeg",
        "CZ P-10 C": "taurus-44.jpeg",
        "AK-12": "ak-12.jpeg"
};

function loadProducts() {
    const saved = localStorage.getItem('arms_products');
    products = saved ? JSON.parse(saved) : [...defaultProducts];
    if (!saved) saveProducts();
    renderProducts();
}

function saveProducts() {
    localStorage.setItem('arms_products', JSON.stringify(products));
}

function getImageName(name) {
    return imageMap[name] || 'glock-17.jpeg';
}

function renderProducts() {
    if (products.length === 0) {
        container.innerHTML = '<div class="loading">Товаров пока нет</div>';
        return;
    }

    container.innerHTML = products.map((product) => `
        <div class="card" data-id="${product.id}">
            <img class="card__image" src="images/${getImageName(product.name)}" alt="${product.name}"
                 onerror="this.src='images/glock-17.jpeg'">
            <div class="card__content">
                <h3 class="card__title">${product.name}</h3>
                <div class="card__category">${product.category}</div>
                <p class="card__description">${product.description}</p>
                <div class="card__price">${product.price.toLocaleString('ru-RU')} ₽</div>
                <div class="card__stock">В наличии: ${product.stock} шт.</div>
                <div class="card__actions">
                    <button class="card__btn" onclick="openEditModal('${product.id}')">✎ Редактировать</button>
                    <button class="card__btn card__btn--delete" onclick="deleteProduct('${product.id}')">× Удалить</button>
                </div>
            </div>
        </div>
    `).join('');
}

function openEditModal(id) {
    const product = products.find((p) => p.id === id);
    if (!product) return;

    editingId = id;
    modalTitle.textContent = 'Редактировать позицию';
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productDescription').value = product.description;
    document.getElementById('productStock').value = product.stock;
    modal.classList.add('show');
}

function openAddModal() {
    editingId = null;
    modalTitle.textContent = 'Добавить позицию';
    productForm.reset();
    modal.classList.add('show');
}

function deleteProduct(id) {
    if (!confirm('Удалить товар?')) return;

    products = products.filter((p) => p.id !== id);
    saveProducts();
    renderProducts();
}

function saveProduct(event) {
    event.preventDefault();

    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value.trim();
    const price = Number.parseInt(document.getElementById('productPrice').value, 10);
    const description = document.getElementById('productDescription').value.trim();
    const stock = Number.parseInt(document.getElementById('productStock').value, 10);

    if (!name || !category || !price || !description || Number.isNaN(stock)) {
        alert('Заполните все поля');
        return;
    }

    if (editingId) {
        const index = products.findIndex((p) => p.id === editingId);
        if (index !== -1) {
            products[index] = {
                ...products[index],
                name,
                category,
                price,
                description,
                stock,
                image: products[index].image || 'glock-17.jpeg'
            };
        }
    } else {
        const image = imageMap[name] || 'glock-17.jpeg';
        products.push({ id: Date.now().toString(), name, category, price, description, stock, image });
    }

    saveProducts();
    renderProducts();
    modal.classList.remove('show');
    productForm.reset();
}

if (addBtn) addBtn.onclick = openAddModal;
if (closeModal) closeModal.onclick = () => modal.classList.remove('show');
if (productForm) productForm.addEventListener('submit', saveProduct);

window.onclick = (event) => {
    if (event.target === modal) {
        modal.classList.remove('show');
    }
};

window.deleteProduct = deleteProduct;
window.openEditModal = openEditModal;

loadProducts();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((reg) => console.log('Service Worker зарегистрирован:', reg.scope))
            .catch((err) => console.error('Ошибка регистрации SW:', err));
    });
}
