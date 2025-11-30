// web/src/components/tech/TechApp.jsx
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../utils/api';

const PUNCH_TYPES = [
    'leave_home',
    'reach_wh',
    'start_site',
    'leave_site',
    'back_wh',
    'back_home',
];

export default function TechApp() {
    const { token, user, logout } = useAuth();

    const [tickets, setTickets] = useState([]);
    const [selectedTicketId, setSelectedTicketId] = useState(null);
    const [selectedTicket, setSelectedTicket] = useState(null); // {ticket, timestamps}
    const [newTicket, setNewTicket] = useState({
        client_name: '',
        site_name: '',
        site_address: '',
        purpose: '',
    });
    const [odoForm, setOdoForm] = useState({ odo_start: '', odo_end: '' });
    const [punchInProgress, setPunchInProgress] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    // helper centralisé
    async function call(path, options) {
        return api(path, { ...options, token });
    }

    async function loadTickets() {
        try {
        const list = await call('/tickets');
        setTickets(list);
        } catch (err) {
        setStatusMessage('Erreur chargement tickets : ' + err.message);
        }
    }

    async function loadTicketDetail(id) {
        if (!id) return;
        try {
        const data = await call(`/tickets/${id}`);
        setSelectedTicketId(id);
        setSelectedTicket(data);
        setOdoForm({
            odo_start: data.ticket.odo_start ?? '',
            odo_end: data.ticket.odo_end ?? '',
        });
        setStatusMessage('');
        } catch (err) {
        setStatusMessage('Erreur détail ticket : ' + err.message);
        }
    }

    useEffect(() => {
        if (token) {
        loadTickets();
        }
    }, [token]);

    // création ticket
    async function handleCreateTicket(e) {
        e.preventDefault();
        setStatusMessage('');
        try {
        const created = await call('/tickets', {
            method: 'POST',
            body: newTicket,
        });
        setNewTicket({ client_name: '', site_name: '', site_address: '', purpose: '' });
        await loadTickets();
        await loadTicketDetail(created.id);
        setStatusMessage('Ticket créé');
        } catch (err) {
        setStatusMessage('Erreur création ticket : ' + err.message);
        }
    }

    // punch
    async function handlePunch(type) {
        if (!selectedTicketId) return;
        setPunchInProgress(true);
        setStatusMessage('');
        try {
        await call(`/tickets/${selectedTicketId}/timestamps`, {
            method: 'POST',
            body: { punch_type: type },
        });
        await loadTicketDetail(selectedTicketId);
        setStatusMessage(`Punch ${type} OK`);
        } catch (err) {
        setStatusMessage('Erreur punch : ' + err.message);
        } finally {
        setPunchInProgress(false);
        }
    }

    // odomètre
    async function handleSaveOdometer(e) {
        e.preventDefault();
        if (!selectedTicketId) return;
        setStatusMessage('');
        try {
        const payload = {};
        if (odoForm.odo_start !== '') payload.odo_start = Number(odoForm.odo_start);
        if (odoForm.odo_end !== '') payload.odo_end = Number(odoForm.odo_end);

        await call(`/tickets/${selectedTicketId}/odometer`, {
            method: 'POST',
            body: payload,
        });
        await loadTicketDetail(selectedTicketId);
        setStatusMessage('Odomètre mis à jour');
        } catch (err) {
        setStatusMessage('Erreur odomètre : ' + err.message);
        }
    }

    // clôture
    async function handleCloseTicket() {
        if (!selectedTicketId) return;
        setStatusMessage('');
        try {
        const updated = await call(`/tickets/${selectedTicketId}/status`, {
            method: 'PATCH',
            body: { status: 'clos' },
        });
        await loadTickets();
        await loadTicketDetail(updated.id);
        setStatusMessage('Ticket clôturé');
        } catch (err) {
        setStatusMessage('Erreur clôture : ' + err.message);
        }
    }

    const timestamps = selectedTicket?.timestamps ?? [];
    const donePunches = new Set(timestamps.map(t => t.punch_type));
    const ticket = selectedTicket?.ticket;
    const km =
        ticket?.odo_start != null && ticket?.odo_end != null
        ? ticket.odo_end - ticket.odo_start
        : null;

    return (
        <div style={{ display: 'flex', gap: '2rem', padding: '1rem', fontFamily: 'sans-serif' }}>
        {/* Colonne gauche : user + création + liste */}
        <div style={{ flex: 1 }}>
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

            <h3>Nouveau ticket</h3>
            <form onSubmit={handleCreateTicket} style={{ display: 'grid', gap: '0.5rem' }}>
            <input
                placeholder="Client"
                value={newTicket.client_name}
                onChange={e => setNewTicket(t => ({ ...t, client_name: e.target.value }))}
            />
            <input
                placeholder="Site"
                value={newTicket.site_name}
                onChange={e => setNewTicket(t => ({ ...t, site_name: e.target.value }))}
            />
            <input
                placeholder="Adresse"
                value={newTicket.site_address}
                onChange={e => setNewTicket(t => ({ ...t, site_address: e.target.value }))}
            />
            <input
                placeholder="But de la visite"
                value={newTicket.purpose}
                onChange={e => setNewTicket(t => ({ ...t, purpose: e.target.value }))}
            />
            <button type="submit">Créer</button>
            </form>

            <h3 style={{ marginTop: '2rem' }}>Mes tickets</h3>
            <button onClick={loadTickets}>Recharger</button>
            <ul>
            {tickets.map(t => (
                <li key={t.id}>
                <button onClick={() => loadTicketDetail(t.id)}>
                    [{t.status}] {t.client_name} – {t.site_name}
                </button>
                </li>
            ))}
            {!tickets.length && <li>Pas de tickets</li>}
            </ul>
        </div>

        {/* Colonne droite : détail */}
        <div style={{ flex: 1 }}>
            <h3>Détail ticket</h3>
            {!ticket && <p>Choisis un ticket dans la liste.</p>}
            {ticket && (
            <>
                <p>
                <strong>Client :</strong> {ticket.client_name}
                <br />
                <strong>Site :</strong> {ticket.site_name}
                <br />
                <strong>Adresse :</strong> {ticket.site_address}
                <br />
                <strong>But :</strong> {ticket.purpose}
                <br />
                <strong>Statut :</strong> {ticket.status}
                </p>

                <h4>Punches</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {PUNCH_TYPES.map(pt => (
                    <button
                    key={pt}
                    disabled={punchInProgress}
                    style={{
                        opacity: donePunches.has(pt) ? 0.5 : 1,
                        textDecoration: donePunches.has(pt) ? 'line-through' : 'none',
                    }}
                    onClick={() => handlePunch(pt)}
                    >
                    {pt}
                    </button>
                ))}
                </div>
                <ul>
                {timestamps.map(t => (
                    <li key={t.punch_type}>
                    {t.punch_type} → {new Date(t.ts).toLocaleString()}
                    </li>
                ))}
                </ul>

                <h4>Odomètre</h4>
                <form onSubmit={handleSaveOdometer} style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                    type="number"
                    placeholder="Départ"
                    value={odoForm.odo_start}
                    onChange={e => setOdoForm(f => ({ ...f, odo_start: e.target.value }))}
                />
                <input
                    type="number"
                    placeholder="Arrivée"
                    value={odoForm.odo_end}
                    onChange={e => setOdoForm(f => ({ ...f, odo_end: e.target.value }))}
                />
                <button type="submit">Enregistrer</button>
                </form>
                {km != null && (
                <p>
                    <strong>KM parcourus :</strong> {km}
                </p>
                )}

                <h4>Clôture</h4>
                <button onClick={handleCloseTicket}>Fermer le ticket</button>
            </>
            )}

            {statusMessage && (
            <p style={{ marginTop: '1rem', color: 'darkblue' }}>{statusMessage}</p>
            )}
        </div>
        </div>
    );
}
