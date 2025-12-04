// web/src/components/pages/CurrentCallsPage.jsx
import { useEffect, useState } from "react";
import { api } from "../../utils/api.js";
import TicketDetail from "../tickets/TicketsDetails.jsx";

export default function CurrentCallsPage() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedTicketId, setSelectedTicketId] = useState(null);

    useEffect(() => {
        async function load() {
            try {
            setLoading(true);
            setError("");

            const list = await api("/tickets?mine=1");

            // 👉 ne garder que les tickets en cours ou brouillon
            const actifs = (list || []).filter(
                (t) => t.status === "en_cours" || t.status === "draft"
            );

            setTickets(actifs);
            } catch (e) {
            console.error(e);
            setError(e.message || "Erreur chargement tickets");
            } finally {
            setLoading(false);
            }
        }
        load();
    }, []);

    function handleSelect(id) {
        setSelectedTicketId(id);
    }

    function handleCloseDetail() {
        setSelectedTicketId(null);
    }

    return (
        <>
        <div className="table-header">
            <h2>Appels en cours</h2>
        </div>

        {loading && <p>Chargement des tickets…</p>}

        {error && !loading && (
            <p style={{ color: "crimson" }}>Erreur : {error}</p>
        )}

        {!loading && !error && (
            <div className="table-wrapper">
            <table>
                <thead>
                <tr>
                    <th>#</th>
                    <th>Client</th>
                    <th>Site</th>
                    <th>Adresse</th>
                    <th>Statut</th>
                    <th>Créé le</th>
                    <th></th>
                </tr>
                </thead>
                <tbody>
                {tickets.length === 0 && (
                    <tr>
                    <td colSpan={7} style={{ textAlign: "center" }}>
                        Aucun ticket pour l’instant.
                    </td>
                    </tr>
                )}

                {tickets.map((t, idx) => (
                    <tr key={t.id}>
                    <td>{idx + 1}</td>
                    <td>{t.client_name}</td>
                    <td>{t.site_name}</td>
                    <td>{t.site_address}</td>
                    <td>{t.status}</td>
                    <td>
                        {t.createdAt
                        ? new Date(t.createdAt).toLocaleString()
                        : "-"}
                    </td>
                    <td>
                        <button
                        className="secondary-button"
                        onClick={() => handleSelect(t.id)}
                        >
                        Voir
                        </button>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        )}

        {selectedTicketId && (
            <TicketDetail ticketId={selectedTicketId} onClose={handleCloseDetail} />
        )}
        </>
    );
}
