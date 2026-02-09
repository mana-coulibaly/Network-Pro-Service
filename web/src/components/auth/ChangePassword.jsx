import { useState } from "react";
import { api, setAccessToken } from "../../utils/api";

export default function ChangePassword({ user, onLogout, onDone }) {
    const [newPassword, setNewPassword] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");

        if (!newPassword || newPassword.length < 8) {
        setError("Le nouveau mot de passe doit faire au moins 8 caractères.");
        return;
        }

        try {
        setSaving(true);

        const data = await api("/auth/change-password", {
            method: "POST",
            body: JSON.stringify({ new_password: newPassword }),
        });

        if (data?.access) setAccessToken(data.access);

        const nextUser = data?.user ?? { ...(user || {}), must_change_password: false };
        localStorage.setItem("user", JSON.stringify(nextUser));
        sessionStorage.removeItem("forcePwdChange");

        onDone?.(nextUser);
        } catch (e2) {
        setError(e2.message || "Erreur changement mot de passe");
        } finally {
        setSaving(false);
        }
    }

    return (
        <div className="login-root">
        <div className="login-card">
            <h2 style={{ marginBottom: "0.5rem" }}>Changement de mot de passe</h2>
            <p style={{ marginBottom: "1rem" }}>
            Vous devez changer votre mot de passe temporaire avant de continuer.
            </p>

            <form onSubmit={handleSubmit} className="login-form">
            <label>
                <span>Nouveau mot de passe</span>
                <input
                type="password"
                className="input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={saving}
                />
            </label>

            <button className="primary-button" type="submit" disabled={saving}>
                {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
            </form>

            {error && <p style={{ marginTop: "0.75rem", color: "crimson" }}>{error}</p>}

            <button
            className="secondary-button"
            style={{ marginTop: "0.75rem" }}
            onClick={onLogout}
            disabled={saving}
            >
            Déconnexion
            </button>
        </div>
        </div>
    );
}
