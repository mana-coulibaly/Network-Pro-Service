// web/src/components/pages/NewTicket.jsx
import { useState } from "react";
import { api } from "../../utils/api";

export default function NewTicketPage() {
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
            <form
            onSubmit={handleSubmit}
            className="new-ticket-form"
            style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                maxWidth: "600px",
            }}
            >
            <div>
                <label className="label">
                Client
                <input
                    name="client_name"
                    className="input"
                    value={form.client_name}
                    onChange={handleChange}
                    placeholder="Nom du client"
                    required
                />
                </label>
            </div>

            <div>
                <label className="label">
                Site
                <input
                    name="site_name"
                    className="input"
                    value={form.site_name}
                    onChange={handleChange}
                    placeholder="Nom du site"
                    required
                />
                </label>
            </div>

            <div>
                <label className="label">
                Adresse du site
                <input
                    name="site_address"
                    className="input"
                    value={form.site_address}
                    onChange={handleChange}
                    placeholder="Adresse complète"
                    required
                />
                </label>
            </div>

            <div>
                <label className="label">
                But de la visite
                <textarea
                    name="purpose"
                    className="input"
                    style={{ minHeight: "80px", resize: "vertical" }}
                    value={form.purpose}
                    onChange={handleChange}
                    placeholder="Ex: Remplacement d’un POS, problème réseau…"
                />
                </label>
            </div>

            <div style={{ marginTop: "0.5rem" }}>
                <button
                type="submit"
                className="primary-button"
                disabled={loading}
                >
                {loading ? "Création en cours..." : "Créer le ticket"}
                </button>
            </div>

            {error && (
                <p style={{ color: "crimson", marginTop: "0.25rem" }}>{error}</p>
            )}
            {success && (
                <p style={{ color: "green", marginTop: "0.25rem" }}>{success}</p>
            )}
            </form>
        </div>
        </>
    );
}
