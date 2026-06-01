import React, { useEffect, useState } from 'react';
import { api } from '../../api';
import Cart from '../../components/Cart';
import AddProductModal from '../../components/AddProductModal';
import EditProductModal from '../../components/EditProductModal';
import ReminderModal from '../../components/ReminderModal';
import SaleModal from '../../components/SaleModal';
import './ProductsPage.css';

function roundToTens(value) {
    return Math.round(value / 10) * 10;
}

function formatPrice(price) {
    return Number(price).toLocaleString('ru-RU');
}

const imageMap = {
    'M4A1 Patrol': 'm4a1.jpeg',
    'Glock 17 Gen5': 'glock-17.jpeg',
    'Remington 870 Tactical': 'remington-870.jpeg',
    'Taurus .44 Hunter': 'taurus-44.jpeg',
    'SVD Marksman': 'ak-12.jpeg',
    'Beretta 92FS': 'glock-17.jpeg',
    'MP5 SD': 'm4a1.jpeg',
    'Mossberg 590A1': 'remington-870.jpeg',
    'CZ P-10 C': 'taurus-44.jpeg',
    'AK-12': 'ak-12.jpeg'
};

export default function ProductsPage({ userRole }) {
    const [products, setProducts] = useState([]);
    const [reminders, setReminders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [showReminderModal, setShowReminderModal] = useState(false);
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [cart, setCart] = useState([]);
    const [showCart, setShowCart] = useState(false);

    const canEdit = userRole === 'seller' || userRole === 'admin';
    const canDelete = userRole === 'admin';
    const canCreateSales = userRole === 'seller';
    const isUser = userRole === 'user';

    useEffect(() => {
        loadProducts();
        loadReminders();
    }, []);

    const loadReminders = () => {
        try {
            const raw = localStorage.getItem('arms_reminders');
            const parsed = raw ? JSON.parse(raw) : [];
            const normalized = Array.isArray(parsed)
                ? parsed
                    .filter((item) => item && Number(item.id) && Number(item.reminder) && item.text)
                    .sort((a, b) => a.reminder - b.reminder)
                : [];
            setReminders(normalized);
        } catch (error) {
            setReminders([]);
        }
    };

    const loadProducts = async () => {
        try {
            setLoading(true);
            const data = await api.getProducts();
            const list = Array.isArray(data) ? data : [];
            setProducts(list);
            localStorage.setItem('arms_products_cache', JSON.stringify(list));
        } catch (error) {
            console.error('Error loading products:', error);
            const cached = localStorage.getItem('arms_products_cache');
            setProducts(cached ? JSON.parse(cached) : []);
        } finally {
            setLoading(false);
        }
    };

    const persistProductsCache = (list) => {
        localStorage.setItem('arms_products_cache', JSON.stringify(list));
        setProducts(list);
    };

    const createLocalProduct = (formData) => ({
        id: `offline-${Date.now()}`,
        name: String(formData.name || '').trim(),
        category: String(formData.category || '').trim(),
        price: Number(formData.price),
        description: String(formData.description || '').trim(),
        stock: formData.stock !== '' ? Number(formData.stock) : 100
    });

    const handleAddProduct = async (formData) => {
        try {
            await api.createProduct(formData);
            await loadProducts();
            return;
        } catch (error) {
            // Оффлайн fallback: сохраняем товар локально, чтобы интерфейс оставался рабочим.
            const nextList = [...products, createLocalProduct(formData)];
            persistProductsCache(nextList);
            alert('Сеть недоступна: товар сохранен локально (оффлайн режим)');
        }
    };

    const handleUpdateProduct = async (id, formData) => {
        try {
            await api.updateProduct(id, formData);
            await loadProducts();
            return;
        } catch (error) {
            const nextList = products.map((item) => (
                item.id === id
                    ? {
                        ...item,
                        name: String(formData.name || '').trim(),
                        category: String(formData.category || '').trim(),
                        price: Number(formData.price),
                        description: String(formData.description || '').trim(),
                        stock: formData.stock !== '' ? Number(formData.stock) : item.stock
                    }
                    : item
            ));
            persistProductsCache(nextList);
            alert('Сеть недоступна: изменения сохранены локально (оффлайн режим)');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Удалить этот товар?')) return;

        try {
            await api.deleteProduct(id);
            await loadProducts();
        } catch (error) {
            const nextList = products.filter((item) => item.id !== id);
            persistProductsCache(nextList);
            alert('Сеть недоступна: товар удален локально (оффлайн режим)');
        }
    };

    const isOnSale = (product) => {
        if (!product.discountPercent) return false;
        if (!product.discountEndTime) return true;
        return new Date(product.discountEndTime).getTime() > Date.now();
    };

    const getSalePrice = (product) => {
        if (!isOnSale(product)) return null;
        return roundToTens(Number(product.price) * (1 - Number(product.discountPercent) / 100));
    };

    const addToCart = (product) => {
        const salePrice = getSalePrice(product);
        const unitPrice = salePrice ?? Number(product.price);

        setCart((prev) => {
            const existing = prev.find((item) => item.id === product.id);
            if (existing) {
                return prev.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
            }
            return [...prev, { ...product, quantity: 1, unitPrice }];
        });
    };

    const getCartQuantity = (productId) => {
        const item = cart.find((entry) => entry.id === productId);
        return item ? item.quantity : 0;
    };

    const handleCheckout = async () => {
        try {
            await api.checkout();
            setCart([]);
            setShowCart(false);
            alert('Заказ успешно оформлен! Спасибо за покупку.');
        } catch (error) {
            alert('Ошибка при оформлении заказа');
        }
    };

    const handleReminderCreate = (newReminder) => {
        const updated = [...reminders, newReminder].sort((a, b) => a.reminder - b.reminder);
        setReminders(updated);
        localStorage.setItem('arms_reminders', JSON.stringify(updated));
    };

    if (loading) {
        return (
            <div className="loading">
                <p>Загрузка каталога...</p>
            </div>
        );
    }

    const cartTotalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="products-page">
            <div className="products-toolbar">
                <div className="toolbar-left">
                    {canEdit && (
                        <button className="add-product-btn" onClick={() => setShowAddModal(true)}>
                            Добавить позицию
                        </button>
                    )}
                    <button className="reminder-btn" onClick={() => setShowReminderModal(true)}>
                        Напоминание
                    </button>
                    {canCreateSales && (
                        <button className="sale-btn" onClick={() => setShowSaleModal(true)}>
                            Объявить распродажу
                        </button>
                    )}
                </div>
                {isUser && (
                    <button className="cart-btn" onClick={() => setShowCart(true)}>
                        Корзина
                        {cartTotalItems > 0 && <span className="cart-badge">{cartTotalItems}</span>}
                    </button>
                )}
            </div>

            {reminders.length > 0 && (
                <div className="reminders-block">
                    <h3>Мои напоминания</h3>
                    <ul className="reminders-list">
                        {reminders.map((item) => (
                            <li key={item.id} className="reminder-item">
                                <span className="reminder-text">{item.text}</span>
                                <span className="reminder-time">
                                    {new Date(item.reminder).toLocaleString('ru-RU')}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="products-grid">
                {products.map((product) => {
                    const onSale = isOnSale(product);
                    const salePrice = getSalePrice(product);

                    return (
                        <div key={product.id} className={`product-card ${onSale ? 'product-card-sale' : ''}`}>
                            {onSale && <div className="sale-badge">-{product.discountPercent}%</div>}
                            <img
                                src={`/images/${product.image || imageMap[product.name] || 'glock-17.jpeg'}`}
                                alt={product.name}
                                className="product-image"
                                onError={(event) => {
                                    event.target.src = '/images/glock-17.jpeg';
                                }}
                            />
                            <div className="product-content">
                                <h3 className="product-name">{product.name}</h3>
                                <div className="product-category">{product.category}</div>
                                <p className="product-description">{product.description}</p>

                                {onSale && salePrice ? (
                                    <>
                                        <div className="product-price-old">{formatPrice(product.price)} ₽</div>
                                        <div className="product-price-sale">{formatPrice(salePrice)} ₽</div>
                                        <div className="sale-label">
                                            Цена со скидкой
                                            {product.discountEndTime && (
                                                <span className="sale-end-date">
                                                    до {new Date(product.discountEndTime).toLocaleString('ru-RU', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="product-price">{formatPrice(product.price)} ₽</div>
                                )}

                                <div className="product-stock">В наличии: {product.stock} шт.</div>
                                <div className="product-actions">
                                    {canEdit && (
                                        <button className="action-btn edit-btn" onClick={() => setEditingProduct(product)}>
                                            Изменить
                                        </button>
                                    )}
                                    {canDelete && (
                                        <button className="action-btn delete-btn" onClick={() => handleDelete(product.id)}>
                                            Удалить
                                        </button>
                                    )}
                                    {isUser && (
                                        <button className="action-btn cart-add-btn" onClick={() => addToCart(product)}>
                                            {getCartQuantity(product.id) > 0 ? `В корзине: ${getCartQuantity(product.id)}` : 'В корзину'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {products.length === 0 && (
                    <div className="no-products">
                        <p>Товаров пока нет</p>
                    </div>
                )}
            </div>

            {showAddModal && <AddProductModal onClose={() => setShowAddModal(false)} onSave={handleAddProduct} />}

            {editingProduct && (
                <EditProductModal
                    product={editingProduct}
                    onClose={() => setEditingProduct(null)}
                    onSave={handleUpdateProduct}
                />
            )}

            {showReminderModal && (
                <ReminderModal onClose={() => setShowReminderModal(false)} onSuccess={handleReminderCreate} />
            )}

            {showSaleModal && (
                <SaleModal products={products} onClose={() => setShowSaleModal(false)} onSuccess={loadProducts} />
            )}

            {showCart && <Cart items={cart} onClose={() => setShowCart(false)} onCheckout={handleCheckout} />}
        </div>
    );
}
