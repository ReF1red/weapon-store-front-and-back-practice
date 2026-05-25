import React from 'react';

const IMAGE_MAP = {
  'AK-12': 'ak-12.jpeg',
  'M4A1 Patrol': 'm4a1.jpeg',
  'Glock 17 Gen5': 'glock-17.jpeg',
  'Remington 870 Tactical': 'remington-870.jpeg',
  'Taurus .44 Hunter': 'taurus-44.jpeg'
};

function getProductTitle(product) {
  return product.title || product.name || '';
}

function resolveImage(product) {
  return product.image || IMAGE_MAP[getProductTitle(product)] || 'glock-17.jpeg';
}

export default function ProductItem({ product, onEdit, onDelete }) {
  const title = getProductTitle(product);

  return (
    <article className="card">
      <img
        className="card__image"
        src={`/images/${resolveImage(product)}`}
        alt={title}
        onError={(event) => {
          event.currentTarget.src = '/images/glock-17.jpeg';
        }}
      />

      <div className="card__content">
        <div className="card__category">{product.category}</div>
        <h3 className="card__title">{title}</h3>
        <p className="card__description">{product.description}</p>

        <div className="card__footer">
          <div className="card__details">
            <span className="card__price">{Number(product.price).toLocaleString('ru-RU')} ₽</span>
            <span className="card__stock">{product.stock} шт.</span>
          </div>

          <div className="card__actions">
            <button className="card__button card__button--edit" onClick={() => onEdit(product)}>
              Изменить
            </button>
            <button className="card__button" onClick={() => onDelete(product.id)}>
              Удалить
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
