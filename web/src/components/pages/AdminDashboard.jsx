// web/src/components/pages/AdminDashboard.jsx
import { useEffect, useState } from "react";
import { api } from "../../utils/api.js";

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        totalEmployees: 0,
        activeEmployees: 0,
        totalTickets: 0,
        activeTickets: 0,
        completedTickets: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [recentTickets, setRecentTickets] = useState([]);
    const [recentUsers, setRecentUsers] = useState([]);

    useEffect(() => {
        loadDashboardData();
    }, []);

    async function loadDashboardData() {
        try {
            setLoading(true);
            setError("");

            // Charger les utilisateurs
            const users = await api("/admin/users");
            const totalUsers = users.length;
            const activeUsers = users.filter((u) => u.is_active).length;
            const employees = users.filter((u) => ["tech", "team_lead", "manager"].includes(u.role));
            const totalEmployees = employees.length;
            const activeEmployees = employees.filter((u) => u.is_active).length;

            // Charger les tickets (utiliser l'endpoint admin)
            let ticketsData = [];
            try {
                ticketsData = await api("/admin/tickets?limit=100");
            } catch (e) {
                console.log("Endpoint tickets non disponible:", e);
            }

            const totalTickets = ticketsData.length || 0;
            const activeTickets = ticketsData.filter((t) => t.status !== "completed" && t.status !== "closed").length || 0;
            const completedTickets = ticketsData.filter((t) => t.status === "completed" || t.status === "closed").length || 0;

            // Tickets récents (5 derniers)
            const recent = ticketsData
                .sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt))
                .slice(0, 5);

            // Utilisateurs récents (5 derniers)
            const recentUsersList = users
                .sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt))
                .slice(0, 5);

            setStats({
                totalUsers,
                activeUsers,
                totalEmployees,
                activeEmployees,
                totalTickets,
                activeTickets,
                completedTickets,
            });
            setRecentTickets(recent);
            setRecentUsers(recentUsersList);
        } catch (e) {
            console.error(e);
            setError(e.message || "Erreur lors du chargement du dashboard");
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="table-card">
                <div className="table-header">
                    <h2>Tableau de bord</h2>
                </div>
                <div className="table-wrapper">
                    <p>Chargement...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="table-card">
                <div className="table-header">
                    <h2>Tableau de bord administrateur</h2>
                    <button className="secondary-button" onClick={loadDashboardData} disabled={loading}>
                        🔄 Actualiser
                    </button>
                </div>

                {error && (
                    <div className="form-message error" style={{ margin: "16px" }}>
                        {error}
                    </div>
                )}

                {/* Statistiques principales */}
                <div className="dashboard-stats-grid">
                    <div className="dashboard-stat-card">
                        <div className="stat-icon" style={{ background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)" }}>
                            👥
                        </div>
                        <div className="stat-content">
                            <div className="stat-label">Total utilisateurs</div>
                            <div className="stat-value">{stats.totalUsers}</div>
                            <div className="stat-sublabel">{stats.activeUsers} actifs</div>
                        </div>
                    </div>

                    <div className="dashboard-stat-card">
                        <div className="stat-icon" style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}>
                            👷
                        </div>
                        <div className="stat-content">
                            <div className="stat-label">Employés</div>
                            <div className="stat-value">{stats.totalEmployees}</div>
                            <div className="stat-sublabel">{stats.activeEmployees} actifs</div>
                        </div>
                    </div>

                    <div className="dashboard-stat-card">
                        <div className="stat-icon" style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }}>
                            📞
                        </div>
                        <div className="stat-content">
                            <div className="stat-label">Tickets actifs</div>
                            <div className="stat-value">{stats.activeTickets}</div>
                            <div className="stat-sublabel">sur {stats.totalTickets} total</div>
                        </div>
                    </div>

                    <div className="dashboard-stat-card">
                        <div className="stat-icon" style={{ background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)" }}>
                            ✅
                        </div>
                        <div className="stat-content">
                            <div className="stat-label">Tickets complétés</div>
                            <div className="stat-value">{stats.completedTickets}</div>
                            <div className="stat-sublabel">Terminés</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sections récentes */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "24px", marginTop: "24px" }}>
                {/* Tickets récents */}
                <div className="table-card">
                    <div className="table-header">
                        <h3>Tickets récents</h3>
                    </div>
                    <div className="table-wrapper">
                        {recentTickets.length === 0 ? (
                            <p style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)" }}>
                                Aucun ticket récent
                            </p>
                        ) : (
                            <table style={{ fontSize: "13px" }}>
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Statut</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentTickets.map((ticket) => (
                                        <tr key={ticket.id}>
                                            <td>#{ticket.id || ticket.ticket_id}</td>
                                            <td>
                                                <span className={`status-badge ${ticket.status === "completed" || ticket.status === "closed" ? "active" : "inactive"}`}>
                                                    {ticket.status || "En cours"}
                                                </span>
                                            </td>
                                            <td>
                                                {ticket.created_at || ticket.createdAt
                                                    ? new Date(ticket.created_at || ticket.createdAt).toLocaleDateString("fr-FR", {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "numeric",
                                                    })
                                                    : "-"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Utilisateurs récents */}
                <div className="table-card">
                    <div className="table-header">
                        <h3>Utilisateurs récents</h3>
                    </div>
                    <div className="table-wrapper">
                        {recentUsers.length === 0 ? (
                            <p style={{ padding: "20px", textAlign: "center", color: "var(--text-secondary)" }}>
                                Aucun utilisateur récent
                            </p>
                        ) : (
                            <table style={{ fontSize: "13px" }}>
                                <thead>
                                    <tr>
                                        <th>Nom</th>
                                        <th>Rôle</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentUsers.map((user) => (
                                        <tr key={user.id}>
                                            <td>
                                                {[user.first_name, user.last_name].filter(Boolean).join(" ") || user.email}
                                            </td>
                                            <td>
                                                <span className={`role-badge role-${user.role}`}>
                                                    {user.role === "tech" ? "Technicien" : user.role === "team_lead" ? "Chef d'équipe" : user.role === "manager" ? "Manager" : user.role === "admin" ? "Admin" : user.role}
                                                </span>
                                            </td>
                                            <td>
                                                {user.created_at
                                                    ? new Date(user.created_at).toLocaleDateString("fr-FR", {
                                                        year: "numeric",
                                                        month: "short",
                                                        day: "numeric",
                                                    })
                                                    : "-"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
