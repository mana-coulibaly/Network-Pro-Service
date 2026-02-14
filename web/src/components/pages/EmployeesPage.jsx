// web/src/components/pages/EmployeesPage.jsx
import { useEffect, useState } from "react";
import { api } from "../../utils/api.js";

export default function EmployeesPage() {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [employeeDetails, setEmployeeDetails] = useState(null);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        loadEmployees();
    }, []);

    async function loadEmployees() {
        try {
            setLoading(true);
            setError("");
            const data = await api("/admin/users");
            // Filtrer uniquement les employés (tech, team_lead, manager)
            const employeesList = (data || []).filter(
                (u) => ["tech", "team_lead", "manager"].includes(u.role)
            );
            setEmployees(employeesList);
        } catch (e) {
            console.error(e);
            setError(e.message || "Erreur lors du chargement des employés");
        } finally {
            setLoading(false);
        }
    }

    async function handleSelectEmployee(employee) {
        setSelectedEmployee(employee);
        setEmployeeDetails(null);
        
        // Charger les détails complets de l'employé (profil technique, équipements, certifications)
        if (["tech", "team_lead", "manager"].includes(employee.role)) {
            try {
                setLoadingDetails(true);
                // Utiliser l'endpoint admin pour les détails
                const details = await api(`/admin/employees/${employee.id}`);
                setEmployeeDetails(details);
            } catch (e) {
                console.error("Erreur chargement détails:", e);
                // Si l'endpoint n'existe pas ou erreur, on continue avec les infos de base
            } finally {
                setLoadingDetails(false);
            }
        }
    }

    function handleCloseDetail() {
        setSelectedEmployee(null);
    }

    const translateRole = (role) => {
        const translations = {
            tech: "Technicien",
            team_lead: "Chef d'équipe",
            manager: "Manager",
        };
        return translations[role] || role;
    };

    const filteredEmployees = employees.filter((emp) => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            (emp.email && emp.email.toLowerCase().includes(search)) ||
            (emp.first_name && emp.first_name.toLowerCase().includes(search)) ||
            (emp.last_name && emp.last_name.toLowerCase().includes(search)) ||
            (emp.role && emp.role.toLowerCase().includes(search))
        );
    });

    if (loading) {
        return (
            <div className="table-card">
                <div className="table-header">
                    <h2>Employés</h2>
                </div>
                <div className="table-wrapper">
                    <p>Chargement...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="table-card">
                <div className="table-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
                    <h2>Employés</h2>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                        <input
                            type="text"
                            className="input"
                            placeholder="Rechercher un employé..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ minWidth: "250px" }}
                        />
                        <button
                            className="secondary-button"
                            onClick={loadEmployees}
                            disabled={loading}
                        >
                            🔄 Rafraîchir
                        </button>
                    </div>
                </div>

                {error && !loading && (
                    <div className="form-message error" style={{ margin: "16px" }}>
                        {error}
                    </div>
                )}

                {!loading && !error && (
                    <div className="table-wrapper">
                        <table className="employees-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Nom complet</th>
                                    <th>Email</th>
                                    <th>Rôle</th>
                                    <th>Statut</th>
                                    <th>Date de création</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEmployees.length === 0 && (
                                    <tr>
                                        <td colSpan={7} style={{ textAlign: "center", padding: "40px" }}>
                                            {searchTerm ? "Aucun employé trouvé" : "Aucun employé"}
                                        </td>
                                    </tr>
                                )}

                                {filteredEmployees.map((emp, idx) => (
                                    <tr key={emp.id}>
                                        <td>{idx + 1}</td>
                                        <td>
                                            <strong>
                                                {[emp.first_name, emp.last_name]
                                                    .filter(Boolean)
                                                    .join(" ") || "Non renseigné"}
                                            </strong>
                                        </td>
                                        <td>{emp.email}</td>
                                        <td>
                                            <span className={`role-badge role-${emp.role}`}>
                                                {translateRole(emp.role)}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`status-badge ${emp.is_active ? "active" : "inactive"}`}>
                                                {emp.is_active ? "Actif" : "Inactif"}
                                            </span>
                                        </td>
                                        <td>
                                            {emp.created_at
                                                ? new Date(emp.created_at).toLocaleDateString("fr-FR", {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                })
                                                : "-"}
                                        </td>
                                        <td>
                                            <button
                                                className="secondary-button"
                                                onClick={() => handleSelectEmployee(emp)}
                                                style={{ fontSize: "13px", padding: "8px 16px" }}
                                            >
                                                Voir détails
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {filteredEmployees.length > 0 && (
                    <div style={{ padding: "16px", fontSize: "13px", color: "var(--text-secondary)" }}>
                        Total : {filteredEmployees.length} employé{filteredEmployees.length > 1 ? "s" : ""}
                    </div>
                )}
            </div>

            {/* Modal de détails de l'employé */}
            {selectedEmployee && (
                <div className="modal-overlay" onClick={handleCloseDetail}>
                    <div className="modal-content employee-detail-modal" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                            <h3>Détails de l'employé</h3>
                            <button
                                className="icon-button"
                                onClick={handleCloseDetail}
                                style={{ fontSize: "20px" }}
                            >
                                ✕
                            </button>
                        </div>

                        {loadingDetails ? (
                            <div style={{ textAlign: "center", padding: "40px" }}>
                                <p>Chargement des détails...</p>
                            </div>
                        ) : (
                            <>
                                <div className="employee-detail-grid">
                                    <div className="employee-detail-item">
                                        <span className="detail-label">Nom complet</span>
                                        <span className="detail-value">
                                            {[selectedEmployee.first_name, selectedEmployee.last_name]
                                                .filter(Boolean)
                                                .join(" ") || "Non renseigné"}
                                        </span>
                                    </div>

                                    <div className="employee-detail-item">
                                        <span className="detail-label">Email</span>
                                        <span className="detail-value">{selectedEmployee.email}</span>
                                    </div>

                                    <div className="employee-detail-item">
                                        <span className="detail-label">Rôle</span>
                                        <span className={`role-badge role-${selectedEmployee.role}`}>
                                            {translateRole(selectedEmployee.role)}
                                        </span>
                                    </div>

                                    <div className="employee-detail-item">
                                        <span className="detail-label">Statut</span>
                                        <span className={`status-badge ${selectedEmployee.is_active ? "active" : "inactive"}`}>
                                            {selectedEmployee.is_active ? "Actif" : "Inactif"}
                                        </span>
                                    </div>

                                    <div className="employee-detail-item">
                                        <span className="detail-label">Date de création</span>
                                        <span className="detail-value">
                                            {selectedEmployee.created_at
                                                ? new Date(selectedEmployee.created_at).toLocaleDateString("fr-FR", {
                                                    year: "numeric",
                                                    month: "long",
                                                    day: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })
                                                : "-"}
                                        </span>
                                    </div>

                                    {employeeDetails?.tech && (
                                        <>
                                            {employeeDetails.tech.hourly_rate && (
                                                <div className="employee-detail-item">
                                                    <span className="detail-label">Taux horaire</span>
                                                    <span className="detail-value">
                                                        {employeeDetails.tech.hourly_rate.toFixed(2)} $/h
                                                    </span>
                                                </div>
                                            )}

                                            {employeeDetails.tech.km_rate && (
                                                <div className="employee-detail-item">
                                                    <span className="detail-label">Taux kilométrique</span>
                                                    <span className="detail-value">
                                                        {employeeDetails.tech.km_rate.toFixed(2)} $/km
                                                    </span>
                                                </div>
                                            )}

                                            {employeeDetails.tech.notes && (
                                                <div className="employee-detail-item" style={{ gridColumn: "1 / -1" }}>
                                                    <span className="detail-label">Notes</span>
                                                    <span className="detail-value" style={{ whiteSpace: "pre-wrap" }}>
                                                        {employeeDetails.tech.notes}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {selectedEmployee.must_change_password && (
                                        <div className="employee-detail-item warning">
                                            <span className="detail-label">⚠️ Action requise</span>
                                            <span className="detail-value">
                                                L'employé doit changer son mot de passe
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Équipements */}
                                {employeeDetails?.assets && employeeDetails.assets.length > 0 && (
                                    <div style={{ marginTop: "24px" }}>
                                        <h4 style={{ marginBottom: "16px", fontSize: "16px", fontWeight: 600 }}>
                                            Équipements ({employeeDetails.assets.length})
                                        </h4>
                                        <div className="table-wrapper" style={{ maxHeight: "200px", overflowY: "auto" }}>
                                            <table style={{ fontSize: "13px" }}>
                                                <thead>
                                                    <tr>
                                                        <th>Nom</th>
                                                        <th>Numéro de série</th>
                                                        <th>Statut</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {employeeDetails.assets.map((asset) => (
                                                        <tr key={asset.id}>
                                                            <td>{asset.asset_name}</td>
                                                            <td>{asset.serial_number || "-"}</td>
                                                            <td>
                                                                <span className={`status-badge ${asset.active ? "active" : "inactive"}`}>
                                                                    {asset.active ? "Actif" : "Inactif"}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Certifications */}
                                {employeeDetails?.certifications && employeeDetails.certifications.length > 0 && (
                                    <div style={{ marginTop: "24px" }}>
                                        <h4 style={{ marginBottom: "16px", fontSize: "16px", fontWeight: 600 }}>
                                            Certifications ({employeeDetails.certifications.length})
                                        </h4>
                                        <div className="table-wrapper" style={{ maxHeight: "200px", overflowY: "auto" }}>
                                            <table style={{ fontSize: "13px" }}>
                                                <thead>
                                                    <tr>
                                                        <th>Nom</th>
                                                        <th>Date d'expiration</th>
                                                        <th>Statut</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {employeeDetails.certifications.map((cert) => {
                                                        const expiresOn = cert.expires_on ? new Date(cert.expires_on) : null;
                                                        const isExpired = expiresOn && expiresOn < new Date();
                                                        const isExpiringSoon = expiresOn && expiresOn < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                                                        
                                                        return (
                                                            <tr key={cert.id}>
                                                                <td>{cert.cert_name}</td>
                                                                <td>
                                                                    {expiresOn
                                                                        ? expiresOn.toLocaleDateString("fr-FR", {
                                                                            year: "numeric",
                                                                            month: "long",
                                                                            day: "numeric",
                                                                        })
                                                                        : "Sans expiration"}
                                                                </td>
                                                                <td>
                                                                    {expiresOn ? (
                                                                        <span className={`status-badge ${isExpired ? "inactive" : isExpiringSoon ? "warning" : "active"}`}>
                                                                            {isExpired ? "Expirée" : isExpiringSoon ? "Expire bientôt" : "Valide"}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="status-badge active">Valide</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
                            <button
                                className="secondary-button"
                                onClick={handleCloseDetail}
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
