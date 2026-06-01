import React, { useState } from 'react';
import { api } from '../../api';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    try {
      if (isRegistering) {
        await api.register({ email, first_name: firstName, last_name: lastName, password });
        setIsRegistering(false);
        setMessage('Регистрация прошла успешно. Выполните вход.');
      } else {
        await api.login({ email, password });
        onLogin();
      }
    } catch (error) {
      setMessage(error.response?.data?.error || error.message || 'Произошла ошибка');
    }
  };

  const isSuccess = message.startsWith('Регистрация прошла успешно');

  const styles = {
    container: { maxWidth: 400, margin: '50px auto', padding: 20, background: '#ffffff', borderRadius: 24, boxShadow: '0 10px 20px rgba(0,0,0,0.1)' },
    title: { color: '#a86f1b', textAlign: 'center', marginBottom: 20 },
    input: { width: '100%', padding: 12, marginBottom: 15, borderRadius: 12, border: '1px solid #d6e0ea', boxSizing: 'border-box', fontSize: 16 },
    button: { width: '100%', padding: 12, background: '#a86f1b', color: 'white', border: 'none', borderRadius: 40, cursor: 'pointer', fontSize: 16 },
    switchBtn: { marginTop: 15, background: 'none', border: 'none', color: '#a86f1b', cursor: 'pointer', width: '100%', textDecoration: 'underline' },
    error: { color: '#c0392b', textAlign: 'center', marginBottom: 15 },
    success: { color: '#27ae60', textAlign: 'center', marginBottom: 15 }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>{isRegistering ? 'Регистрация' : 'Вход в Бастион'}</h2>
      {message && <p style={isSuccess ? styles.success : styles.error}>{message}</p>}

      <form onSubmit={handleSubmit}>
        {isRegistering && (
          <>
            <input type="text" placeholder="Имя" value={firstName} onChange={(event) => setFirstName(event.target.value)} style={styles.input} required />
            <input type="text" placeholder="Фамилия" value={lastName} onChange={(event) => setLastName(event.target.value)} style={styles.input} required />
          </>
        )}
        <input type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} style={styles.input} required />
        <input type="password" placeholder="Пароль" value={password} onChange={(event) => setPassword(event.target.value)} style={styles.input} required />
        <button type="submit" style={styles.button}>{isRegistering ? 'Зарегистрироваться' : 'Войти'}</button>
      </form>

      <button onClick={() => { setIsRegistering(!isRegistering); setMessage(''); }} style={styles.switchBtn}>
        {isRegistering ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
      </button>
    </div>
  );
}
