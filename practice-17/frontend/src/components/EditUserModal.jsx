import React, { useState } from 'react';
import { api } from '../api';
import './Modal.css';

export default function EditUserModal({ user, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        isActive: user.isActive,
        password: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.updateUser(user.id, formData);
            onSuccess();
            onClose();
        } catch (err) {
            alert('Ошибка при обновлении пользователя');
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-window" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Редактировать пользователя</h3>
                    <button className="modal-close-btn" onClick={onClose} title="Закрыть">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div className="modal-body">
                    <p className="modal-user-email">{user.email}</p>
                    
                    <form onSubmit={handleSubmit} className="modal-form">
                        <div className="form-group">
                            <label>Имя</label>
                            <input
                                type="text"
                                value={formData.first_name}
                                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                                required
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Фамилия</label>
                            <input
                                type="text"
                                value={formData.last_name}
                                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                                required
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Роль</label>
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData({...formData, role: e.target.value})}
                            >
                                <option value="user">Пользователь</option>
                                <option value="seller">Продавец</option>
                                <option value="admin">Администратор</option>
                            </select>
                        </div>
                        
                        <div className="form-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                                />
                                Активен
                            </label>
                        </div>
                        
                        <div className="form-group">
                            <label>Новый пароль (оставьте пустым, чтобы не менять)</label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                placeholder="Новый пароль"
                            />
                        </div>
                        
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