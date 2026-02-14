// web/src/components/pages/NewTicket.jsx
import { useState } from "react";
import { api } from "../../utils/api";

export default function NewTicketPage({ onTicketCreated }) {
    const [form, setForm] = useState({
        client_name: "",
        site_name: "",
        site_address: "",
        purpose: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    function handleChange(e) {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setSuccess("");

        // petite validation côté front
        if (!form.client_name || !form.site_name || !form.site_address) {
        setError("Client, site et adresse sont obligatoires.");
        return;
        }

        setLoading(true);
        try {
        // appel à ton backend
        const created = await api("/tickets", {
            method: "POST",
            body: JSON.stringify(form),
        });

        setSuccess("Ticket créé avec succès.");
        
        // reset du formulaire
        setForm({
            client_name: "",
            site_name: "",
            site_address: "",
            purpose: "",
        });

        console.log("Ticket créé :", created);
        
        // Appeler le callback pour rediriger vers "Appels en cours"
        if (onTicketCreated) {
            // Petit délai pour que l'utilisateur voie le message de succès
            setTimeout(() => {
                onTicketCreated(created);
            }, 1000);
        }
        } catch (e) {
        console.error(e);
        setError(e.message || "Erreur lors de la création du ticket.");
        } finally {
        setLoading(false);
        }
    }

    return (
        <>
        <div className="table-header">
            <h2>Créer un ticket</h2>
        </div>

        <div className="table-wrapper">
            <form onSubmit={handleSubmit} className="new-ticket-form">
                <div className="form-group">
                    <label htmlFor="client_name">Client</label>
                    <input
                        id="client_name"
                        name="client_name"
                        className="input"
                        value={form.client_name}
                        onChange={handleChange}
                        placeholder="Nom du client"
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="site_name">Site</label>
                    <input
                        id="site_name"
                        name="site_name"
                        className="input"
                        value={form.site_name}
                        onChange={handleChange}
                        placeholder="Nom du site"
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="site_address">Adresse du site</label>
                    <input
                        id="site_address"
                        name="site_address"
                        className="input"
                        value={form.site_address}
                        onChange={handleChange}
                        placeholder="Adresse complète"
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="purpose">But de la visite</label>
                    <textarea
                        id="purpose"
                        name="purpose"
                        className="input"
                        value={form.purpose}
                        onChange={handleChange}
                        placeholder="Ex: Remplacement d'un POS, problème réseau…"
                    />
                </div>

                <div style={{ marginTop: "8px" }}>
                    <button
                        type="submit"
                        className="primary-button"
                        disabled={loading}
                        style={{ width: "100%" }}
                    >
                        {loading ? "Création en cours..." : "Créer le ticket"}
                    </button>
                </div>

                {error && (
                    <div className="form-message error">{error}</div>
                )}
                {success && (
                    <div className="form-message success">{success}</div>
                )}
            </form>
        </div>
        </>
    );
}
