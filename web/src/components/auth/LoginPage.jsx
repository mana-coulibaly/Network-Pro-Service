// web/src/components/auth/LoginPage.jsx
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({
        email: 'mistertest@example.com',
        password: 'secret123',
    });
    const [error, setError] = useState('');

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        try {
        await login(form.email, form.password);
        // après login on envoie vers l'app tech par défaut
        navigate('/tech');
        } catch (err) {
        setError('Login failed: ' + err.message);
        }
    }

    return (
        <div style={{ maxWidth: 400, margin: '2rem auto', fontFamily: 'sans-serif' }}>
        <h2>Connexion</h2>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.5rem' }}>
            <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
            <input
            type="password"
            placeholder="Mot de passe"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            />
            <button type="submit">Se connecter</button>
        </form>
        {error && <p style={{ color: 'crimson', marginTop: '0.5rem' }}>{error}</p>}
        </div>
    );
}
