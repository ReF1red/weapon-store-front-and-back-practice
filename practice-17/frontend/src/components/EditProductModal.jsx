import React, { useState } from 'react';
import './Modal.css';

export default function EditProductModal({ product, onClose, onSave }) {
    const [formData, setFormData] = useState({
        name: product.name,
        category: product.category,
        price: product.price,
        description: product.description,
        stock: product.stock
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        await onSave(product.id, formData);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-window" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Редактировать позицию</h3>
                    <button className="modal-close-btn" onClick={onClose} title="Закрыть">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div className="modal-body">
                    <form onSubmit={handleSubmit} className="modal-form">
                        <input
                            type="text"
                            placeholder="Название"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                            required
                        />
                        <input
                            type="text"
                            placeholder="Категория"
                            value={formData.category}
                            onChange={(e) => setFormData({...formData, category: e.target.value})}
                            required
                        />
                        <input
                            type="number"
                            placeholder="Цена"
                            value={formData.price}
                            onChange={(e) => setFormData({...formData, price: e.target.value})}
                            required
                        />
                        <textarea
                            placeholder="Описание"
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            rows="3"
                            required
                        />
                        <input
                            type="number"
                            placeholder="Количество на складе"
                            value={formData.stock}
                            onChange={(e) => setFormData({...formData, stock: e.target.value})}
                        />
                        <div className="modal-actions">
                            <button type="submit" className="modal-save-btn">
                                Сохранить
                            </button>
                            <button type="button" className="modal-cancel-btn" onClick={onClose}>
                                Отмена
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
