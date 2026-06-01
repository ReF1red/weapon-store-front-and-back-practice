const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { nanoid } = require('nanoid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const webpush = require('web-push');
const socketIo = require('socket.io');

const app = express();
const HTTPS_PORT = 3443;

const ACCESS_SECRET = 'bastion_store_access_secret_2026';
const REFRESH_SECRET = 'bastion_store_refresh_secret_2026';
const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';
const VAPID_PUBLIC_KEY = 'BPlv95NfVupqg6SLmbUhZ10wI_Sl9vLIjESmwAEZIGgqVF8eCZA39aJjX9zEzKXqeFjDnn9vF_3Ohbmjbg58z8A';
const VAPID_PRIVATE_KEY = 'hZasvuyoECCoyET6oR_A_zbbHC6BWEV5uIc42HX0ZlY';

webpush.setVapidDetails('mailto:arms@shop.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const usersFile = path.join(__dirname, 'data', 'users.json');
const productsFile = path.join(__dirname, 'data', 'products.json');
const subscriptionsFile = path.join(__dirname, 'data', 'subscriptions.json');
const remindersFile = path.join(__dirname, 'data', 'reminders.json');

let users = [];
let products = [];
let refreshTokens = new Set();
let subscriptions = [];
const reminders = new Map();

function loadUsers() {
    try {
        users = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
    } catch (err) {
        users = [];
    }
}

function saveUsers() {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

function loadProducts() {
    try {
        products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
    } catch (err) {
        products = [];
    }
}

function saveProducts() {
    fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
}

function loadSubscriptions() {
    try {
        const parsed = JSON.parse(fs.readFileSync(subscriptionsFile, 'utf8'));
        if (!Array.isArray(parsed)) {
            subscriptions = [];
            return;
        }

        const dedup = new Map();
        parsed.forEach((sub) => {
            if (!isValidSubscriptionPayload(sub)) return;
            if (dedup.has(sub.endpoint)) {
                const prev = dedup.get(sub.endpoint);
                dedup.set(sub.endpoint, {
                    ...prev,
                    ...sub,
                    // Не даем null перетирать ранее известного владельца.
                    userId: sub.userId ?? prev.userId ?? null
                });
            } else {
                dedup.set(sub.endpoint, {
                    userId: sub.userId ?? null,
                    endpoint: sub.endpoint,
                    keys: sub.keys
                });
            }
        });

        subscriptions = Array.from(dedup.values());
    } catch (err) {
        subscriptions = [];
    }
}

function saveSubscriptions() {
    fs.writeFileSync(subscriptionsFile, JSON.stringify(subscriptions, null, 2));
}

function saveRemindersSnapshot() {
    const snapshot = Array.from(reminders.entries()).map(([id, value]) => ({
        id: Number(id),
        text: value.text,
        reminderTime: value.reminderTime,
        userId: value.userId ?? null
    }));
    fs.writeFileSync(remindersFile, JSON.stringify(snapshot, null, 2));
}

function initializeDefaultUsers() {
    if (users.length > 0) return;

    users = [
        {
            id: 'admin1',
            email: 'admin@email.com',
            first_name: 'Admin',
            last_name: 'Bastion',
            role: 'admin',
            hashedPassword: bcrypt.hashSync('qwerty123', 10),
            isActive: true
        },
        {
            id: 'seller1',
            email: 'seller@email.com',
            first_name: 'Seller',
            last_name: 'Bastion',
            role: 'seller',
            hashedPassword: bcrypt.hashSync('qwerty123', 10),
            isActive: true
        },
        {
            id: 'user1',
            email: 'user@email.com',
            first_name: 'User',
            last_name: 'Bastion',
            role: 'user',
            hashedPassword: bcrypt.hashSync('qwerty123', 10),
            isActive: true
        }
    ];

    saveUsers();
}

function findUserByEmail(email) {
    return users.find((u) => u.email === email);
}

function findUserById(id) {
    return users.find((u) => u.id === id);
}

function findProductById(id) {
    return products.find((p) => p.id === id);
}

function generateAccessToken(user) {
    return jwt.sign({ sub: user.id, email: user.email, role: user.role }, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

function generateRefreshToken(user) {
    return jwt.sign({ sub: user.id, email: user.email, role: user.role }, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}

function authMiddleware(req, res, next) {
    const token = req.cookies.accessToken;
    if (!token) {
        return res.status(401).json({ error: 'No access token' });
    }

    try {
        req.user = jwt.verify(token, ACCESS_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

function resolveUserIdFromCookie(req) {
    const token = req.cookies?.accessToken;
    if (!token) return null;
    try {
        const payload = jwt.verify(token, ACCESS_SECRET);
        return payload?.sub || null;
    } catch (error) {
        return null;
    }
}

function decodeBase64Url(value) {
    if (typeof value !== 'string' || value.length === 0) return null;
    try {
        const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
        return Buffer.from(padded, 'base64');
    } catch (error) {
        return null;
    }
}

function isValidSubscriptionPayload(subscription) {
    if (!subscription || typeof subscription !== 'object') return false;
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) return false;

    let endpointUrl;
    try {
        endpointUrl = new URL(subscription.endpoint);
    } catch (error) {
        return false;
    }

    if (endpointUrl.protocol !== 'https:') return false;

    const p256dh = decodeBase64Url(subscription.keys.p256dh);
    const auth = decodeBase64Url(subscription.keys.auth);

    // По стандарту Web Push p256dh = 65 байт (uncompressed EC point), auth обычно 16 байт.
    if (!p256dh || p256dh.length !== 65) return false;
    if (!auth || auth.length < 16) return false;

    return true;
}

function roleMiddleware(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden: insufficient rights' });
        }
        next();
    };
}

async function notifySubscriptions(payload, targetSubscriptions) {
    const list = Array.isArray(targetSubscriptions) ? targetSubscriptions : [];

    if (list.length === 0) {
        return {
            total: 0,
            success: 0,
            failed: 0,
            pruned: 0,
            errors: []
        };
    }

    const current = [...list];
    const results = await Promise.allSettled(current.map((sub) => webpush.sendNotification(sub, payload)));
    const alive = [];
    const errors = [];
    let pruned = 0;
    let success = 0;

    results.forEach((result, index) => {
        const sub = current[index];
        if (result.status === 'fulfilled') {
            success += 1;
            alive.push(sub);
            return;
        }

        const statusCode = result.reason?.statusCode || null;
        const message = result.reason?.message || 'unknown error';
        const hasInvalidKeys = /p256dh value should be 65 bytes long/i.test(message)
            || /auth value should be/i.test(message)
            || /invalid subscription/i.test(message);
        const isGone = statusCode === 404 || statusCode === 410 || hasInvalidKeys;

        errors.push({
            endpoint: sub?.endpoint,
            statusCode,
            message
        });

        if (isGone) {
            pruned += 1;
        } else {
            alive.push(sub);
        }
        console.error('Push notification error:', message);
    });

    if (pruned > 0) {
        const prunedEndpoints = new Set(current.filter((sub) => !alive.some((item) => item.endpoint === sub.endpoint)).map((sub) => sub.endpoint));
        subscriptions = subscriptions.filter((sub) => !prunedEndpoints.has(sub.endpoint));
        saveSubscriptions();
    }

    return {
        total: current.length,
        success,
        failed: current.length - success,
        pruned,
        errors
    };
}

async function notifyAll(payload) {
    return notifySubscriptions(payload, subscriptions);
}

function scheduleReminder(reminderId, text, reminderTime, userId = null) {
    const delay = Math.max(0, reminderTime - Date.now());
    console.log(`[reminder] schedule id=${reminderId} in ${delay}ms at ${new Date(reminderTime).toISOString()}`);

    const timeoutId = setTimeout(async () => {
        console.log(`[reminder] trigger id=${reminderId}; subscriptions=${subscriptions.length}`);
        const payload = JSON.stringify({
            title: 'Напоминание',
            body: text,
            icon: '/icons/icon-128.png',
            badge: '/icons/icon-96.png',
            data: { type: 'reminder', reminderId }
        });

        const userSubscriptions = userId ? subscriptions.filter((sub) => sub.userId === userId) : [];
        const targetSubscriptions = userSubscriptions.length > 0 ? userSubscriptions : subscriptions;
        const pushStats = await notifySubscriptions(payload, targetSubscriptions);
        console.log(`[reminder] push stats id=${reminderId}:`, pushStats);
        reminders.delete(reminderId);
        saveRemindersSnapshot();
    }, delay);

    reminders.set(reminderId, { timeoutId, text, reminderTime, userId });
    saveRemindersSnapshot();
}

function restoreReminders() {
    let snapshot = [];
    try {
        snapshot = JSON.parse(fs.readFileSync(remindersFile, 'utf8'));
    } catch (err) {
        snapshot = [];
    }

    const now = Date.now();
    snapshot
        .filter((item) => item && Number(item.id) && Number(item.reminderTime) && item.text)
        .forEach((item) => {
            if (item.reminderTime > now) {
                scheduleReminder(Number(item.id), String(item.text), Number(item.reminderTime), item.userId || null);
            }
        });

    saveRemindersSnapshot();
}

function clearSaleFields(category) {
    products.forEach((product) => {
        if (!category || product.category === category) {
            delete product.discountPercent;
            delete product.discountStartTime;
            delete product.discountEndTime;
        }
    });
    saveProducts();
}

loadUsers();
loadProducts();
loadSubscriptions();
initializeDefaultUsers();
restoreReminders();

app.use(cors({
    origin: [
        'https://localhost:3443',
        'https://localhost:3001',
        'https://localhost:3000',
        'http://localhost:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'frontend', 'build')));

app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, first_name, last_name, password } = req.body;
        if (!email || !first_name || !last_name || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (findUserByEmail(email)) {
            return res.status(409).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: nanoid(8),
            email,
            first_name,
            last_name,
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
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = findUserByEmail(email);
        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'Invalid credentials or account blocked' });
        }

        const isValid = await bcrypt.compare(password, user.hashedPassword);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);
        refreshTokens.add(refreshToken);

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

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
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken || !refreshTokens.has(refreshToken)) {
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

        res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000
        });

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({ success: true });
    } catch (err) {
        res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    const refreshToken = req.cookies.refreshToken;
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

    res.json({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        isActive: user.isActive
    });
});

app.get('/api/users', authMiddleware, roleMiddleware('admin'), (req, res) => {
    res.json(users.map((u) => ({
        id: u.id,
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        role: u.role,
        isActive: u.isActive
    })));
});

app.put('/api/users/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
    const user = findUserById(req.params.id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    const { first_name, last_name, role, isActive, password } = req.body;
    if (first_name) user.first_name = first_name;
    if (last_name) user.last_name = last_name;
    if (role && ['user', 'seller', 'admin'].includes(role)) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (password) user.hashedPassword = await bcrypt.hash(password, 10);

    saveUsers();

    res.json({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        isActive: user.isActive
    });
});

app.delete('/api/users/:id', authMiddleware, roleMiddleware('admin'), (req, res) => {
    const user = findUserById(req.params.id);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    user.isActive = false;
    saveUsers();
    res.json({ message: 'User blocked successfully' });
});

app.get('/api/products', (req, res) => {
    res.json(products);
});

app.get('/api/products/:id', (req, res) => {
    const product = findProductById(req.params.id);
    if (!product) {
        return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
});

app.post('/api/products', authMiddleware, roleMiddleware('seller', 'admin'), (req, res) => {
    const { name, category, price, description, stock } = req.body;
    if (!name || !category || !price || !description) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const newProduct = {
        id: nanoid(8),
        name: name.trim(),
        category: category.trim(),
        price: Number(price),
        description: description.trim(),
        stock: stock !== undefined ? Number(stock) : 100
    };

    products.push(newProduct);
    saveProducts();

    const payload = JSON.stringify({
        title: 'Новая позиция в Бастионе',
        body: `${newProduct.name} добавлен в каталог`,
        icon: '/icons/icon-128.png',
        badge: '/icons/icon-96.png',
        data: { type: 'catalog', productId: newProduct.id }
    });

    notifyAll(payload);
    res.status(201).json(newProduct);
});

app.put('/api/products/:id', authMiddleware, roleMiddleware('seller', 'admin'), (req, res) => {
    const product = findProductById(req.params.id);
    if (!product) {
        return res.status(404).json({ error: 'Product not found' });
    }

    const { name, category, price, description, stock } = req.body;
    if (!name || !category || !price || !description) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    product.name = name.trim();
    product.category = category.trim();
    product.price = Number(price);
    product.description = description.trim();
    product.stock = stock !== undefined ? Number(stock) : product.stock;

    saveProducts();
    res.json(product);
});

app.delete('/api/products/:id', authMiddleware, roleMiddleware('admin'), (req, res) => {
    const product = findProductById(req.params.id);
    if (!product) {
        return res.status(404).json({ error: 'Product not found' });
    }

    products = products.filter((p) => p.id !== req.params.id);
    saveProducts();
    res.status(204).send();
});

app.post('/api/subscribe', (req, res) => {
    const subscription = req.body;
    if (!isValidSubscriptionPayload(subscription)) {
        return res.status(400).json({ error: 'Invalid subscription payload' });
    }

    const userId = resolveUserIdFromCookie(req);
    const existingSub = subscriptions.find((sub) => sub.endpoint === subscription.endpoint);

    if (existingSub) {
        if (userId) existingSub.userId = userId;
        existingSub.keys = subscription.keys;
    } else {
        subscriptions.push({
            userId,
            endpoint: subscription.endpoint,
            keys: subscription.keys
        });
    }

    saveSubscriptions();
    res.status(201).json({ message: 'Subscribed successfully' });
});

app.post('/api/unsubscribe', (req, res) => {
    const { endpoint } = req.body;
    const initialLength = subscriptions.length;
    subscriptions = subscriptions.filter((sub) => sub.endpoint !== endpoint);

    if (subscriptions.length < initialLength) {
        saveSubscriptions();
        return res.status(200).json({ message: 'Unsubscribed successfully' });
    }

    res.status(404).json({ error: 'Subscription not found' });
});

app.post('/api/checkout', authMiddleware, roleMiddleware('user'), (req, res) => {
    const user = findUserById(req.user.sub);
    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    const userSubscriptions = subscriptions.filter((sub) => sub.userId === user.id);
    if (userSubscriptions.length > 0) {
        const payload = JSON.stringify({
            title: 'Заказ оформлен',
            body: `Спасибо за покупку, ${user.first_name}! Заказ принят в обработку.`,
            icon: '/icons/icon-128.png',
            badge: '/icons/icon-96.png',
            data: { type: 'order' }
        });

        userSubscriptions.forEach((sub) => {
            webpush.sendNotification(sub, payload).catch((err) => console.error('Checkout notification error:', err.message));
        });
    }

    res.json({ message: 'Order placed successfully', orderId: nanoid(12) });
});

app.post('/api/push-test', (req, res) => {
    if (subscriptions.length === 0) {
        return res.status(404).json({ error: 'No active subscriptions' });
    }

    const payload = JSON.stringify({
        title: 'Тест push',
        body: 'Подписка работает корректно',
        icon: '/icons/icon-128.png',
        badge: '/icons/icon-96.png',
        data: { type: 'test' }
    });

    notifyAll(payload)
        .then((stats) => {
            const hasSuccess = stats.success > 0;
            const status = hasSuccess ? 200 : 502;
            res.status(status).json({
                message: hasSuccess ? 'Test push sent' : 'Test push delivery failed',
                stats
            });
        })
        .catch((error) => {
            res.status(500).json({ error: 'Failed to send test push', details: error.message });
        });
});

app.delete('/api/subscriptions', (req, res) => {
    subscriptions = [];
    saveSubscriptions();
    res.json({ message: 'All subscriptions cleared' });
});

app.get('/api/reminders/debug', (req, res) => {
    const list = Array.from(reminders.entries()).map(([id, value]) => ({
        id: Number(id),
        text: value.text,
        reminderTime: value.reminderTime,
        dueInMs: Math.max(0, value.reminderTime - Date.now())
    }));

    res.json({
        now: Date.now(),
        nowIso: new Date().toISOString(),
        activeReminders: list,
        subscriptionsCount: subscriptions.length
    });
});

app.post('/api/reminders', authMiddleware, (req, res) => {
    const { id, text, reminder } = req.body;
    const reminderId = Number(id);
    const reminderTime = Number(reminder);
    const reminderText = typeof text === 'string' ? text.trim() : '';

    if (!reminderId || !reminderText || !Number.isFinite(reminderTime)) {
        return res.status(400).json({ error: 'Invalid reminder payload' });
    }

    if (reminderTime <= Date.now()) {
        return res.status(400).json({ error: 'Reminder time must be in the future' });
    }

    if (reminders.has(reminderId)) {
        clearTimeout(reminders.get(reminderId).timeoutId);
        reminders.delete(reminderId);
    }

    scheduleReminder(reminderId, reminderText, reminderTime, req.user.sub);
    res.status(201).json({ message: 'Reminder scheduled', id: reminderId, reminder: reminderTime });
});

app.post('/api/snooze', (req, res) => {
    const reminderId = Number(req.query.reminderId || req.body?.reminderId);
    if (!reminderId || !reminders.has(reminderId)) {
        return res.status(404).json({ error: 'Reminder not found' });
    }

    const reminder = reminders.get(reminderId);
    clearTimeout(reminder.timeoutId);
    reminders.delete(reminderId);

    const newReminderTime = Date.now() + 5 * 60 * 1000;
    scheduleReminder(reminderId, reminder.text, newReminderTime);
    res.status(200).json({ message: 'Reminder snoozed for 5 minutes', reminder: newReminderTime });
});

app.delete('/api/reminders', (req, res) => {
    reminders.forEach((item) => clearTimeout(item.timeoutId));
    reminders.clear();
    saveRemindersSnapshot();
    res.json({ message: 'All reminders cleared' });
});

app.post('/api/sales', authMiddleware, roleMiddleware('seller'), (req, res) => {
    const { category, discountPercent, startTime, endTime } = req.body;

    if (!discountPercent || !endTime) {
        return res.status(400).json({ error: 'discountPercent and endTime are required' });
    }

    const discount = Number(discountPercent);
    if (!Number.isFinite(discount) || discount <= 0 || discount >= 100) {
        return res.status(400).json({ error: 'discountPercent must be between 1 and 99' });
    }

    const startDate = startTime ? new Date(startTime) : new Date();
    const endDate = new Date(endTime);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
        return res.status(400).json({ error: 'Invalid sale period' });
    }

    const applySale = () => {
        products.forEach((product) => {
            if (!category || product.category === category) {
                product.discountPercent = discount;
                product.discountStartTime = startDate.toISOString();
                product.discountEndTime = endDate.toISOString();
            }
        });
        saveProducts();
    };

    const saleCategoryText = category || 'всех категорий';
    const saleEndText = endDate.toLocaleString('ru-RU');

    const notifySaleStart = () => {
        const payload = JSON.stringify({
            title: 'Распродажа в Бастионе',
            body: `Скидка ${discount}% на товары категории ${saleCategoryText}. До ${saleEndText}.`,
            icon: '/icons/icon-128.png',
            badge: '/icons/icon-96.png',
            data: { type: 'sale', category, discountPercent: discount }
        });
        notifyAll(payload);
    };

    const startDelay = Math.max(0, startDate.getTime() - Date.now());
    const endDelay = Math.max(0, endDate.getTime() - Date.now());

    setTimeout(() => {
        applySale();
        notifySaleStart();
    }, startDelay);

    setTimeout(() => {
        clearSaleFields(category);
    }, endDelay);

    res.status(200).json({
        message: `Распродажа ${discount}% запланирована`,
        category: category || null,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString()
    });
});

const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, 'certs', 'server.key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'certs', 'server.cert.pem'))
};

const server = https.createServer(httpsOptions, app);
const io = socketIo(server, {
    cors: {
        origin: 'https://localhost:3001',
        methods: ['GET', 'POST']
    }
});

io.on('connection', () => {
    // Здесь канал готов для расширения realtime-фич.
});

server.listen(HTTPS_PORT, () => {
    console.log('Bastion server is running');
    console.log(`HTTPS: https://localhost:${HTTPS_PORT}`);
});
