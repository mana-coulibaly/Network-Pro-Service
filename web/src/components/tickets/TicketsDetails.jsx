// web/src/components/tickets/TicketDetail.jsx
import { useEffect, useState } from "react";
import { api } from "../../utils/api";

const PUNCH_TYPES = [
    "leave_home",
    "reach_wh",
    "start_site",
    "leave_site",
    "back_wh",
    "back_home",
];

export default function TicketDetail({ ticketId, onClose }) {
    const [detail, setDetail] = useState(null); // { ticket, timestamps, parts? }
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [punchInProgress, setPunchInProgress] = useState(false);

    // Charger le détail quand ticketId change
    useEffect(() => {
        if (!ticketId) return;

        async function load() {
        try {
            setLoading(true);
            setError("");
            const data = await api(`/tickets/${ticketId}`);
            setDetail(data);
        } catch (e) {
            console.error(e);
            setError(e.message || "Erreur chargement détail du ticket");
        } finally {
            setLoading(false);
        }
        }

        load();
    }, [ticketId]);

    async function handlePunch(type) {
        if (!ticketId) return;
        setPunchInProgress(true);
        setError("");
        try {
        await api(`/tickets/${ticketId}/timestamps`, {
            method: "POST",
            body: JSON.stringify({ punch_type: type }),
        });
        // Recharger le détail après punch
        const data = await api(`/tickets/${ticketId}`);
        setDetail(data);
        } catch (e) {
        console.error(e);
        setError("Erreur punch : " + e.message);
        } finally {
        setPunchInProgress(false);
        }
    }

    if (!ticketId) return null;

    if (loading) {
        return (
        <div className="table-card" style={{ marginTop: "1rem" }}>
            <div className="table-header">
            <h2>Détail du ticket</h2>
            </div>
            <div className="table-wrapper">
            <p>Chargement…</p>
            </div>
        </div>
        );
    }

    if (error) {
        return (
        <div className="table-card" style={{ marginTop: "1rem" }}>
            <div className="table-header">
            <h2>Détail du ticket</h2>
            </div>
            <div className="table-wrapper">
            <p style={{ color: "crimson" }}>{error}</p>
            <button className="primary-button" onClick={onClose}>
                Fermer
            </button>
            </div>
        </div>
        );
    }

    if (!detail) return null;

    const { ticket, timestamps = [] } = detail;
    const donePunches = new Set(timestamps.map((t) => t.punch_type));

    return (
        <div className="table-card" style={{ marginTop: "1rem" }}>
        <div className="table-header" style={{ display: "flex", justifyContent: "space-between" }}>
            <h2>Détail du ticket</h2>
            <button className="primary-button" onClick={onClose}>
            Fermer
            </button>
        </div>

        <div className="table-wrapper">
            {/* Infos principales */}
            <div style={{ marginBottom: "1rem" }}>
            <p>
                <strong>Client :</strong> {ticket.client_name}
                <br />
                <strong>Site :</strong> {ticket.site_name}
                <br />
                <strong>Adresse :</strong> {ticket.site_address}
                <br />
                <strong>Statut :</strong> {ticket.status}
                <br />
                <strong>Créé le :</strong>{" "}
                {ticket.created_at
                ? new Date(ticket.created_at).toLocaleString()
                : "-"}
            </p>
            </div>

            {/* Punches */}
            <h3 style={{ marginBottom: "0.5rem" }}>Punches</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
            {PUNCH_TYPES.map((pt) => (
                <button
                key={pt}
                className="secondary-button"
                disabled={punchInProgress}
                style={{
                    opacity: donePunches.has(pt) ? 0.5 : 1,
                    textDecoration: donePunches.has(pt) ? "line-through" : "none",
                }}
                onClick={() => handlePunch(pt)}
                >
                {pt}
                </button>
            ))}
            </div>

            <ul>
            {timestamps.map((t) => (
                <li key={t.punch_type}>
                {t.punch_type} → {new Date(t.ts).toLocaleString()}
                </li>
            ))}
            {timestamps.length === 0 && <li>Aucun punch pour l’instant.</li>}
            </ul>

            {/* Placeholders pour plus tard */}
            <div style={{ marginTop: "1.5rem" }}>
            <h3>Odomètre</h3>
            <p>
                Départ : {ticket.odo_start ?? "-"} &nbsp; / &nbsp; Arrivée :{" "}
                {ticket.odo_end ?? "-"}
            </p>
            </div>

            <div style={{ marginTop: "1.5rem" }}>
            <h3>Pièces / appareils</h3>
            <p>On ajoutera ici la gestion des parts (installed / replaced).</p>
            </div>
        </div>
        </div>
    );
}
