import React, { useState, useEffect } from 'react';
import Login from './pages/Auth/Login';
import ProductsPage from './pages/Products/ProductsPage';
import UsersPage from './pages/Users/UsersPage';
import PushNotification from './components/PushNotification';
import { api } from './api';
import './App.css';

function restoreSessionFromCache() {
    const cached = localStorage.getItem('arms_session');
    if (!cached) return null;

    try {
        return JSON.parse(cached);
    } catch (error) {
        localStorage.removeItem('arms_session');
        return null;
    }
}

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState(null);
    const [userData, setUserData] = useState(null);
    const [inAppNotifications, setInAppNotifications] = useState([]);

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        if (!('serviceWorker' in navigator)) return undefined;

        const onSwMessage = (event) => {
            const payload = event.data;
            if (payload?.source === 'sw-push') {
                console.log('SW PUSH EVENT:', payload);

                const item = {
                    id: `${payload.type || 'notification'}-${payload.ts || Date.now()}-${Math.random().toString(16).slice(2)}`,
                    title: payload.title || 'Уведомление',
                    body: payload.body || '',
                    type: payload.type || 'notification'
                };

                setInAppNotifications((prev) => [...prev, item]);
                setTimeout(() => {
                    setInAppNotifications((prev) => prev.filter((entry) => entry.id !== item.id));
                }, 8000);
            }
        };

        navigator.serviceWorker.addEventListener('message', onSwMessage);
        return () => navigator.serviceWorker.removeEventListener('message', onSwMessage);
    }, []);

    const checkAuth = async () => {
        const cachedUser = restoreSessionFromCache();

        if (!navigator.onLine && cachedUser) {
            setIsAuthenticated(true);
            setUserRole(cachedUser.role);
            setUserData(cachedUser);
            setLoading(false);
            return;
        }

        try {
            const user = await api.getMe();
            setIsAuthenticated(true);
            setUserRole(user.role);
            setUserData(user);
            localStorage.setItem('arms_session', JSON.stringify(user));
        } catch (err) {
            if (!navigator.onLine && cachedUser) {
                const user = cachedUser;
                setIsAuthenticated(true);
                setUserRole(user.role);
                setUserData(user);
            } else {
                if (err.response) localStorage.removeItem('arms_session');
                setIsAuthenticated(false);
                setUserRole(null);
                setUserData(null);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = (userFromLogin) => {
        if (userFromLogin) {
            setIsAuthenticated(true);
            setUserRole(userFromLogin.role);
            setUserData(userFromLogin);
            localStorage.setItem('arms_session', JSON.stringify(userFromLogin));
            return;
        }
        checkAuth();
    };

    const handleLogout = async () => {
        try {
            await api.logout();
        } catch (err) {
            // даже если сервер недоступен, выходим локально
        }
        localStorage.removeItem('arms_session');
        setIsAuthenticated(false);
        setUserRole(null);
        setUserData(null);
    };

    if (loading) {
        return (
            <div className="loading-screen">
                <p>Загрузка...</p>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Login onLogin={handleLogin} />;
    }

    return (
        <div className="app">
            {inAppNotifications.length > 0 && (
                <div className="inapp-notifications">
                    {inAppNotifications.map((item) => (
                        <div key={item.id} className={`inapp-item inapp-${item.type}`}>
                            <div className="inapp-title">{item.title}</div>
                            <div className="inapp-body">{item.body}</div>
                        </div>
                    ))}
                </div>
            )}

            <header className="app-header">
                <h1 className="app-title">Бастион</h1>
                <div className="header-controls">
                    <PushNotification />
                    <button className="logout-btn" onClick={handleLogout}>
                        Выйти
                    </button>
                </div>
            </header>
            
            <main className="app-main">
                {userRole === 'admin' ? (
                    <UsersPage userRole={userRole} userData={userData} />
                ) : (
                    <ProductsPage userRole={userRole} userData={userData} />
                )}
            </main>
        </div>
    );
}

export default App;
