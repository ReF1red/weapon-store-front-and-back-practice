import React, { useState, useEffect } from 'react';
import { api } from '../../api';

function getProductTitle(product) {
  return product.title || product.name || '';
}

const IMAGE_OPTIONS = [
  { value: 'glock-17.jpeg', label: 'Glock 17' },
  { value: 'ak-12.jpeg', label: 'AK-12' },
  { value: 'm4a1.jpeg', label: 'M4A1' },
  { value: 'remington-870.jpeg', label: 'Remington 870' },
  { value: 'taurus-44.jpeg', label: 'Taurus .44' }
];

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [productIdLookup, setProductIdLookup] = useState('');
  const [foundProduct, setFoundProduct] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    price: '',
    description: '',
    stock: '',
    image: 'glock-17.jpeg'
  });

  const getImageName = (product) => {
    const images = {
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
    return product.image || images[getProductTitle(product)] || 'glock-17.jpeg';
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await api.getProducts();
      setProducts(data);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || 'Не удалось загрузить каталог');
    } finally {
      setLoading(false);
    }
  };

  const handleLookupById = async () => {
    const id = productIdLookup.trim();
    if (!id) {
      setLookupError('Введите id товара');
      setFoundProduct(null);
      return;
    }

    try {
      setLookupError('');
      const product = await api.getProduct(id);
      setFoundProduct(product);
    } catch (error) {
      setFoundProduct(null);
      setLookupError(error.response?.data?.error || 'Товар не найден');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить позицию из каталога?')) return;

    try {
      await api.deleteProduct(id);
      await loadProducts();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || 'Не удалось удалить позицию');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, formData);
      } else {
        await api.createProduct(formData);
      }
      setShowModal(false);
      setEditingProduct(null);
      setFormData({ title: '', category: '', price: '', description: '', stock: '', image: 'glock-17.jpeg' });
      await loadProducts();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || 'Не удалось сохранить изменения');
    }
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      title: getProductTitle(product),
      category: product.category,
      price: product.price,
      description: product.description,
      stock: product.stock,
      image: product.image || 'glock-17.jpeg'
    });
    setShowModal(true);
  };

  const styles = {
    container: { maxWidth: 1200, margin: '0 auto', padding: 20 },
    header: { background: '#ffffff', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #d6e0ea', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
    title: { color: '#a86f1b', margin: 0, fontSize: 24 },
    logoutBtn: { padding: '8px 20px', background: '#d6e0ea', border: 'none', borderRadius: 40, cursor: 'pointer', fontSize: 14 },
    addBtn: { padding: '12px 24px', background: '#a86f1b', color: 'white', border: 'none', borderRadius: 40, cursor: 'pointer', fontSize: 16, marginBottom: 20 },
    lookupRow: { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' },
    lookupInput: { minWidth: 240, padding: 10, borderRadius: 10, border: '1px solid #d6e0ea' },
    lookupBtn: { padding: '10px 16px', background: '#d6e0ea', border: 'none', borderRadius: 20, cursor: 'pointer' },
    lookupError: { color: '#c0392b', marginBottom: 10 },
    lookupCard: { background: '#fff9f0', border: '1px solid #eed9b6', borderRadius: 14, padding: 14, marginBottom: 20 },
    grid: { display: 'flex', flexWrap: 'wrap', gap: 25, justifyContent: 'center' },
    card: { background: '#ffffff', borderRadius: 24, width: 320, overflow: 'hidden', boxShadow: '0 10px 20px rgba(0,0,0,0.1)', transition: 'transform 0.3s' },
    image: { width: '100%', height: 200, objectFit: 'contain', background: '#f5f7fa', borderBottom: '3px solid #d6e0ea', padding: 10, boxSizing: 'border-box' },
    cardContent: { padding: 20 },
    productName: { color: '#a86f1b', fontSize: 20, margin: '0 0 8px 0' },
    productId: { color: '#6b7280', fontSize: 12, marginBottom: 8, letterSpacing: '0.04em' },
    category: { color: '#d6e0ea', fontSize: 14, marginBottom: 10, textTransform: 'uppercase' },
    description: { color: '#1f2937', fontSize: 14, lineHeight: 1.4, marginBottom: 15, height: 60, overflow: 'hidden' },
    price: { fontSize: 18, fontWeight: 'bold', color: '#a86f1b', marginBottom: 5 },
    stock: { fontSize: 12, color: '#1f2937', opacity: 0.7, marginBottom: 15 },
    editBtn: { padding: '8px 16px', background: '#d6e0ea', border: 'none', borderRadius: 30, cursor: 'pointer', marginRight: 10 },
    deleteBtn: { padding: '8px 16px', background: '#c0392b', color: 'white', border: 'none', borderRadius: 30, cursor: 'pointer' },
    modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { background: '#ffffff', borderRadius: 24, padding: 30, width: 450, maxWidth: '90%' },
    modalTitle: { color: '#a86f1b', marginTop: 0, marginBottom: 20 },
    input: { width: '100%', padding: 12, marginBottom: 15, borderRadius: 12, border: '1px solid #d6e0ea', boxSizing: 'border-box', fontSize: 14 },
    select: { width: '100%', padding: 12, marginBottom: 15, borderRadius: 12, border: '1px solid #d6e0ea', boxSizing: 'border-box', fontSize: 14, background: '#ffffff' },
    textarea: { width: '100%', padding: 12, marginBottom: 15, borderRadius: 12, border: '1px solid #d6e0ea', boxSizing: 'border-box', fontSize: 14, minHeight: 80, fontFamily: 'inherit' },
    imagePreview: { width: '100%', height: 160, objectFit: 'contain', background: '#f5f7fa', border: '1px solid #d6e0ea', borderRadius: 16, marginBottom: 15, padding: 10, boxSizing: 'border-box' },
    saveBtn: { padding: '12px 24px', background: '#a86f1b', color: 'white', border: 'none', borderRadius: 40, cursor: 'pointer', marginRight: 10 },
    cancelBtn: { padding: '12px 24px', background: '#ccc', border: 'none', borderRadius: 40, cursor: 'pointer' },
    loading: { textAlign: 'center', padding: 50, color: '#a86f1b', fontSize: 18 }
  };

  if (loading) {
    return <div style={styles.loading}>Загрузка каталога...</div>;
  }

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Бастион · Админ-панель</h1>
        <button onClick={async () => { await api.logout(); window.location.reload(); }} style={styles.logoutBtn}>Выйти</button>
      </div>

      <div style={styles.container}>
        <button
          onClick={() => {
            setEditingProduct(null);
            setFormData({ title: '', category: '', price: '', description: '', stock: '', image: 'glock-17.jpeg' });
            setShowModal(true);
          }}
          style={styles.addBtn}
        >
          + Добавить позицию
        </button>

        <div style={styles.lookupRow}>
          <input
            type="text"
            placeholder="Поиск товара по id"
            value={productIdLookup}
            onChange={(event) => setProductIdLookup(event.target.value)}
            style={styles.lookupInput}
          />
          <button onClick={handleLookupById} style={styles.lookupBtn}>Найти</button>
        </div>

        {lookupError && <div style={styles.lookupError}>{lookupError}</div>}

        {foundProduct && (
          <div style={styles.lookupCard}>
            <strong>{getProductTitle(foundProduct)}</strong>
            <div>ID: {foundProduct.id}</div>
            <div>Категория: {foundProduct.category}</div>
            <div>Цена: {Number(foundProduct.price).toLocaleString('ru-RU')} ₽</div>
            <div>Остаток: {foundProduct.stock} шт.</div>
          </div>
        )}

        <div style={styles.grid}>
          {products.map((product) => (
            <div key={product.id} style={styles.card}>
              <img
                src={`/images/${getImageName(product)}`}
                alt={getProductTitle(product)}
                style={styles.image}
                onError={(event) => { event.target.src = '/images/glock-17.jpeg'; }}
              />
              <div style={styles.cardContent}>
                <h3 style={styles.productName}>{getProductTitle(product)}</h3>
                <div style={styles.productId}>ID: {product.id}</div>
                <div style={styles.category}>{product.category}</div>
                <p style={styles.description}>{product.description}</p>
                <div style={styles.price}>{Number(product.price).toLocaleString('ru-RU')} ₽</div>
                <div style={styles.stock}>Остаток: {product.stock} шт.</div>
                <button onClick={() => openEditModal(product)} style={styles.editBtn}>Изменить</button>
                <button onClick={() => handleDelete(product.id)} style={styles.deleteBtn}>Удалить</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>{editingProduct ? 'Редактирование позиции' : 'Новая позиция'}</h3>
            <form onSubmit={handleSubmit}>
              <input type="text" placeholder="Название модели" value={formData.title} onChange={(event) => setFormData({ ...formData, title: event.target.value })} style={styles.input} required />
              <input type="text" placeholder="Категория оружия" value={formData.category} onChange={(event) => setFormData({ ...formData, category: event.target.value })} style={styles.input} required />
              <input type="number" placeholder="Цена (₽)" value={formData.price} onChange={(event) => setFormData({ ...formData, price: event.target.value })} style={styles.input} required />
              <textarea placeholder="Описание и характеристики" value={formData.description} onChange={(event) => setFormData({ ...formData, description: event.target.value })} style={styles.textarea} required />
              <input type="number" placeholder="Количество на складе" value={formData.stock} onChange={(event) => setFormData({ ...formData, stock: event.target.value })} style={styles.input} />
              <select value={formData.image} onChange={(event) => setFormData({ ...formData, image: event.target.value })} style={styles.select}>
                {IMAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <img src={`/images/${formData.image}`} alt="Предпросмотр товара" style={styles.imagePreview} onError={(event) => { event.target.src = '/images/glock-17.jpeg'; }} />
              <button type="submit" style={styles.saveBtn}>Сохранить</button>
              <button type="button" onClick={() => { setShowModal(false); setEditingProduct(null); }} style={styles.cancelBtn}>Отмена</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
