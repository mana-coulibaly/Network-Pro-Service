// web/src/components/pages/ManagerTicketsPage.jsx
import { useEffect, useState } from "react";
import { api } from "../../utils/api.js";

export default function ManagerTicketsPage() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function load() {
        try {
            setLoading(true);
            setError("");

            // tous les tickets, tous les techs
            const list = await api("/manager/tickets?status=all&limit=100");
            setTickets(list || []);
        } catch (e) {
            console.error(e);
            setError(e.message || "Erreur lors du chargement des tickets manager.");
        } finally {
            setLoading(false);
        }
        }

        load();
    }, []);

    return (
        <>
        <div className="table-header">
            <h2>Tickets (vue manager : tous les techniciens)</h2>
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
                    <th>Technicien</th>
                    <th>Statut</th>
                    <th>Créé le</th>
                </tr>
                </thead>
                <tbody>
                {tickets.length === 0 && (
                    <tr>
                    <td colSpan={7} style={{ textAlign: "center" }}>
                        Aucun ticket trouvé.
                    </td>
                    </tr>
                )}

                {tickets.map((t, idx) => (
                    <tr key={t.id}>
                    <td>{idx + 1}</td>
                    <td>{t.client_name}</td>
                    <td>{t.site_name}</td>
                    <td>{t.site_address}</td>
                    <td>{t.tech_email}</td>
                    <td>{t.status}</td>
                    <td>
                        {t.createdAt
                        ? new Date(t.createdAt).toLocaleString()
                        : "-"}
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        )}
        </>
    );
}
