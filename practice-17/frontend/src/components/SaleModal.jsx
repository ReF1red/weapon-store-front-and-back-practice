import React, { useMemo, useState } from 'react';
import { api } from '../api';
import './Modal.css';

export default function SaleModal({ products, onClose, onSuccess }) {
    const [category, setCategory] = useState('all');
    const [discountPercent, setDiscountPercent] = useState('20');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    const categories = useMemo(() => ['all', ...new Set(products.map((p) => p.category))], [products]);
    const minDate = new Date().toISOString().slice(0, 16);

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!endTime) {
            alert('Укажите время окончания распродажи');
            return;
        }

        try {
            await api.createSale({
                category: category === 'all' ? null : category,
                discountPercent: Number(discountPercent),
                startTime: startTime ? new Date(startTime).toISOString() : new Date().toISOString(),
                endTime: new Date(endTime).toISOString()
            });
            onSuccess();
            onClose();
        } catch (error) {
            alert(error.response?.data?.error || 'Не удалось создать распродажу');
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-window" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Объявить распродажу</h3>
                    <button className="modal-close-btn" onClick={onClose} title="Закрыть">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="modal-body">
                    <form onSubmit={handleSubmit} className="modal-form">
                        <div className="form-group">
                            <label>Категория товаров</label>
                            <select value={category} onChange={(e) => setCategory(e.target.value)}>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>{cat === 'all' ? 'Все категории' : cat}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Процент скидки</label>
                            <select value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)}>
                                <option value="10">10%</option>
                                <option value="15">15%</option>
                                <option value="20">20%</option>
                                <option value="25">25%</option>
                                <option value="30">30%</option>
                                <option value="40">40%</option>
                                <option value="50">50%</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Время начала (пусто = сразу)</label>
                            <input type="datetime-local" min={minDate} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                        </div>

                        <div className="form-group">
                            <label>Время окончания</label>
                            <input type="datetime-local" min={startTime || minDate} value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                        </div>

                        <div className="modal-actions">
                            <button type="submit" className="modal-save-btn">Запустить распродажу</button>
                            <button type="button" className="modal-cancel-btn" onClick={onClose}>Отмена</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
