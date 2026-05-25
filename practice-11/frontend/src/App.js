import React, { useState, useEffect } from 'react';
import Login from './pages/Auth/Login';
import ProductsPage from './pages/Products/ProductsPage';
import UsersPage from './pages/Users/UsersPage';
import { api } from './api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [adminView, setAdminView] = useState('users');

  const bootstrapAuth = async () => {
    setLoading(true);
    try {
      const user = await api.restoreSession();
      setIsAuthenticated(true);
      setUserRole(user.role);
      if (user.role === 'admin') {
        setAdminView('users');
      }
    } catch (error) {
      setIsAuthenticated(false);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    bootstrapAuth();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 50, color: '#8b5a2b' }}>Загрузка...</div>;
  }

  if (!isAuthenticated) {
    return <Login onLogin={bootstrapAuth} />;
  }

  if (userRole === 'admin') {
    return (
      <div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: 12, background: '#ffffff', borderBottom: '1px solid #d6e0ea' }}>
          <button
            type="button"
            style={{ padding: '8px 14px', borderRadius: 20, border: '1px solid #d6e0ea', background: adminView === 'users' ? '#a86f1b' : '#ffffff', color: adminView === 'users' ? '#ffffff' : '#1f2937', cursor: 'pointer' }}
            onClick={() => setAdminView('users')}
          >
            Пользователи
          </button>
          <button
            type="button"
            style={{ padding: '8px 14px', borderRadius: 20, border: '1px solid #d6e0ea', background: adminView === 'products' ? '#a86f1b' : '#ffffff', color: adminView === 'products' ? '#ffffff' : '#1f2937', cursor: 'pointer' }}
            onClick={() => setAdminView('products')}
          >
            Товары
          </button>
        </div>
        {adminView === 'users' ? <UsersPage userRole={userRole} /> : <ProductsPage userRole={userRole} />}
      </div>
    );
  }

  return <ProductsPage userRole={userRole} />;
}

export default App;
