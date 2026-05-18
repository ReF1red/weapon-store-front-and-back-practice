import React, { useEffect, useState } from 'react';

const imageOptions = ['ak-12.jpeg', 'm4a1.jpeg', 'glock-17.jpeg', 'remington-870.jpeg', 'taurus-44.jpeg'];

export default function ProductModal({ open, mode, initialProduct, onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [stock, setStock] = useState('');
  const [image, setImage] = useState('glock-17.jpeg');

  useEffect(() => {
    if (!open) return;

    setName(initialProduct?.name ?? '');
    setCategory(initialProduct?.category ?? '');
    setPrice(initialProduct?.price != null ? String(initialProduct.price) : '');
    setDescription(initialProduct?.description ?? '');
    setStock(initialProduct?.stock != null ? String(initialProduct.stock) : '');
    setImage(initialProduct?.image ?? 'glock-17.jpeg');
  }, [open, initialProduct]);

  if (!open) return null;

  const title = mode === 'edit' ? 'Редактирование позиции' : 'Новая позиция';

  const handleSubmit = (event) => {
    event.preventDefault();

    const cleanName = name.trim();
    const cleanCategory = category.trim();
    const cleanDescription = description.trim();
    const cleanImage = image.trim() || 'glock-17.jpeg';
    const parsedPrice = Number(price);
    const parsedStock = Number(stock);

    if (!cleanName) {
      alert('Укажите название модели');
      return;
    }

    if (!cleanCategory) {
      alert('Укажите категорию');
      return;
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      alert('Цена должна быть больше нуля');
      return;
    }

    if (!cleanDescription) {
      alert('Добавьте описание товара');
      return;
    }

    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      alert('Остаток должен быть целым числом 0 или больше');
      return;
    }

    onSubmit({
      id: initialProduct?.id,
      name: cleanName,
      category: cleanCategory,
      price: parsedPrice,
      description: cleanDescription,
      stock: parsedStock,
      image: cleanImage
    });
  };

  return (
    <div className="backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal__header">
          <div className="modal__title">{title}</div>
          <button className="iconBtn" onClick={onClose} aria-label="Закрыть окно">
            ×
          </button>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <label className="label">
            Название
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Например, Glock 17 Gen5"
              autoFocus
            />
          </label>

          <label className="label">
            Категория
            <input
              className="input"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Пистолеты / Карабины / Дробовики"
            />
          </label>

          <label className="label">
            Цена (₽)
            <input
              className="input"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="96000"
              inputMode="numeric"
            />
          </label>

          <label className="label">
            Описание
            <textarea
              className="input"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Краткие характеристики модели"
              rows="3"
            />
          </label>

          <label className="label">
            Остаток на складе
            <input
              className="input"
              value={stock}
              onChange={(event) => setStock(event.target.value)}
              placeholder="0"
              inputMode="numeric"
            />
          </label>

          <label className="label">
            Файл изображения
            <select className="input" value={image} onChange={(event) => setImage(event.target.value)}>
              {imageOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="btn btn--primary">
              {mode === 'edit' ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
