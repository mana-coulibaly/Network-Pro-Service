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
    const [odoStartImage, setOdoStartImage] = useState(null);
    const [odoStartImagePreview, setOdoStartImagePreview] = useState(null);
    const [odoEndImage, setOdoEndImage] = useState(null);
    const [odoEndImagePreview, setOdoEndImagePreview] = useState(null);
    const [odoError, setOdoError] = useState("");
    const [odoSaving, setOdoSaving] = useState(false);

    // --- PIÈCES (brouillon, envoyées à la fermeture du ticket) ---
    const [draftParts, setDraftParts] = useState([]);
    const [partAction, setPartAction] = useState(""); // <-- none par défaut
    const [partName, setPartName] = useState("");
    const [serialNumber, setSerialNumber] = useState("");
    const [partState, setPartState] = useState(""); // <-- none par défaut
    const [serialNumberImage, setSerialNumberImage] = useState(null);
    const [serialNumberImagePreview, setSerialNumberImagePreview] = useState(null);
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
    const timeSegments = detail?.timeSegments || {};

    const isClosed = ticket?.status === "clos" || ticket?.status === "COMPLETED";
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

        // Vérifier si le punch a déjà été effectué
        if (donePunches.has(type)) {
            // Le punch existe déjà, ne rien faire
            return;
        }

        setPunchInProgress(true);
        setError("");

        try {
        await api(`/tickets/${ticketId}/timestamps`, {
            method: "POST",
            body: JSON.stringify({ punch_type: type }),
        });

        // Recharger les données
        const data = await api(`/tickets/${ticketId}`);
        setDetail(data);
        } catch (e) {
        console.error(e);
        setError("Erreur punch : " + e.message);
        } finally {
        setPunchInProgress(false);
        }
    }

    function handleImageUpload(type, e) {
        const file = e.target.files[0];
        if (!file) return;

        // Vérifier que c'est une image
        if (!file.type.startsWith('image/')) {
            setOdoError("Veuillez sélectionner une image");
            return;
        }

        // Limiter la taille (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setOdoError("L'image est trop grande (max 5MB)");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            if (type === 'start') {
                setOdoStartImagePreview(reader.result);
                setOdoStartImage(reader.result);
            } else {
                setOdoEndImagePreview(reader.result);
                setOdoEndImage(reader.result);
            }
            setOdoError("");
        };
        reader.readAsDataURL(file);
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
            body: JSON.stringify({ 
                odo_start: startVal, 
                odo_end: endVal,
                odo_start_image: odoStartImage,
                odo_end_image: odoEndImage
            }),
        });

        // Recharger les données pour afficher les images
        const data = await api(`/tickets/${ticketId}`);
        setDetail(data);
        
        // Réinitialiser les previews
        setOdoStartImage(null);
        setOdoStartImagePreview(null);
        setOdoEndImage(null);
        setOdoEndImagePreview(null);
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
            serial_number_image: serialNumberImage,
            _localId: Date.now() + Math.random(),
        };

        setDraftParts((prev) => [...prev, newPart]);

        // reset
        setPartName("");
        setSerialNumber("");
        setPartAction("");
        setPartState("");
        setSerialNumberImage(null);
        setSerialNumberImagePreview(null);
    }

    function handlePartImageUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Vérifier que c'est une image
        if (!file.type.startsWith('image/')) {
            setPartsError("Veuillez sélectionner une image");
            return;
        }

        // Limiter la taille (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setPartsError("L'image est trop grande (max 5MB)");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setSerialNumberImagePreview(reader.result);
            setSerialNumberImage(reader.result);
            setPartsError("");
        };
        reader.readAsDataURL(file);
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
            serial_number_image: p.serial_number_image || null,
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
            status: "COMPLETED",
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

        // Validation de la quantité (obligatoire)
        if (!consumableQty || consumableQty.trim() === "") {
            setConsumablesError("La quantité est obligatoire.");
            return;
        }

        const qtyVal = Number(consumableQty);
        if (Number.isNaN(qtyVal) || qtyVal <= 0) {
            setConsumablesError("La quantité doit être un nombre > 0.");
            return;
        }

        // Validation de l'unité (obligatoire)
        if (!consumableUnit || consumableUnit.trim() === "") {
            setConsumablesError("L'unité est obligatoire.");
            return;
        }

        const unitVal = consumableUnit.trim().toLowerCase();

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
            setConsumableUnit("");

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
        <div className="table-card ticket-detail">
        <div className="table-header">
            <h2>Détail du ticket</h2>
            <button className="primary-button" onClick={onClose}>
            Fermer
            </button>
        </div>

        <div className="table-wrapper">
            {/* Infos principales */}
            <div className="ticket-info-card">
            <p>
                <strong>Client :</strong> {ticket.client_name}
                <br />
                <strong>Site :</strong> {ticket.site_name}
                <br />
                <strong>Adresse :</strong> {ticket.site_address}
                <br />
                <strong>Statut :</strong>{" "}
                <span className={`status-pill status-${ticket.status}`}>
                    {ticket.status}
                </span>
                <br />
                <strong>Créé le :</strong>{" "}
                {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : "-"}
            </p>
            </div>

            {/* Punches */}
            <div className="ticket-section">
            <h3>Suivi des déplacements</h3>
            
            {/* Workflow horizontal professionnel */}
            <div className="workflow-horizontal">
                {/* Étape 1: Quitter la maison */}
                <div className="workflow-item">
                    <div className={`workflow-node ${donePunches.has('leave_home') ? 'completed' : 'pending'}`}>
                        <div className="node-number">1</div>
                        <div className="node-icon">🏠</div>
                    </div>
                    <div className="workflow-label">
                        <strong>Quitter la maison</strong>
                        {donePunches.has('leave_home') && (
                            <span className="node-time">{new Date(timestamps.find(t => t.punch_type === 'leave_home')?.ts).toLocaleTimeString()}</span>
                        )}
                    </div>
                </div>

                {/* Connexion avec temps de trajet */}
                <div className="workflow-connector">
                    <div className="connector-line"></div>
                    {timeSegments.travel_home_to_warehouse && timeSegments.travel_home_to_warehouse !== '-' && (
                        <div className="connector-time travel">🚗 {timeSegments.travel_home_to_warehouse}</div>
                    )}
                </div>

                {/* Étape 2: Arriver à l'entrepôt */}
                <div className="workflow-item">
                    <div className={`workflow-node ${donePunches.has('reach_wh') ? 'completed' : 'pending'}`}>
                        <div className="node-number">2</div>
                        <div className="node-icon">📦</div>
                    </div>
                    <div className="workflow-label">
                        <strong>Arriver à l'entrepôt</strong>
                        {donePunches.has('reach_wh') && (
                            <span className="node-time">{new Date(timestamps.find(t => t.punch_type === 'reach_wh')?.ts).toLocaleTimeString()}</span>
                        )}
                    </div>
                </div>

                {/* Connexion avec temps de trajet */}
                <div className="workflow-connector">
                    <div className="connector-line"></div>
                    {timeSegments.travel_warehouse_to_site && timeSegments.travel_warehouse_to_site !== '-' && (
                        <div className="connector-time travel">🚗 {timeSegments.travel_warehouse_to_site}</div>
                    )}
                </div>

                {/* Étape 3: Arriver sur le site */}
                <div className="workflow-item">
                    <div className={`workflow-node ${donePunches.has('start_site') ? 'completed' : 'pending'}`}>
                        <div className="node-number">3</div>
                        <div className="node-icon">📍</div>
                    </div>
                    <div className="workflow-label">
                        <strong>Arriver sur le site</strong>
                        {donePunches.has('start_site') && (
                            <span className="node-time">{new Date(timestamps.find(t => t.punch_type === 'start_site')?.ts).toLocaleTimeString()}</span>
                        )}
                    </div>
                </div>

                {/* Connexion avec temps de travail */}
                <div className="workflow-connector">
                    <div className="connector-line work"></div>
                    {timeSegments.work_time_on_site && timeSegments.work_time_on_site !== '-' && (
                        <div className="connector-time work">⚙️ {timeSegments.work_time_on_site}</div>
                    )}
                </div>

                {/* Étape 4: Quitter le site */}
                <div className="workflow-item">
                    <div className={`workflow-node ${donePunches.has('leave_site') ? 'completed' : 'pending'}`}>
                        <div className="node-number">4</div>
                        <div className="node-icon">📍</div>
                    </div>
                    <div className="workflow-label">
                        <strong>Quitter le site</strong>
                        {donePunches.has('leave_site') && (
                            <span className="node-time">{new Date(timestamps.find(t => t.punch_type === 'leave_site')?.ts).toLocaleTimeString()}</span>
                        )}
                    </div>
                </div>

                {/* Connexion avec temps de trajet */}
                <div className="workflow-connector">
                    <div className="connector-line"></div>
                    {timeSegments.travel_site_to_warehouse && timeSegments.travel_site_to_warehouse !== '-' && (
                        <div className="connector-time travel">🚗 {timeSegments.travel_site_to_warehouse}</div>
                    )}
                </div>

                {/* Étape 5: Retourner à l'entrepôt */}
                <div className="workflow-item">
                    <div className={`workflow-node ${donePunches.has('back_wh') ? 'completed' : 'pending'}`}>
                        <div className="node-number">5</div>
                        <div className="node-icon">📦</div>
                    </div>
                    <div className="workflow-label">
                        <strong>Retourner à l'entrepôt</strong>
                        {donePunches.has('back_wh') && (
                            <span className="node-time">{new Date(timestamps.find(t => t.punch_type === 'back_wh')?.ts).toLocaleTimeString()}</span>
                        )}
                    </div>
                </div>

                {/* Connexion avec temps de trajet */}
                <div className="workflow-connector">
                    <div className="connector-line"></div>
                    {timeSegments.travel_warehouse_to_home && timeSegments.travel_warehouse_to_home !== '-' && (
                        <div className="connector-time travel">🚗 {timeSegments.travel_warehouse_to_home}</div>
                    )}
                </div>

                {/* Étape 6: Retourner à la maison */}
                <div className="workflow-item">
                    <div className={`workflow-node ${donePunches.has('back_home') ? 'completed' : 'pending'}`}>
                        <div className="node-number">6</div>
                        <div className="node-icon">🏠</div>
                    </div>
                    <div className="workflow-label">
                        <strong>Retourner à la maison</strong>
                        {donePunches.has('back_home') && (
                            <span className="node-time">{new Date(timestamps.find(t => t.punch_type === 'back_home')?.ts).toLocaleTimeString()}</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Boutons de punch rapides */}
            <div className="punches-container" style={{ marginTop: '20px' }}>
                {PUNCH_TYPES.map((pt) => {
                    const labels = {
                        'leave_home': 'Quitter maison',
                        'reach_wh': 'Arriver entrepôt',
                        'start_site': 'Arriver site',
                        'leave_site': 'Quitter site',
                        'back_wh': 'Retour entrepôt',
                        'back_home': 'Retour maison'
                    };
                    const isDone = donePunches.has(pt);
                    return (
                        <button
                            key={pt}
                            className={`punch-button ${isDone ? 'done' : ''}`}
                            disabled={punchInProgress || isClosed || isDone}
                            onClick={() => handlePunch(pt)}
                            title={
                                isClosed 
                                    ? "Ticket clos (lecture seule)" 
                                    : isDone 
                                        ? "Ce punch a déjà été effectué" 
                                        : ""
                            }
                        >
                            {labels[pt] || pt.replace('_', ' ')}
                        </button>
                    );
                })}
            </div>

            {/* Résumé des temps pour la paye */}
            {(timeSegments.total_travel_time || timeSegments.total_work_time) && (
                <div className="time-summary">
                    <h4 style={{ marginTop: '20px', marginBottom: '12px', fontSize: '15px', fontWeight: 600 }}>Heures pour la paye</h4>
                    <div className="time-summary-grid">
                        {timeSegments.total_travel_time && timeSegments.total_travel_time !== '-' && (
                            <div className="time-summary-item">
                                <span className="time-label">Temps de trajet (payé)</span>
                                <span className="time-value">{timeSegments.total_travel_time}</span>
                                <span className="time-description">(Tous les trajets: Maison→Entrepôt→Site→Entrepôt→Maison)</span>
                            </div>
                        )}
                        {timeSegments.total_work_time && timeSegments.total_work_time !== '-' && (
                            <div className="time-summary-item">
                                <span className="time-label">Temps de travail (payé)</span>
                                <span className="time-value">{timeSegments.total_work_time}</span>
                                <span className="time-description">(Arrivée site → Quitter site)</span>
                            </div>
                        )}
                        {timeSegments.total_time && timeSegments.total_time !== '-' && (
                            <div className="time-summary-item total">
                                <span className="time-label">Temps total</span>
                                <span className="time-value">{timeSegments.total_time}</span>
                                <span className="time-description">(Du départ au retour)</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
            </div>

            {/* Odomètre */}
            <div className="ticket-section">
            <h3>Odomètre</h3>

            {isClosed ? (
                <div className="odometer-display-readonly">
                    <div className="odometer-item-readonly">
                        <div className="odometer-header">
                            <strong>Départ</strong>
                        </div>
                        <div className="odometer-value-readonly">
                            {ticket.odo_start != null ? `${ticket.odo_start} km` : "Non enregistré"}
                        </div>
                        {ticket.odo_start_image && (
                            <div className="odometer-image-container">
                                <img 
                                    src={ticket.odo_start_image} 
                                    alt="Odomètre de départ" 
                                    className="odometer-image"
                                    onClick={() => window.open(ticket.odo_start_image, '_blank')}
                                />
                            </div>
                        )}
                    </div>

                    <div className="odometer-item-readonly">
                        <div className="odometer-header">
                            <strong>Arrivée</strong>
                        </div>
                        <div className="odometer-value-readonly">
                            {ticket.odo_end != null ? `${ticket.odo_end} km` : "Non enregistré"}
                        </div>
                        {ticket.odo_end_image && (
                            <div className="odometer-image-container">
                                <img 
                                    src={ticket.odo_end_image} 
                                    alt="Odomètre d'arrivée" 
                                    className="odometer-image"
                                    onClick={() => window.open(ticket.odo_end_image, '_blank')}
                                />
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="odometer-form-professional">
                    <div className="odometer-field-group">
                        <label className="odometer-field-label">
                            <span className="label-text">Départ (km)</span>
                            <input
                                type="number"
                                min="0"
                                value={odoStart}
                                onChange={(e) => setOdoStart(e.target.value)}
                                className="input odometer-input"
                                placeholder="0"
                            />
                        </label>
                        <div className="odometer-image-upload">
                            <label className="image-upload-label">
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={(e) => handleImageUpload('start', e)}
                                    className="image-upload-input"
                                    style={{ display: 'none' }}
                                />
                                <span className="image-upload-button">
                                    {odoStartImagePreview || ticket.odo_start_image ? '📷 Changer l\'image' : '📷 Ajouter une image'}
                                </span>
                            </label>
                            {(odoStartImagePreview || ticket.odo_start_image) && (
                                <div className="image-preview-container">
                                    <img 
                                        src={odoStartImagePreview || ticket.odo_start_image} 
                                        alt="Aperçu départ" 
                                        className="image-preview-thumbnail"
                                    />
                                    {odoStartImagePreview && (
                                        <button
                                            type="button"
                                            className="image-remove-button"
                                            onClick={() => {
                                                setOdoStartImage(null);
                                                setOdoStartImagePreview(null);
                                            }}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="odometer-field-group">
                        <label className="odometer-field-label">
                            <span className="label-text">Arrivée (km)</span>
                            <input
                                type="number"
                                min="0"
                                value={odoEnd}
                                onChange={(e) => setOdoEnd(e.target.value)}
                                className="input odometer-input"
                                placeholder="0"
                            />
                        </label>
                        <div className="odometer-image-upload">
                            <label className="image-upload-label">
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    onChange={(e) => handleImageUpload('end', e)}
                                    className="image-upload-input"
                                    style={{ display: 'none' }}
                                />
                                <span className="image-upload-button">
                                    {odoEndImagePreview || ticket.odo_end_image ? '📷 Changer l\'image' : '📷 Ajouter une image'}
                                </span>
                            </label>
                            {(odoEndImagePreview || ticket.odo_end_image) && (
                                <div className="image-preview-container">
                                    <img 
                                        src={odoEndImagePreview || ticket.odo_end_image} 
                                        alt="Aperçu arrivée" 
                                        className="image-preview-thumbnail"
                                    />
                                    {odoEndImagePreview && (
                                        <button
                                            type="button"
                                            className="image-remove-button"
                                            onClick={() => {
                                                setOdoEndImage(null);
                                                setOdoEndImagePreview(null);
                                            }}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {odoError && (
                <div className="form-message error" style={{ marginTop: '16px' }}>{odoError}</div>
            )}

            {!isClosed && (
                <button
                    className="primary-button"
                    onClick={handleSaveOdometer}
                    disabled={odoSaving}
                    style={{ marginTop: '20px' }}
                >
                    {odoSaving ? "Enregistrement..." : "Enregistrer l'odomètre"}
                </button>
            )}

            {ticket.odo_start != null && ticket.odo_end != null && (
                <div className="odometer-distance">
                    <strong>Distance parcourue :</strong> {Number(ticket.odo_end) - Number(ticket.odo_start)} km
                </div>
            )}
            </div>

            {/* Pièces / appareils */}
            <div className="ticket-section">
            <h3>Pièces / appareils</h3>

            {/* Fonctions de traduction */}
            {(() => {
                const translateAction = (action) => {
                    const translations = {
                        'installed': 'Installée',
                        'replaced': 'Remplacée',
                        'none': 'Aucune pièce utilisée'
                    };
                    return translations[action] || action;
                };

                const translateState = (state) => {
                    const translations = {
                        'new': 'Neuf',
                        'used': 'Usagé',
                        'broken': 'Endommagé',
                        'DOA': 'DOA'
                    };
                    return translations[state] || state;
                };

                return isClosed ? (
                    <div className="parts-list-professional">
                    {partsFromApi.length === 0 ? (
                        <div className="empty-state">
                            <p>Aucune pièce enregistrée</p>
                        </div>
                    ) : (
                        <div className="parts-table-container">
                            <table className="parts-table">
                            <thead>
                                <tr>
                                <th>Action</th>
                                <th>Pièce</th>
                                <th>Numéro de série</th>
                                <th>Photo</th>
                                <th>État</th>
                                </tr>
                            </thead>
                            <tbody>
                                {partsFromApi.map((p, idx) => (
                                <tr key={p.id ?? idx}>
                                    <td>
                                        <span className={`badge-action badge-${p.part_action}`}>
                                            {translateAction(p.part_action)}
                                        </span>
                                    </td>
                                    <td><strong>{p.part_name}</strong></td>
                                    <td>{p.serial_number || '-'}</td>
                                    <td>
                                        {p.serial_number_image ? (
                                            <div className="serial-image-cell">
                                                <img 
                                                    src={p.serial_number_image} 
                                                    alt={`Numéro de série ${p.serial_number}`}
                                                    className="serial-image-thumbnail"
                                                    onClick={() => window.open(p.serial_number_image, '_blank')}
                                                />
                                            </div>
                                        ) : (
                                            <span className="no-image">-</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`badge-state badge-${p.part_state}`}>
                                            {translateState(p.part_state)}
                                        </span>
                                    </td>
                                </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                    )}
                    </div>
                ) : (
                    <>
                    <form onSubmit={handleAddDraftPart} className="parts-form-professional">
                        <div className="parts-form-grid">
                            <div className="form-field-group">
                                <label htmlFor="part-action" className="form-label">
                                    Action <span className="required">*</span>
                                </label>
                                <select
                                    id="part-action"
                                    className="input select-professional"
                                    value={partAction}
                                    onChange={(e) => setPartAction(e.target.value)}
                                >
                                    <option value="">-- Choisir l'action --</option>
                                    <option value="installed">Installée</option>
                                    <option value="replaced">Remplacée</option>
                                    <option value="none">Aucune pièce utilisée</option>
                                </select>
                            </div>

                            <div className="form-field-group">
                                <label htmlFor="part-name" className="form-label">
                                    Nom de la pièce <span className="required">*</span>
                                </label>
                                <input
                                    id="part-name"
                                    className="input input-professional"
                                    value={partName}
                                    onChange={(e) => setPartName(e.target.value)}
                                    placeholder="Ex: POS, routeur…"
                                    disabled={isNone}
                                />
                            </div>

                            <div className="form-field-group">
                                <label htmlFor="serial-number" className="form-label">
                                    Numéro de série <span className="required">*</span>
                                </label>
                                <input
                                    id="serial-number"
                                    className="input input-professional"
                                    value={serialNumber}
                                    onChange={(e) => setSerialNumber(e.target.value)}
                                    placeholder="SN123456"
                                    disabled={isNone}
                                />
                            </div>

                            <div className="form-field-group">
                                <label htmlFor="serial-image" className="form-label">
                                    Photo du numéro de série
                                </label>
                                <label className="image-upload-label">
                                    <input
                                        id="serial-image"
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        onChange={handlePartImageUpload}
                                        className="image-upload-input"
                                        style={{ display: 'none' }}
                                        disabled={isNone}
                                    />
                                    <span className="image-upload-button">
                                        {serialNumberImagePreview ? '📷 Changer l\'image' : '📷 Ajouter une photo'}
                                    </span>
                                </label>
                                {serialNumberImagePreview && (
                                    <div className="image-preview-container" style={{ marginTop: '8px' }}>
                                        <img 
                                            src={serialNumberImagePreview} 
                                            alt="Aperçu numéro de série" 
                                            className="image-preview-thumbnail"
                                        />
                                        <button
                                            type="button"
                                            className="image-remove-button"
                                            onClick={() => {
                                                setSerialNumberImage(null);
                                                setSerialNumberImagePreview(null);
                                            }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="form-field-group">
                                <label htmlFor="part-state" className="form-label">
                                    État <span className="required">*</span>
                                </label>
                                <select
                                    id="part-state"
                                    className="input select-professional"
                                    value={partState}
                                    onChange={(e) => setPartState(e.target.value)}
                                    disabled={isNone}
                                >
                                    <option value="">-- Choisir l'état --</option>
                                    <option value="new">Neuf</option>
                                    <option value="used">Usagé</option>
                                    <option value="broken">Endommagé</option>
                                    <option value="DOA">DOA</option>
                                </select>
                            </div>
                        </div>

                        <button type="submit" className="primary-button parts-add-button">
                            <span>➕</span> Ajouter la pièce
                        </button>
                    </form>

                    {partsError && (
                        <div className="form-message error" style={{ marginTop: '16px' }}>{partsError}</div>
                    )}

                    <div className="parts-list-professional" style={{ marginTop: '24px' }}>
                    {draftParts.length === 0 ? (
                        <div className="empty-state">
                            <p>Aucune pièce ajoutée pour l'instant.</p>
                        </div>
                    ) : (
                        <div className="parts-table-container">
                            <table className="parts-table">
                            <thead>
                                <tr>
                                <th>Action</th>
                                <th>Pièce</th>
                                <th>Numéro de série</th>
                                <th>Photo</th>
                                <th>État</th>
                                <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {draftParts.map((p) => (
                                <tr key={p._localId}>
                                    <td>
                                        <span className={`badge-action badge-${p.part_action}`}>
                                            {translateAction(p.part_action)}
                                        </span>
                                    </td>
                                    <td><strong>{p.part_name}</strong></td>
                                    <td>{p.serial_number || '-'}</td>
                                    <td>
                                        {p.serial_number_image ? (
                                            <div className="serial-image-cell">
                                                <img 
                                                    src={p.serial_number_image} 
                                                    alt={`Numéro de série ${p.serial_number}`}
                                                    className="serial-image-thumbnail"
                                                    onClick={() => window.open(p.serial_number_image, '_blank')}
                                                />
                                            </div>
                                        ) : (
                                            <span className="no-image">-</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`badge-state badge-${p.part_state || 'none'}`}>
                                            {p.part_state ? translateState(p.part_state) : '-'}
                                        </span>
                                    </td>
                                    <td>
                                    <button
                                        type="button"
                                        className="button-remove"
                                        onClick={() => handleRemoveDraftPart(p._localId)}
                                        title="Retirer cette pièce"
                                    >
                                        🗑️ Retirer
                                    </button>
                                    </td>
                                </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                    )}
                    </div>
                    </>
                );
            })()}
            </div>

            {/* Consommables */}
            <div className="ticket-section">
            <h3>Consommables</h3>

            {(() => {
                const translateUnit = (unit) => {
                    const translations = {
                        'unit': 'Unité',
                        'box': 'Boîte',
                        'pack': 'Paquet',
                        'roll': 'Rouleau',
                        'm': 'Mètre'
                    };
                    return translations[unit] || unit;
                };

                return isClosed ? (
                    <div className="consumables-list-professional">
                    {consumablesFromApi.length === 0 ? (
                        <div className="empty-state">
                            <p>Aucun consommable enregistré</p>
                        </div>
                    ) : (
                        <div className="consumables-table-container">
                            <table className="consumables-table">
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
                                    <td><strong>{c.consumable_name}</strong></td>
                                    <td>
                                        {c.qty != null ? (
                                            <span className="quantity-badge">{c.qty}</span>
                                        ) : (
                                            <span className="quantity-empty">-</span>
                                        )}
                                    </td>
                                    <td>
                                        {c.unit ? (
                                            <span className={`badge-unit badge-${c.unit}`}>
                                                {translateUnit(c.unit)}
                                            </span>
                                        ) : (
                                            <span className="quantity-empty">-</span>
                                        )}
                                    </td>
                                </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                    )}
                    </div>
                ) : (
                    <>
                    <form onSubmit={handleAddConsumable} className="consumables-form-professional">
                        <div className="consumables-form-grid">
                            <div className="form-field-group">
                                <label htmlFor="consumable-name" className="form-label">
                                    Nom du consommable <span className="required">*</span>
                                </label>
                                <input
                                    id="consumable-name"
                                    className="input input-professional"
                                    value={consumableName}
                                    onChange={(e) => setConsumableName(e.target.value)}
                                    placeholder="Ex: Tie-wrap, vis, ruban…"
                                />
                            </div>

                            <div className="form-field-group">
                                <label htmlFor="consumable-qty" className="form-label">
                                    Quantité <span className="required">*</span>
                                </label>
                                <input
                                    id="consumable-qty"
                                    className="input input-professional"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={consumableQty}
                                    onChange={(e) => setConsumableQty(e.target.value)}
                                    placeholder="Ex: 1, 2.5..."
                                    required
                                />
                            </div>

                            <div className="form-field-group">
                                <label htmlFor="consumable-unit" className="form-label">
                                    Unité <span className="required">*</span>
                                </label>
                                <select
                                    id="consumable-unit"
                                    className="input select-professional"
                                    value={consumableUnit}
                                    onChange={(e) => setConsumableUnit(e.target.value)}
                                    required
                                >
                                    <option value="">-- Choisir l'unité --</option>
                                    <option value="unit">Unité</option>
                                    <option value="box">Boîte</option>
                                    <option value="pack">Paquet</option>
                                    <option value="roll">Rouleau</option>
                                    <option value="m">Mètre</option>
                                </select>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="primary-button consumables-add-button"
                            disabled={consumablesSaving}
                        >
                            <span>➕</span> {consumablesSaving ? "Ajout en cours..." : "Ajouter le consommable"}
                        </button>
                    </form>

                    {consumablesError && (
                        <div className="form-message error" style={{ marginTop: '16px' }}>{consumablesError}</div>
                    )}

                    <div className="consumables-list-professional" style={{ marginTop: '24px' }}>
                    {consumablesFromApi.length === 0 ? (
                        <div className="empty-state">
                            <p>Aucun consommable ajouté pour l'instant.</p>
                        </div>
                    ) : (
                        <div className="consumables-table-container">
                            <table className="consumables-table">
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
                                    <td><strong>{c.consumable_name}</strong></td>
                                    <td>
                                        {c.qty != null ? (
                                            <span className="quantity-badge">{c.qty}</span>
                                        ) : (
                                            <span className="quantity-empty">-</span>
                                        )}
                                    </td>
                                    <td>
                                        {c.unit ? (
                                            <span className={`badge-unit badge-${c.unit}`}>
                                                {translateUnit(c.unit)}
                                            </span>
                                        ) : (
                                            <span className="quantity-empty">-</span>
                                        )}
                                    </td>
                                </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                    )}
                    </div>
                    </>
                );
            })()}
            </div>

            {/* Description */}
            <div className="ticket-section description-section">
            <h3>Description du travail</h3>

            {isClosed ? (
                <div className="description-readonly">
                    {ticket.description ? (
                        <div className="description-content">
                            {ticket.description.split('\n').map((line, idx) => (
                                <p key={idx}>{line || '\u00A0'}</p>
                            ))}
                        </div>
                    ) : (
                        <p className="description-empty">(Aucune description)</p>
                    )}
                </div>
            ) : (
                <div className="description-form-professional">
                    <div className="form-field-group">
                        <textarea
                            id="work-description"
                            className="textarea-professional"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Décrire le travail effectué, les actions réalisées, les remarques, les problèmes rencontrés, etc."
                            rows={8}
                            required
                        />
                        <div className="description-footer">
                            <span className="required-indicator">* Champ obligatoire</span>
                            <span className="character-count">
                                {description.length} caractère{description.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>

                    {closeError && (
                        <div className="form-message error" style={{ marginTop: "16px" }}>
                            {closeError}
                        </div>
                    )}

                    <button
                        className="primary-button close-ticket-button"
                        onClick={handleCloseTicket}
                        disabled={closing || !description.trim()}
                        style={{ marginTop: "24px" }}
                    >
                        {closing ? (
                            <>
                                <span className="spinner"></span> Fermeture en cours…
                            </>
                        ) : (
                            <>
                                <span>✓</span> Fermer le ticket
                            </>
                        )}
                    </button>
                </div>
            )}
            </div>
        </div>
        </div>
    );
}
