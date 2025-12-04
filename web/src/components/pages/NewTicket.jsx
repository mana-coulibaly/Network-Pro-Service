// web/src/components/pages/newTicket.jsx
import { useState } from "react";
import { api } from "../../utils/api";

export default function NewTicketPage() {
    const [form, setForm] = useState({
        client_name: "",
        site_name: "",
        site_address: "",
        purpose: "",
    });
    const [status, setStatus] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();
        setStatus("");

        if (!form.client_name || !form.site_name || !form.site_address) {
        setStatus("Client, site et adresse sont obligatoires.");
        return;
        }

        try {
        const created = await api("/tickets", {
            method: "POST",
            body: JSON.stringify(form),
        });
        setStatus(`Ticket créé (id: ${created.id})`);
        setForm({
            client_name: "",
            site_name: "",
            site_address: "",
            purpose: "",
        });
        } catch (e) {
        console.error(e);
        setStatus("Erreur création ticket : " + e.message);
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
            style={{
                display: "grid",
                gap: "0.75rem",
                maxWidth: "500px",
            }}
            >
            <input
                className="input"
                placeholder="Client"
                value={form.client_name}
                onChange={(e) =>
                setForm((f) => ({ ...f, client_name: e.target.value }))
                }
            />
            <input
                className="input"
                placeholder="Site"
                value={form.site_name}
                onChange={(e) =>
                setForm((f) => ({ ...f, site_name: e.target.value }))
                }
            />
            <input
                className="input"
                placeholder="Adresse"
                value={form.site_address}
                onChange={(e) =>
                setForm((f) => ({ ...f, site_address: e.target.value }))
                }
            />
            <textarea
                className="input"
                placeholder="But de la visite"
                value={form.purpose}
                onChange={(e) =>
                setForm((f) => ({ ...f, purpose: e.target.value }))
                }
                rows={3}
            />
            <button type="submit" className="primary-button">
                Créer le ticket
            </button>
            </form>

            {status && (
            <p style={{ marginTop: "1rem", color: "#333" }}>{status}</p>
            )}
        </div>
        </>
    );
}
