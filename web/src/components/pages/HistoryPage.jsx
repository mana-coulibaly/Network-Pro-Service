// web/src/components/pages/HistoryPage.jsx
import { useEffect, useState } from "react";
import { api } from "../../utils/api.js";
import TicketDetail from "../tickets/TicketsDetails.jsx";

export default function HistoryPage() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedTicketId, setSelectedTicketId] = useState(null);

    // Chargement initial
    useEffect(() => {
        loadTickets();
    }, []);

    async function loadTickets() {
        try {
            setLoading(true);
            setError("");

            const list = await api("/tickets?mine=1");

            // Ne garder que les tickets fermés (COMPLETED ou clos pour rétrocompatibilité)
            const completed = (list || []).filter(
                (t) => t.status === "COMPLETED" || t.status === "clos"
            );

            setTickets(completed);
        } catch (e) {
            console.error(e);
            setError(e.message || "Erreur chargement historique");
        } finally {
            setLoading(false);
        }
    }

    function handleSelect(id) {
        setSelectedTicketId(id);
    }

    function handleCloseDetail() {
        setSelectedTicketId(null);
        // Recharger les tickets après fermeture du détail
        loadTickets();
    }

    // Appelé par TicketDetail quand le ticket est mis à jour
    function handleTicketUpdated(updatedTicket) {
        // Si le ticket devient COMPLETED, il doit apparaître dans l'historique
        if (updatedTicket.status === "COMPLETED" || updatedTicket.status === "clos") {
            setTickets((prev) => {
                // Vérifier si le ticket existe déjà
                const exists = prev.some((t) => t.id === updatedTicket.id);
                if (exists) {
                    // Mettre à jour le ticket existant
                    return prev.map((t) =>
                        t.id === updatedTicket.id ? updatedTicket : t
                    );
                } else {
                    // Ajouter le nouveau ticket complété
                    return [updatedTicket, ...prev];
                }
            });
        }
    }

    return (
        <>
        <div className="table-header">
            <h2>Appels historiques</h2>
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
                        Aucun ticket historique pour l'instant.
                    </td>
                    </tr>
                )}

                {tickets.map((t, idx) => (
                    <tr key={t.id}>
                    <td>{idx + 1}</td>
                    <td>{t.client_name}</td>
                    <td>{t.site_name}</td>
                    <td>{t.site_address}</td>
                    <td>
                        <span className={`status-pill status-${t.status}`}>
                            {t.status}
                        </span>
                    </td>
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
            <TicketDetail 
                ticketId={selectedTicketId} 
                onClose={handleCloseDetail}
                onTicketUpdated={handleTicketUpdated}
            />
        )}
        </>
    );
}
