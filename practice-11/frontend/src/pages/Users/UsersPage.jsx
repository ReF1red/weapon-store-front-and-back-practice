import React, { useState, useEffect } from 'react';
import { api } from '../../api';

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ first_name: '', last_name: '', role: 'user', isActive: true, password: '' });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getUsers();
      setUsers(data);
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || 'Не удалось загрузить список пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (user) => {
    const nextIsActive = !user.isActive;
    const actionLabel = nextIsActive ? 'разблокировать' : 'заблокировать';

    if (!window.confirm(`${nextIsActive ? 'Разблокировать' : 'Заблокировать'} пользователя?`)) return;

    try {
      await api.updateUser(user.id, {
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        isActive: nextIsActive
      });
      await loadUsers();
    } catch (error) {
      alert(error.response?.data?.error || `Не удалось ${actionLabel} пользователя`);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await api.updateUser(editingUser.id, formData);
      setShowModal(false);
      setEditingUser(null);
      setFormData({ first_name: '', last_name: '', role: 'user', isActive: true, password: '' });
      await loadUsers();
    } catch (error) {
      alert(error.response?.data?.error || 'Не удалось обновить пользователя');
    }
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      isActive: user.isActive,
      password: ''
    });
    setShowModal(true);
  };

  const styles = {
    container: { maxWidth: 1200, margin: '0 auto', padding: 20 },
    header: { background: '#ffffff', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #d6e0ea' },
    title: { color: '#a86f1b', margin: 0 },
    logoutBtn: { padding: '8px 20px', background: '#d6e0ea', border: 'none', borderRadius: 40, cursor: 'pointer' },
    table: { width: '100%', borderCollapse: 'collapse', background: '#ffffff', borderRadius: 24, overflow: 'hidden' },
    th: { padding: 12, textAlign: 'left', background: '#d6e0ea', color: '#1f2937' },
    td: { padding: 12, borderBottom: '1px solid #d6e0ea' },
    editBtn: { padding: '6px 12px', background: '#a86f1b', color: 'white', border: 'none', borderRadius: 20, cursor: 'pointer', marginRight: 10 },
    dangerBtn: { padding: '6px 12px', background: '#c0392b', color: 'white', border: 'none', borderRadius: 20, cursor: 'pointer' },
    restoreBtn: { padding: '6px 12px', background: '#27ae60', color: 'white', border: 'none', borderRadius: 20, cursor: 'pointer' },
    active: { color: '#27ae60' },
    inactive: { color: '#c0392b' },
    modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { background: '#ffffff', borderRadius: 24, padding: 30, width: 400, maxWidth: '90%' },
    input: { width: '100%', padding: 12, marginBottom: 15, borderRadius: 12, border: '1px solid #d6e0ea', boxSizing: 'border-box' },
    select: { width: '100%', padding: 12, marginBottom: 15, borderRadius: 12, border: '1px solid #d6e0ea', boxSizing: 'border-box' },
    checkbox: { marginRight: 10 },
    saveBtn: { padding: '12px 24px', background: '#a86f1b', color: 'white', border: 'none', borderRadius: 40, cursor: 'pointer', marginRight: 10 },
    cancelBtn: { padding: '12px 24px', background: '#ccc', border: 'none', borderRadius: 40, cursor: 'pointer' }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 50, color: '#a86f1b' }}>Загрузка пользователей...</div>;

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Бастион — управление пользователями</h1>
        <button onClick={async () => { await api.logout(); window.location.reload(); }} style={styles.logoutBtn}>Выйти</button>
      </div>
      <div style={styles.container}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Email</th>
              <th style={styles.th}>Имя</th>
              <th style={styles.th}>Фамилия</th>
              <th style={styles.th}>Роль</th>
              <th style={styles.th}>Статус</th>
              <th style={styles.th}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td style={styles.td}>{user.email}</td>
                <td style={styles.td}>{user.first_name}</td>
                <td style={styles.td}>{user.last_name}</td>
                <td style={styles.td}>{user.role}</td>
                <td style={styles.td}>{user.isActive ? <span style={styles.active}>Активен</span> : <span style={styles.inactive}>Заблокирован</span>}</td>
                <td style={styles.td}>
                  <button onClick={() => openEditModal(user)} style={styles.editBtn}>Изменить</button>
                  <button
                    onClick={() => handleToggleUserStatus(user)}
                    style={user.isActive ? styles.dangerBtn : styles.restoreBtn}
                  >
                    {user.isActive ? 'Заблокировать' : 'Разблокировать'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3>Редактирование: {editingUser?.email}</h3>
            <form onSubmit={handleSubmit}>
              <input type="text" placeholder="Имя" value={formData.first_name} onChange={(event) => setFormData({ ...formData, first_name: event.target.value })} style={styles.input} required />
              <input type="text" placeholder="Фамилия" value={formData.last_name} onChange={(event) => setFormData({ ...formData, last_name: event.target.value })} style={styles.input} required />
              <select value={formData.role} onChange={(event) => setFormData({ ...formData, role: event.target.value })} style={styles.select}>
                <option value="user">Покупатель</option>
                <option value="seller">Продавец</option>
                <option value="admin">Администратор</option>
              </select>
              <label><input type="checkbox" checked={formData.isActive} onChange={(event) => setFormData({ ...formData, isActive: event.target.checked })} style={styles.checkbox} /> Активен</label>
              <input type="password" placeholder="Новый пароль (необязательно)" value={formData.password} onChange={(event) => setFormData({ ...formData, password: event.target.value })} style={styles.input} />
              <button type="submit" style={styles.saveBtn}>Сохранить</button>
              <button type="button" onClick={() => { setShowModal(false); setEditingUser(null); }} style={styles.cancelBtn}>Отмена</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
