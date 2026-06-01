import React, { useState } from 'react';
import { api } from '../../api';
import './Login.css';

export default function Login({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            if (isRegistering) {
                await api.register({
                    email,
                    first_name: firstName,
                    last_name: lastName,
                    password
                });
                setError('Регистрация успешна! Теперь войдите.');
                setIsRegistering(false);
            } else {
                const auth = await api.login({ email, password });
                onLogin(auth?.user);
            }
        } catch (err) {
            if (err.response) {
                setError(err.response.data?.error || 'Неверный email или пароль.');
            } else {
                setError('Сервер недоступен. Запустите бэкенд и примите сертификат (выполните «mkcert -install» и перезапустите браузер).');
            }
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2 className="login-title">
                    {isRegistering ? 'Регистрация' : 'Вход'}
                </h2>
                
                {error && (
                    <div className={`login-message ${error.includes('успешна') ? 'success' : 'error'}`}>
                        {error}
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="login-form">
                    {isRegistering && (
                        <>
                            <input
                                type="text"
                                placeholder="Имя"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="login-input"
                                required
                            />
                            <input
                                type="text"
                                placeholder="Фамилия"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="login-input"
                                required
                            />
                        </>
                    )}
                    
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="login-input"
                        required
                    />
                    
                    <input
                        type="password"
                        placeholder="Пароль"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="login-input"
                        required
                    />
                    
                    <button type="submit" className="login-btn">
                        {isRegistering ? 'Зарегистрироваться' : 'Войти'}
                    </button>
                </form>
                
                <button
                    onClick={() => {
                        setIsRegistering(!isRegistering);
                        setError('');
                    }}
                    className="login-switch"
                >
                    {isRegistering
                        ? 'Уже есть аккаунт? Войти'
                        : 'Нет аккаунта? Зарегистрироваться'}
                </button>
            </div>
        </div>
    );
}
