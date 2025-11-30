// web/src/components/portal/WebPortal.jsx
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';

export default function WebPortal() {
    const { token, user, logout } = useAuth();
    const [tickets, setTickets] = useState([]);
    const [statusMessage, setStatusMessage] = useState('');

    async function call(path, options) {
        return api(path, { ...options, token });
    }

    useEffect(() => {
        async function load() {
            try {
                // pour l’instant, on réutilise /tickets (tickets du user)
                // plus tard, on mettra une route manager/admin pour tous les tickets
                const list = await call('/tickets');
                setTickets(list);
            } catch (err) {
                setStatusMessage('Erreur chargement tickets : ' + err.message);
            }
        }
        if (token) load();
    }, [token]);

    return (
        <div style={{ padding: '1rem', fontFamily: 'sans-serif' }}>
        <div style={{ marginBottom: '1rem' }}>
            <strong>Connecté :</strong> {user?.email} ({user?.role})
            <button style={{ marginLeft: '1rem' }} onClick={logout}>
            Logout
            </button>
        </div>

        <div style={{ marginBottom: '1rem' }}>
            <a href="/tech">App tech</a> |{' '}
            <a href="/portal" style={{ marginLeft: '0.5rem' }}>
            Portail
            </a>
        </div>

        <h2>Portail web – tickets</h2>
        <p>
            Ici tu pourras ajouter les vues manager/admin : filtres, détails, assignation des
            équipements, certificats, taux horaires, etc.
        </p>

        <h3>Tickets visibles</h3>
        <ul>
            {tickets.map(t => (
            <li key={t.id}>
                [{t.status}] {t.client_name} – {t.site_name}
            </li>
            ))}
            {!tickets.length && <li>Aucun ticket</li>}
        </ul>

        {statusMessage && <p style={{ marginTop: '1rem', color: 'crimson' }}>{statusMessage}</p>}
        </div>
    );
}
