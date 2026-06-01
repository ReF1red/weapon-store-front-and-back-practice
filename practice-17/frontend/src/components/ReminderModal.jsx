import React, { useState } from 'react';
import { api } from '../api';
import './Modal.css';

export default function ReminderModal({ onClose, onSuccess }) {
    const [text, setText] = useState('');
    const [reminderTime, setReminderTime] = useState('');

    const minDate = new Date().toISOString().slice(0, 16);

    const handleSubmit = async (event) => {
        event.preventDefault();

        const trimmedText = text.trim();
        if (!trimmedText || !reminderTime) {
            alert('Заполните текст заметки и дату напоминания');
            return;
        }

        const reminderTimestamp = new Date(reminderTime).getTime();
        if (Number.isNaN(reminderTimestamp) || reminderTimestamp <= Date.now()) {
            alert('Дата напоминания должна быть в будущем');
            return;
        }

        const reminder = {
            id: Date.now(),
            text: trimmedText,
            reminder: reminderTimestamp
        };

        try {
            await api.createReminder(reminder);
            onSuccess(reminder);
            onClose();
        } catch (error) {
            alert(error.response?.data?.error || 'Не удалось создать напоминание');
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-window" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Создать напоминание</h3>
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
                            <label>Текст заметки</label>
                            <textarea
                                placeholder="Например: проверить акционные позиции в 18:00"
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Дата и время напоминания</label>
                            <input
                                type="datetime-local"
                                min={minDate}
                                value={reminderTime}
                                onChange={(e) => setReminderTime(e.target.value)}
                                required
                            />
                        </div>

                        <div className="modal-actions">
                            <button type="submit" className="modal-save-btn">Сохранить</button>
                            <button type="button" className="modal-cancel-btn" onClick={onClose}>Отмена</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
