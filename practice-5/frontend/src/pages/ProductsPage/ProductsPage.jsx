import React, { useEffect, useState } from 'react';
import './ProductsPage.scss';
import ProductsList from '../../components/ProductsList';
import ProductModal from '../../components/ProductModal';
import { api } from '../../api';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      console.error(err);
      alert('Не удалось загрузить каталог');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setModalMode('create');
    setEditingProduct(null);
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setModalMode('edit');
    setEditingProduct(product);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProduct(null);
  };

  const handleDelete = async (id) => {
    const ok = window.confirm('Удалить позицию из каталога?');
    if (!ok) return;

    try {
      await api.deleteProduct(id);
      setProducts((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error(err);
      alert('Не удалось удалить позицию');
    }
  };

  const handleSubmitModal = async (payload) => {
    try {
      if (modalMode === 'create') {
        const created = await api.createProduct(payload);
        setProducts((prev) => [...prev, created]);
      } else {
        const updated = await api.updateProduct(payload.id, payload);
        setProducts((prev) => prev.map((item) => (item.id === payload.id ? updated : item)));
      }
      closeModal();
    } catch (err) {
      console.error(err);
      alert('Не удалось сохранить изменения');
    }
  };

  return (
    <div className="page">
      <header className="header">
        <div className="header__inner">
          <div>
            <p className="header__label">ARMS CONTROL PANEL</p>
            <div className="brand">Бастион</div>
          </div>
          <div className="header__right">Лицензируемый каталог</div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          <section className="hero">
            <div>
              <h1 className="title">Склад оружейного магазина</h1>
              <p className="hero__text">
                Управляйте карточками товаров: добавляйте позиции, обновляйте характеристики
                и отслеживайте остаток по каждой модели.
              </p>
            </div>
            <button className="btn btn--primary" onClick={openCreate}>
              + Добавить позицию
            </button>
          </section>

          {loading ? (
            <div className="loading">Загрузка каталога...</div>
          ) : (
            <ProductsList products={products} onEdit={openEdit} onDelete={handleDelete} />
          )}
        </div>
      </main>

      <footer className="footer">Оружейный каталог • панель управления складом</footer>

      <ProductModal
        open={modalOpen}
        mode={modalMode}
        initialProduct={editingProduct}
        onClose={closeModal}
        onSubmit={handleSubmitModal}
      />
    </div>
  );
}
