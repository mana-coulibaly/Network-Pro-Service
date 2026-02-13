// web/src/components/tickets/TicketDetail.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../utils/api";

const PUNCH_TYPES = [
    "leave_home",
    "reach_wh",
    "start_site",
    "leave_site",
    "back_wh",
    "back_home",
];

export default function TicketDetail({ ticketId, onClose, onTicketUpdated }) {
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
    const [partAction, setPartAction] = useState(""); // <-- none par défaut
    const [partName, setPartName] = useState("");
    const [serialNumber, setSerialNumber] = useState("");
    const [partState, setPartState] = useState(""); // <-- none par défaut
    const [partsError, setPartsError] = useState("");

    // --- CONSOMMABLES ---
    const [consumableName, setConsumableName] = useState("");
    const [consumableQty, setConsumableQty] = useState("");
    const [consumableUnit, setConsumableUnit] = useState("unit");
    const [consumablesError, setConsumablesError] = useState("");
    const [consumablesSaving, setConsumablesSaving] = useState(false);
    const [consumablesFromApi, setConsumablesFromApi] = useState([]);


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
            setConsumablesFromApi(data?.consumables || []);
        } catch (e) {
            console.error(e);
            setError(e.message || "Erreur chargement détail du ticket");
        } finally {
            setLoading(false);
        }
        }

        load();
    }, [ticketId]);

    const ticket = detail?.ticket;
    const timestamps = detail?.timestamps || [];
    const partsFromApi = detail?.parts || detail?.ticket_parts || []; // au cas où ton backend renvoie un autre nom

    const isClosed = ticket?.status === "clos";
    const isNone = partAction === "none";

    // Préremplir les champs quand le ticket est chargé
    useEffect(() => {
        if (!ticket) return;

        setOdoStart(
        ticket.odo_start !== null && ticket.odo_start !== undefined
            ? String(ticket.odo_start)
            : ""
        );
        setOdoEnd(
        ticket.odo_end !== null && ticket.odo_end !== undefined
            ? String(ticket.odo_end)
            : ""
        );

        // Préremplir description (utile surtout en lecture seule / historique)
        setDescription(ticket.description ? String(ticket.description) : "");
    }, [ticketId, ticket]);

    const donePunches = useMemo(
        () => new Set(timestamps.map((t) => t.punch_type)),
        [timestamps]
    );

    const distance =
        odoStart !== "" && odoEnd !== ""
        ? parseInt(odoEnd, 10) - parseInt(odoStart, 10)
        : null;

    async function handlePunch(type) {
        if (!ticketId || isClosed) return;

        setPunchInProgress(true);
        setError("");

        try {
        await api(`/tickets/${ticketId}/timestamps`, {
            method: "POST",
            body: JSON.stringify({ punch_type: type }),
        });

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
        if (!ticketId || isClosed) return;

        setOdoError("");

        const startVal = odoStart === "" ? null : parseInt(odoStart, 10);
        const endVal = odoEnd === "" ? null : parseInt(odoEnd, 10);

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

        await api(`/tickets/${ticketId}/odometer`, {
            method: "POST",
            body: JSON.stringify({ odo_start: startVal, odo_end: endVal }),
        });
        } catch (e) {
        console.error(e);
        setOdoError("Erreur lors de l'enregistrement de l'odomètre.");
        } finally {
        setOdoSaving(false);
        }
    }

    function handleAddDraftPart(e) {
        e.preventDefault();
        setPartsError("");

        const alreadyNone = draftParts.some(p => p.part_action === "none");

        // Si une ligne "none" existe déjà, on empêche d'ajouter autre chose
        if (alreadyNone && partAction !== "none") {
        setPartsError('Vous avez déjà choisi "Aucune pièce utilisée". Retirez-la pour ajouter une pièce.');
        return;
        }

        // Si l'utilisateur veut ajouter "none" alors qu'il y a déjà des pièces
        if (partAction === "none" && draftParts.length > 0) {
        setPartsError('Retirez les pièces existantes avant de choisir "Aucune pièce utilisée".');
        return;
        }

        // cas "aucune pièce"
        if (partAction === "none") {
            setDraftParts((prev) => [
            ...prev,
            {
                part_action: "none",
                part_name: "Aucune pièce utilisée",
                serial_number: null,
                part_state: null,
                _localId: Date.now() + Math.random(),
            },
            ]);

            // reset
            setPartAction("");
            setPartName("");
            setSerialNumber("");
            setPartState("");
            return;
        }

        // sinon : vrai matériel (comme tu as déjà)
        const name = partName.trim();
        const sn = serialNumber.trim();

        if (!name) return setPartsError("Le nom de la pièce est obligatoire.");
        if (!sn) return setPartsError("Le numéro de série est obligatoire.");
        if (!partState) return setPartsError("Veuillez choisir l'état.");

        const newPart = {
            part_action: partAction,
            part_name: name,
            serial_number: sn,
            part_state: partState,
            _localId: Date.now() + Math.random(),
        };

        setDraftParts((prev) => [...prev, newPart]);

        // reset
        setPartName("");
        setSerialNumber("");
        setPartAction("");
        setPartState("");
    }


    function handleRemoveDraftPart(localId) {
        if (isClosed) return;
        setDraftParts((prev) => prev.filter((p) => p._localId !== localId));
    }

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

        setDraftParts([]);
    }

    async function handleCloseTicket() {
        if (!ticketId || isClosed) return;

        setCloseError("");
        setOdoError("");

        if (!description.trim()) {
        setCloseError("La description du travail effectué est obligatoire.");
        return;
        }

        // si l'utilisateur touche l'odo => exiger les deux
        const userTouchedOdo = odoStart !== "" || odoEnd !== "";
        let startVal = null;
        let endVal = null;

        if (userTouchedOdo) {
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

        // 1) pièces
        await saveDraftPartsToApi();

        // 2) odomètre (uniquement si modifié/saisi)
        if (userTouchedOdo) {
            await api(`/tickets/${ticketId}/odometer`, {
            method: "POST",
            body: JSON.stringify({ odo_start: startVal, odo_end: endVal }),
            });
        }

        // 3) fermeture
        const updatedTicket = await api(`/tickets/${ticketId}/status`, {
            method: "PATCH",
            body: JSON.stringify({
            status: "clos",
            description: description.trim(),
            }),
        });

        onTicketUpdated?.(updatedTicket);
        onClose?.();
        } catch (e) {
        console.error(e);
        // On affiche clairement le message backend (ex: "pièces installed et replaced obligatoires")
        setCloseError(e.message || "Erreur lors de la fermeture du ticket.");
        } finally {
        setClosing(false);
        }
    }

    async function handleAddConsumable(e) {
        e.preventDefault();
        if (!ticketId) return;

        setConsumablesError("");

        const name = consumableName.trim();
        if (!name) {
            setConsumablesError("Le nom du consommable est obligatoire.");
            return;
        }

        const qtyVal = consumableQty === "" ? null : Number(consumableQty);
        if (qtyVal !== null && (Number.isNaN(qtyVal) || qtyVal <= 0)) {
            setConsumablesError("La quantité doit être un nombre > 0.");
            return;
        }

        const unitVal = (consumableUnit || "unit").trim().toLowerCase();

        try {
            setConsumablesSaving(true);

            await api(`/tickets/${ticketId}/consumables`, {
            method: "POST",
            body: JSON.stringify({
                consumable_name: name,
                qty: qtyVal,
                unit: unitVal,
            }),
            });

            // reset champs
            setConsumableName("");
            setConsumableQty("");
            setConsumableUnit("unit");

            // refresh ticket (simple et fiable)
            const fresh = await api(`/tickets/${ticketId}`);
            setDetail(fresh);
            setConsumablesFromApi(fresh?.consumables || []);
        } catch (e2) {
            console.error(e2);
            setConsumablesError(e2.message || "Erreur lors de l'ajout du consommable.");
        } finally {
            setConsumablesSaving(false);
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

    if (!detail || !ticket) return null;

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
                {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : "-"}
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
                disabled={punchInProgress || isClosed}
                style={{
                    opacity: donePunches.has(pt) ? 0.5 : 1,
                    textDecoration: donePunches.has(pt) ? "line-through" : "none",
                }}
                onClick={() => handlePunch(pt)}
                title={isClosed ? "Ticket clos (lecture seule)" : ""}
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

            {isClosed ? (
                <>
                <p>
                    <strong>Départ :</strong> {ticket.odo_start ?? "-"} km &nbsp; / &nbsp;
                    <strong>Arrivée :</strong> {ticket.odo_end ?? "-"} km
                </p>
                {ticket.odo_start != null && ticket.odo_end != null && (
                    <p>
                    <strong>Distance parcourue :</strong>{" "}
                    {Number(ticket.odo_end) - Number(ticket.odo_start)} km
                    </p>
                )}
                </>
            ) : (
                <>
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
                </>
            )}
            </div>

            {/* Pièces / appareils */}
            <div style={{ marginTop: "1.5rem" }}>
            <h3>Pièces / appareils</h3>

            {isClosed ? (
                <>
                {partsFromApi.length === 0 ? (
                    <p>(Aucune pièce enregistrée)</p>
                ) : (
                    <table style={{ width: "100%", marginTop: "0.5rem" }}>
                    <thead>
                        <tr>
                        <th>Action</th>
                        <th>Pièce</th>
                        <th>Numéro de série</th>
                        <th>État</th>
                        </tr>
                    </thead>
                    <tbody>
                        {partsFromApi.map((p, idx) => (
                        <tr key={p.id ?? idx}>
                            <td>{p.part_action}</td>
                            <td>{p.part_name}</td>
                            <td>{p.serial_number}</td>
                            <td>{p.part_state}</td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                )}
                </>
            ) : (
                <>
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
                        style={{ minWidth: "160px" }}
                    >
                        <option value="">-- Choisir l'action --</option>
                        <option value="installed">Installed</option>
                        <option value="replaced">Replaced</option>
                        <option value="none">Aucune pièce utilisée</option>
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
                        disabled={isNone}
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
                        disabled={isNone}
                    />
                    </label>

                    <label>
                    État
                    <br />
                    <select
                        className="input"
                        value={partState}
                        onChange={(e) => setPartState(e.target.value)}
                        style={{ minWidth: "160px" }}
                        disabled={isNone}
                    >
                        <option value="">-- Choisir l'état --</option>
                        <option value="new">Neuf</option>
                        <option value="used">Usagé</option>
                        <option value="used">Endommagé</option>
                        <option value="DOA">DOA</option>
                    </select>
                    </label>

                    <button type="submit" className="primary-button">
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
                </>
            )}
            </div>

            {/* Consommables */}
            <div style={{ marginTop: "1.5rem" }}>
            <h3>Consommables</h3>

            {isClosed ? (
                <>
                {consumablesFromApi.length === 0 ? (
                    <p>(Aucun consommable enregistré)</p>
                ) : (
                    <table style={{ width: "100%", marginTop: "0.5rem" }}>
                    <thead>
                        <tr>
                        <th>Consommable</th>
                        <th>Quantité</th>
                        <th>Unité</th>
                        </tr>
                    </thead>
                    <tbody>
                        {consumablesFromApi.map((c, idx) => (
                        <tr key={c.id ?? idx}>
                            <td>{c.consumable_name}</td>
                            <td>{c.qty ?? "-"}</td>
                            <td>{c.unit ?? "-"}</td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                )}
                </>
            ) : (
                <>
                <form
                    onSubmit={handleAddConsumable}
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
                    Nom du consommable
                    <br />
                    <input
                        className="input"
                        value={consumableName}
                        onChange={(e) => setConsumableName(e.target.value)}
                        placeholder="Ex: Tie-wrap, vis, ruban…"
                        style={{ minWidth: "220px" }}
                    />
                    </label>

                    <label>
                    Quantité (optionnel)
                    <br />
                    <input
                        className="input"
                        type="number"
                        step="0.01"
                        min="0"
                        value={consumableQty}
                        onChange={(e) => setConsumableQty(e.target.value)}
                        placeholder="Ex: 1"
                        style={{ width: "160px" }}
                    />
                    </label>

                    <label>
                    Unité
                    <br />
                    <select
                        className="input"
                        value={consumableUnit}
                        onChange={(e) => setConsumableUnit(e.target.value)}
                        style={{ minWidth: "160px" }}
                    >
                        <option value="unit">Unité</option>
                        <option value="box">Boîte</option>
                        <option value="pack">Paquet</option>
                        <option value="roll">Rouleau</option>
                        <option value="m">Mètre</option>
                    </select>
                    </label>

                    <button type="submit" className="secondary-button" disabled={consumablesSaving}>
                    {consumablesSaving ? "Ajout..." : "Ajouter le consommable"}
                    </button>
                </form>

                {consumablesError && (
                    <p style={{ color: "crimson", marginBottom: "0.5rem" }}>
                    {consumablesError}
                    </p>
                )}

                {consumablesFromApi.length === 0 ? (
                    <p>Aucun consommable ajouté pour l’instant.</p>
                ) : (
                    <table style={{ width: "100%", marginTop: "0.5rem" }}>
                    <thead>
                        <tr>
                        <th>Consommable</th>
                        <th>Quantité</th>
                        <th>Unité</th>
                        </tr>
                    </thead>
                    <tbody>
                        {consumablesFromApi.map((c, idx) => (
                        <tr key={c.id ?? idx}>
                            <td>{c.consumable_name}</td>
                            <td>{c.qty ?? "-"}</td>
                            <td>{c.unit ?? "-"}</td>
                        </tr>
                        ))}
                    </tbody>
                    </table>
                )}
                </>
            )}
            </div>

            {/* Description */}
            <div style={{ marginTop: "1.5rem" }}>
            <h3>Description du travail</h3>

            {isClosed ? (
                <p>{ticket.description ? ticket.description : "(Aucune description)"}</p>
            ) : (
                <>
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
                </>
            )}
            </div>
        </div>
        </div>
    );
}
