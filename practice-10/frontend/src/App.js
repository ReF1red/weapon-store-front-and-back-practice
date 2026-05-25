import React, { useState, useEffect } from 'react';
import Login from './pages/Auth/Login';
import ProductsPage from './pages/Products/ProductsPage';
import { api } from './api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const bootstrapAuth = async () => {
    setLoading(true);
    try {
      await api.restoreSession();
      setIsAuthenticated(true);
    } catch (error) {
      setIsAuthenticated(false);
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

  return <ProductsPage />;
}

export default App;
