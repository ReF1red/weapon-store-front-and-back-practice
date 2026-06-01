const socket = io('http://localhost:3001');
let products = [];
let editingId = null;

const contentDiv = document.getElementById('app-content');
const homeBtn = document.getElementById('home-btn');
const aboutBtn = document.getElementById('about-btn');
const enableBtn = document.getElementById('enable-push');
const disableBtn = document.getElementById('disable-push');
const VAPID_PUBLIC_KEY = 'BPlv95NfVupqg6SLmbUhZ10wI_Sl9vLIjESmwAEZIGgqVF8eCZA39aJjX9zEzKXqeFjDnn9vF_3Ohbmjbg58z8A';

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

function loadHome() {
    contentDiv.innerHTML = `
        <div class="toolbar"><h2>Каталог оружия</h2><button id="addBtn" class="btn">+ Добавить позицию</button></div>
        <div id="products-container" class="products-grid"><div class="loading">Загрузка...</div></div>
    `;
    loadProducts();
    document.getElementById('addBtn')?.addEventListener('click', openAddModal);
    document.getElementById('closeModal')?.addEventListener('click', () => document.getElementById('modal').classList.remove('show'));
    document.getElementById('productForm')?.addEventListener('submit', saveProduct);
    window.onclick = (e) => { if (e.target === document.getElementById('modal')) document.getElementById('modal').classList.remove('show'); };
}

function loadAbout() {
    contentDiv.innerHTML = `
        <div class="about-content">
            <h2>О приложении</h2>
            <p>Версия 2.0.0</p>
            <p>Бастион - оружейный магазин с офлайн-доступом и уведомлениями.</p>
            <ul><li>Каталог оружия</li><li>Добавление/редактирование/удаление</li><li>Офлайн-режим</li><li>Push-уведомления</li></ul>
            <p>Год создания: 2026</p>
        </div>
    `;
}

function loadProducts() {
    const saved = localStorage.getItem('arms_products');
    products = saved ? JSON.parse(saved) : [...defaultProducts];
    if (!saved) saveProducts();
    renderProducts();
}

function saveProducts() {
    localStorage.setItem('arms_products', JSON.stringify(products));
}

function renderProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;
    if (products.length === 0) { container.innerHTML = '<div class="loading">Товаров пока нет</div>'; return; }

    container.innerHTML = products.map((p) => `
        <div class="card">
            <img class="card__image" src="images/${getImageName(p.name)}" onerror="this.src='images/glock-17.jpeg'">
            <div class="card__content">
                <h3 class="card__title">${p.name}</h3>
                <div class="card__category">${p.category}</div>
                <p class="card__description">${p.description}</p>
                <div class="card__price">${p.price.toLocaleString('ru-RU')} ₽</div>
                <div class="card__stock">В наличии: ${p.stock} шт.</div>
                <button class="card__btn" onclick="window.editProduct('${p.id}')">Редактировать</button>
                <button class="card__btn card__btn--delete" onclick="window.deleteProduct('${p.id}')">Удалить</button>
            </div>
        </div>
    `).join('');
}

function getImageName(name) {
    return imageMap[name] || 'glock-17.jpeg';
}

window.editProduct = (id) => {
    const p = products.find((item) => item.id === id);
    if (!p) return;
    editingId = id;
    document.getElementById('modalTitle').textContent = 'Редактировать позицию';
    document.getElementById('productName').value = p.name;
    document.getElementById('productCategory').value = p.category;
    document.getElementById('productPrice').value = p.price;
    document.getElementById('productDescription').value = p.description;
    document.getElementById('productStock').value = p.stock;
    document.getElementById('modal').classList.add('show');
};

window.deleteProduct = (id) => {
    if (!confirm('Удалить товар?')) return;
    products = products.filter((p) => p.id !== id);
    saveProducts();
    renderProducts();
};

function openAddModal() {
    editingId = null;
    document.getElementById('modalTitle').textContent = 'Добавить позицию';
    document.getElementById('productForm').reset();
    document.getElementById('modal').classList.add('show');
}

function saveProduct(e) {
    e.preventDefault();
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
        if (index !== -1) products[index] = { ...products[index], name, category, price, description, stock };
    } else {
        const newProduct = { id: Date.now().toString(), name, category, price, description, stock, image: imageMap[name] || 'glock-17.jpeg' };
        products.push(newProduct);
        socket.emit('newProduct', newProduct);
    }

    saveProducts();
    renderProducts();
    document.getElementById('modal').classList.remove('show');
    document.getElementById('productForm').reset();
}

socket.on('productAdded', (product) => {
    const notif = document.createElement('div');
    notif.textContent = `Новая позиция добавлена: ${product.name}`;
    notif.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#a86f1b; color:white; padding:12px 20px; border-radius:40px; z-index:1000;';
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
});

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
}

async function subscribeToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) });
        await fetch('http://localhost:3001/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) });
        enableBtn.style.display = 'none';
        disableBtn.style.display = 'inline-block';
    } catch (err) { console.error(err); }
}

async function unsubscribeFromPush() {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
        await fetch('http://localhost:3001/unsubscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
        disableBtn.style.display = 'none';
        enableBtn.style.display = 'inline-block';
    }
}

homeBtn.onclick = () => { homeBtn.classList.add('active'); aboutBtn.classList.remove('active'); loadHome(); };
aboutBtn.onclick = () => { aboutBtn.classList.add('active'); homeBtn.classList.remove('active'); loadAbout(); };
enableBtn.onclick = async () => { await Notification.requestPermission(); await subscribeToPush(); };
disableBtn.onclick = async () => { await unsubscribeFromPush(); };

loadHome();

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
            if (sub) { enableBtn.style.display = 'none'; disableBtn.style.display = 'inline-block'; }
        });
    }).catch((err) => console.error(err));
}
