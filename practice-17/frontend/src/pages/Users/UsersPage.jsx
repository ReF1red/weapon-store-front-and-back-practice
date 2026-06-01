import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import EditUserModal from '../../components/EditUserModal';
import './UsersPage.css';

export default function UsersPage({ userRole, userData }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingUser, setEditingUser] = useState(null);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await api.getUsers();
            setUsers(data);
        } catch (err) {
            console.error('Error loading users:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleBlock = async (id) => {
        if (window.confirm('Заблокировать этого пользователя?')) {
            try {
                await api.deleteUser(id);
                await loadUsers();
            } catch (err) {
                alert('Ошибка при блокировке пользователя');
            }
        }
    };

    const getRoleBadge = (role) => {
        const badges = {
            admin: { class: 'badge-admin', label: 'Админ' },
            seller: { class: 'badge-seller', label: 'Продавец' },
            user: { class: 'badge-user', label: 'Пользователь' }
        };
        const badge = badges[role] || badges.user;
        return <span className={`role-badge ${badge.class}`}>{badge.label}</span>;
    };

    if (loading) {
        return (
            <div className="loading">
                <p>Загрузка пользователей...</p>
            </div>
        );
    }

    return (
        <div className="users-page">
            <div className="users-header">
                <h2>Управление пользователями</h2>
                <div className="users-stats">
                    <span>Всего: {users.length}</span>
                    <span>Активных: {users.filter(u => u.isActive).length}</span>
                </div>
            </div>

            <div className="users-table-container">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Имя</th>
                            <th>Фамилия</th>
                            <th>Роль</th>
                            <th>Статус</th>
                            <th>Действия</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td className="user-email">{user.email}</td>
                                <td>{user.first_name}</td>
                                <td>{user.last_name}</td>
                                <td>{getRoleBadge(user.role)}</td>
                                <td>
                                    <span className={`status-indicator ${user.isActive ? 'active' : 'blocked'}`}>
                                        {user.isActive ? 'Активен' : 'Заблокирован'}
                                    </span>
                                </td>
                                <td className="actions-cell">
                                    <button
                                        className="table-btn edit-btn"
                                        onClick={() => setEditingUser(user)}
                                        title="Редактировать"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="3"></circle>
                                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                        </svg>
                                    </button>
                                    {user.isActive && (
                                        <button
                                            className="table-btn block-btn"
                                            onClick={() => handleBlock(user.id)}
                                            title="Заблокировать"
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onSuccess={loadUsers}
                />
            )}
        </div>
    );
}