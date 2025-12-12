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

export default function TicketDetail({ ticketId, onClose,  onTicketUpdated}) {
    const [detail, setDetail] = useState(null); // { ticket, timestamps, parts? }
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [punchInProgress, setPunchInProgress] = useState(false);

    // --- ODOMÈTRE ---
    const [odoStart, setOdoStart] = useState("");
    const [odoEnd, setOdoEnd] = useState("");
    const [odoError, setOdoError] = useState("");
    const [odoSaving, setOdoSaving] = useState(false);

    // --- PIÈCES (brouillon, envoyées à la fermeture du ticket) ---
    const [draftParts, setDraftParts] = useState([]);
    const [partAction, setPartAction] = useState("");
    const [partName, setPartName] = useState("");
    const [serialNumber, setSerialNumber] = useState("");
    const [partState, setPartState] = useState("");
    const [partsError, setPartsError] = useState("");

    // --- DESCRIPTION + FERMETURE ---
    const [description, setDescription] = useState("");
    const [closeError, setCloseError] = useState("");
    const [closing, setClosing] = useState(false);

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

    // Préremplir les champs odomètre quand le ticket est chargé
    useEffect(() => {
        if (!detail || !detail.ticket) return;
        const t = detail.ticket;

        setOdoStart(
        t.odo_start !== null && t.odo_start !== undefined
            ? String(t.odo_start)
            : ""
        );
        setOdoEnd(
        t.odo_end !== null && t.odo_end !== undefined ? String(t.odo_end) : ""
        );
    }, [detail]);

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

    async function handleSaveOdometer() {
        if (!ticketId) return;

        setOdoError("");

        const startVal = odoStart === "" ? null : parseInt(odoStart, 10);
        const endVal = odoEnd === "" ? null : parseInt(odoEnd, 10);

        // validations
        if (startVal !== null && (Number.isNaN(startVal) || startVal < 0)) {
        setOdoError("Le kilométrage de départ doit être un entier positif.");
        return;
        }
        if (endVal !== null && (Number.isNaN(endVal) || endVal < 0)) {
        setOdoError("Le kilométrage d'arrivée doit être un entier positif.");
        return;
        }
        if (startVal !== null && endVal !== null && endVal < startVal) {
        setOdoError("L'arrivée ne peut pas être inférieure au départ.");
        return;
        }

        try {
        setOdoSaving(true);

        // on ENREGISTRE seulement, on ne recharge plus le ticket
        await api(`/tickets/${ticketId}/odometer`, {
            method: "POST",
            body: JSON.stringify({
            odo_start: startVal,
            odo_end: endVal,
            }),
        });
        } catch (e) {
        console.error(e);
        setOdoError("Erreur lors de l'enregistrement de l'odomètre.");
        } finally {
        setOdoSaving(false);
        }
    }

    // Ajout d'une pièce dans la liste locale (pas d'appel API ici)
    function handleAddDraftPart(e) {
        e.preventDefault();
        setPartsError("");

        if (!partAction) {
            setPartsError("Veuillez choisir une action (Installed ou Replaced).");
            return;
        }

        const name = partName.trim();
        const sn = serialNumber.trim();

        if (!name) {
        setPartsError("Le nom de la pièce est obligatoire.");
        return;
        }
        if (!sn) {
        setPartsError("Le numéro de série est obligatoire.");
        return;
        }

        const newPart = {
        part_action: partAction,
        part_name: name,
        serial_number: sn,
        part_state: partState,
        _localId: Date.now() + Math.random(),
        };

        setDraftParts((prev) => [...prev, newPart]);

        // reset des champs pour pouvoir ajouter la suivante
        setPartName("");
        setSerialNumber("");
        setPartAction("installed");
        setPartState("new");
    }

    // Retirer une pièce de la liste locale
    function handleRemoveDraftPart(localId) {
        setDraftParts((prev) => prev.filter((p) => p._localId !== localId));
    }

    // Envoi de toutes les pièces brouillon à l'API
    async function saveDraftPartsToApi() {
        if (!ticketId || draftParts.length === 0) return;

        for (const p of draftParts) {
        await api(`/tickets/${ticketId}/parts`, {
            method: "POST",
            body: JSON.stringify({
            part_action: p.part_action,
            part_name: p.part_name,
            serial_number: p.serial_number,
            part_state: p.part_state,
            }),
        });
        }

        // une fois envoyées, on vide la liste locale
        setDraftParts([]);
    }

    // Fermeture du ticket
    async function handleCloseTicket() {
        if (!ticketId) return;

        setCloseError("");
        setOdoError("");

        // description obligatoire
        if (!description.trim()) {
            setCloseError("La description du travail effectué est obligatoire.");
            return;
        }

        // Est-ce que l'utilisateur a saisi / modifié l'odomètre ?
        const userTouchedOdo = odoStart !== "" || odoEnd !== "";

        let startVal = null;
        let endVal = null;

        if (userTouchedOdo) {
            // si on veut modifier l'odomètre depuis le front,
            // on exige les DEUX valeurs
            if (odoStart === "" || odoEnd === "") {
            setOdoError("Veuillez saisir le départ ET l'arrivée.");
            return;
            }

            startVal = parseInt(odoStart, 10);
            endVal = parseInt(odoEnd, 10);

            if (Number.isNaN(startVal) || startVal < 0) {
            setOdoError("Le kilométrage de départ doit être un entier positif.");
            return;
            }
            if (Number.isNaN(endVal) || endVal < 0) {
            setOdoError("Le kilométrage d'arrivée doit être un entier positif.");
            return;
            }
            if (endVal < startVal) {
            setOdoError("L'arrivée ne peut pas être inférieure au départ.");
            return;
            }
        }

        try {
            setClosing(true);

            // 1) envoyer toutes les pièces brouillon
            await saveDraftPartsToApi();

            // 2) si l'utilisateur a saisi un nouvel odomètre, on le sauvegarde
            if (userTouchedOdo) {
            await api(`/tickets/${ticketId}/odometer`, {
                method: "POST",
                body: JSON.stringify({
                odo_start: startVal,
                odo_end: endVal,
                }),
            });
            }

        // 3) demander la fermeture du ticket
        const updatedTicket = await api(`/tickets/${ticketId}/status`, {
            method: "PATCH",
            body: JSON.stringify({
                status: "clos",
                // le backend lit "description" dans ton code index.js
                description: description.trim(),
            }),
        });

        // prévenir le parent qu'un ticket a été mis à jour
        if (onTicketUpdated) {
            onTicketUpdated(updatedTicket);
        }

        // si tout est OK, on ferme la modale
        onClose?.();

        } catch (e) {
            console.error(e);
            setCloseError(
            e.message ||
                "Erreur lors de la fermeture du ticket (odomètre / timestamps / pièces ?)."
            );
        } finally {
            setClosing(false);
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

    const distance =
        odoStart !== "" && odoEnd !== ""
        ? parseInt(odoEnd, 10) - parseInt(odoStart, 10)
        : null;

    return (
        <div className="table-card" style={{ marginTop: "1rem" }}>
        <div
            className="table-header"
            style={{ display: "flex", justifyContent: "space-between" }}
        >
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
                {ticket.createdAt
                ? new Date(ticket.createdAt).toLocaleString()
                : "-"}
            </p>
            </div>

            {/* Punches */}
            <h3 style={{ marginBottom: "0.5rem" }}>Punches</h3>
            <div
            style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
                marginBottom: "0.75rem",
            }}
            >
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

            {/* Odomètre */}
            <div style={{ marginTop: "1.5rem" }}>
            <h3>Odomètre</h3>

            <div
                style={{
                display: "flex",
                gap: "2rem",
                marginBottom: "0.5rem",
                alignItems: "flex-end",
                }}
            >
                <label>
                <strong>Départ :</strong>
                <br />
                <input
                    type="number"
                    min="0"
                    value={odoStart}
                    onChange={(e) => setOdoStart(e.target.value)}
                    className="input"
                    placeholder="0"
                    style={{ width: "120px" }}
                />
                </label>

                <label>
                <strong>Arrivée :</strong>
                <br />
                <input
                    type="number"
                    min="0"
                    value={odoEnd}
                    onChange={(e) => setOdoEnd(e.target.value)}
                    className="input"
                    placeholder="0"
                    style={{ width: "120px" }}
                />
                </label>
            </div>

            {distance !== null && !Number.isNaN(distance) && (
                <p>
                <strong>Distance parcourue :</strong> {distance} km
                </p>
            )}

            {odoError && (
                <p style={{ color: "crimson", marginTop: "0.5rem" }}>{odoError}</p>
            )}

            <button
                className="primary-button"
                onClick={handleSaveOdometer}
                disabled={odoSaving}
                style={{ marginTop: "0.5rem" }}
            >
                {odoSaving ? "Enregistrement..." : "Enregistrer l'odomètre"}
            </button>
            </div>

            {/* Pièces / appareils */}
            <div style={{ marginTop: "1.5rem" }}>
            <h3>Pièces / appareils</h3>

            <form
                onSubmit={handleAddDraftPart}
                style={{
                border: "1px solid #ccc",
                padding: "0.75rem",
                borderRadius: "4px",
                marginBottom: "0.75rem",
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
                alignItems: "flex-end",
                }}
            >
                <label>
                Action
                <br />
                <select
                    className="input"
                    value={partAction}
                    onChange={(e) => setPartAction(e.target.value)}
                    style={{ minWidth: "140px" }}
                >
                    <option value="">-- Choisir l'action --</option>
                    <option value="installed">Installed</option>
                    <option value="replaced">Replaced</option>
                </select>
                </label>

                <label>
                Nom de la pièce
                <br />
                <input
                    className="input"
                    value={partName}
                    onChange={(e) => setPartName(e.target.value)}
                    placeholder="Ex: POS, routeur…"
                    style={{ minWidth: "180px" }}
                />
                </label>

                <label>
                Numéro de série
                <br />
                <input
                    className="input"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="SN"
                    style={{ minWidth: "160px" }}
                />
                </label>

                <label>
                État
                <br />
                <select
                    className="input"
                    value={partState}
                    onChange={(e) => setPartState(e.target.value)}
                    style={{ minWidth: "120px" }}
                >
                    <option value="">-- Choisir l'état --</option>
                    <option value="new">Neuf</option>
                    <option value="used">Usagé</option>
                    <option value="DOA">DOA</option>
                </select>
                </label>

                <button
                type="submit"
                className="primary-button"
                style={{ marginTop: "0.5rem" }}
                >
                Ajouter la pièce
                </button>
            </form>

            {partsError && (
                <p style={{ color: "crimson", marginBottom: "0.5rem" }}>
                {partsError}
                </p>
            )}

            {draftParts.length === 0 ? (
                <p>Aucune pièce ajoutée pour l’instant.</p>
            ) : (
                <table style={{ width: "100%", marginTop: "0.5rem" }}>
                <thead>
                    <tr>
                    <th>Action</th>
                    <th>Pièce</th>
                    <th>Numéro de série</th>
                    <th>État</th>
                    <th></th>
                    </tr>
                </thead>
                <tbody>
                    {draftParts.map((p) => (
                    <tr key={p._localId}>
                        <td>{p.part_action}</td>
                        <td>{p.part_name}</td>
                        <td>{p.serial_number}</td>
                        <td>{p.part_state}</td>
                        <td>
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={() => handleRemoveDraftPart(p._localId)}
                        >
                            Retirer
                        </button>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            )}
            </div>

            {/* Description du travail + fermeture */}
            <div style={{ marginTop: "1.5rem" }}>
            <h3>Description du travail</h3>
            <textarea
                className="input"
                style={{ width: "100%", minHeight: "100px" }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrire le travail effectué, les actions, les remarques, etc."
            />

            {closeError && (
                <p style={{ color: "crimson", marginTop: "0.5rem" }}>
                {closeError}
                </p>
            )}

            <button
                className="primary-button"
                onClick={handleCloseTicket}
                disabled={closing}
                style={{ marginTop: "0.75rem" }}
            >
                {closing ? "Fermeture en cours…" : "Fermer le ticket"}
            </button>
            </div>
        </div>
        </div>
    );
}
