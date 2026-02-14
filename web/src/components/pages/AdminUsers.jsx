// web/src/components/pages/AdminUsers.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../utils/api.js";

const ROLES = [
    { value: "tech", label: "Tech" },
    { value: "team_lead", label: "Team Lead" },
    { value: "manager", label: "Manager" },
    { value: "admin", label: "Admin" },
];

export default function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState(null);
    const [error, setError] = useState("");

    // Form create user
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [role, setRole] = useState("tech");
    const [createError, setCreateError] = useState("");
    const [creating, setCreating] = useState(false);

    // affichage du dernier compte créé (email + mdp temporaire)
    const [createdInfo, setCreatedInfo] = useState(null); // { email, temp_password }

    const sortedUsers = useMemo(() => {
        const arr = Array.isArray(users) ? [...users] : [];
        arr.sort((a, b) =>
        String(a.email || "").localeCompare(String(b.email || ""))
        );
        return arr;
    }, [users]);

    async function loadUsers() {
        setLoading(true);
        setError("");
        try {
            const data = await api("/admin/users");
            setUsers(Array.isArray(data) ? data : data?.users || []);
        } catch (e) {
            setError(e.message || "Erreur chargement utilisateurs");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadUsers();
    }, []);

    async function handleCreateUser(e) {
        e.preventDefault();
        setCreateError("");
        setCreatedInfo(null);

        const fn = firstName.trim();
        const ln = lastName.trim();

        if (!fn) return setCreateError("Prénom obligatoire.");
        if (!ln) return setCreateError("Nom obligatoire.");
        if (!role) return setCreateError("Rôle obligatoire.");

        try {
        setCreating(true);

        const resp = await api("/admin/users", {
            method: "POST",
            body: JSON.stringify({
            first_name: fn,
            last_name: ln,
            role,
            }),
        });

        // ton backend renvoie: { user: {...}, temp_password: "..." }
        const email = resp?.user?.email;
        const temp = resp?.temp_password;

        if (email && temp) {
            setCreatedInfo({ email, temp_password: temp });
        }

        setFirstName("");
        setLastName("");
        setRole("tech");

        await loadUsers();
        } catch (e2) {
        setCreateError(e2.message || "Erreur création utilisateur");
        } finally {
        setCreating(false);
        }
    }

    async function patchUser(userId, payload) {
        setBusyId(userId);
        setError("");
        try {
        await api(`/admin/users/${userId}`, {
            method: "PATCH",
            body: JSON.stringify(payload),
        });
        await loadUsers();
        } catch (e) {
        setError(e.message || "Erreur mise à jour utilisateur");
        } finally {
        setBusyId(null);
        }
    }

    function copyToClipboard(text) {
        try {
        navigator.clipboard.writeText(text);
        } catch {
        // fallback simple
        window.prompt("Copie ce texte :", text);
        }
    }

    return (
        <>
        <div
            className="table-header"
            style={{ display: "flex", justifyContent: "space-between" }}
        >
            <h2>Utilisateurs</h2>
            <button
            className="secondary-button"
            onClick={loadUsers}
            disabled={loading}
            >
            Rafraîchir
            </button>
        </div>

        {/* Création user */}
        <div style={{ marginBottom: "1rem" }}>
            <h3 style={{ marginBottom: "0.5rem" }}>Créer un utilisateur</h3>

            <form
            onSubmit={handleCreateUser}
            style={{
                border: "1px solid #ddd",
                padding: "0.75rem",
                borderRadius: "8px",
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
                alignItems: "flex-end",
            }}
            >
            <label>
                Prénom
                <br />
                <input
                className="input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ex: John"
                style={{ minWidth: "220px" }}
                required
                />
            </label>

            <label>
                Nom
                <br />
                <input
                className="input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Ex: Smith"
                style={{ minWidth: "220px" }}
                required
                />
            </label>

            <label>
                Rôle
                <br />
                <select
                className="input"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ minWidth: "180px" }}
                >
                {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                    {r.label}
                    </option>
                ))}
                </select>
            </label>

            <button type="submit" className="primary-button" disabled={creating}>
                {creating ? "Création..." : "Créer"}
            </button>
            </form>

            {createError && (
            <p style={{ color: "crimson", marginTop: "0.5rem" }}>{createError}</p>
            )}

            {/* affichage du dernier compte créé */}
            {createdInfo && (
            <div
                style={{
                marginTop: "0.75rem",
                border: "1px solid #cfe8cf",
                background: "#f3fff3",
                padding: "0.75rem",
                borderRadius: "8px",
                }}
            >
                <div style={{ marginBottom: "0.25rem" }}>
                <strong>Compte créé</strong>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <span>
                    Email : <strong>{createdInfo.email}</strong>
                </span>
                <button
                    type="button"
                    className="secondary-button"
                    onClick={() => copyToClipboard(createdInfo.email)}
                >
                    Copier email
                </button>
                </div>

                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <span>
                    Mot de passe temporaire :{" "}
                    <strong>{createdInfo.temp_password}</strong>
                </span>
                <button
                    type="button"
                    className="secondary-button"
                    onClick={() => copyToClipboard(createdInfo.temp_password)}
                >
                    Copier mot de passe
                </button>
                </div>

                <div style={{ marginTop: "0.35rem", opacity: 0.8 }}>
                (Ce mot de passe ne sera plus visible après refresh.)
                </div>
            </div>
            )}
        </div>

        {loading && <p>Chargement…</p>}
        {error && !loading && <p style={{ color: "crimson" }}>Erreur : {error}</p>}

        {!loading && !error && (
            <div className="table-wrapper">
            <table>
                <thead>
                <tr>
                    <th>Email</th>
                    <th>Rôle</th>
                    <th>Actif</th>
                    <th>Créé le</th>
                    <th style={{ width: "260px" }}>Actions</th>
                </tr>
                </thead>

                <tbody>
                {sortedUsers.length === 0 && (
                    <tr>
                    <td colSpan={5} style={{ textAlign: "center" }}>
                        Aucun utilisateur.
                    </td>
                    </tr>
                )}

                {sortedUsers.map((u) => {
                    const id = u.id;
                    const isBusy = busyId === id;
                    const isActive = u.is_active ?? u.isActive ?? true;

                    return (
                    <tr key={id}>
                        <td>{u.email}</td>

                        <td>
                        <select
                            className="input"
                            value={u.role || "tech"}
                            disabled={isBusy}
                            onChange={(e) => patchUser(id, { role: e.target.value })}
                        >
                            {ROLES.map((r) => (
                            <option key={r.value} value={r.value}>
                                {r.label}
                            </option>
                            ))}
                        </select>
                        </td>

                        <td>{isActive ? "Oui" : "Non"}</td>

                        <td>
                        {u.created_at || u.createdAt
                            ? new Date(u.created_at || u.createdAt).toLocaleString()
                            : "-"}
                        </td>

                        <td style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <button
                            className="secondary-button"
                            disabled={isBusy}
                            onClick={() => patchUser(id, { is_active: !isActive })}
                        >
                            {isActive ? "Désactiver" : "Activer"}
                        </button>

                        {isBusy && <span style={{ opacity: 0.7 }}>...</span>}
                        </td>
                    </tr>
                    );
                })}
                </tbody>
            </table>
            </div>
        )}
        </>
    );
}
