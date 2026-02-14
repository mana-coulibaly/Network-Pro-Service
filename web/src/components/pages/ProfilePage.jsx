// web/src/components/pages/ProfilePage.jsx
import { useEffect, useState } from "react";
import { api } from "../../utils/api.js";

export default function ProfilePage() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState("");

    // Champs éditables
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");

    // Champs pour le changement de mot de passe
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [passwordSuccess, setPasswordSuccess] = useState("");
    const [changingPassword, setChangingPassword] = useState(false);

    useEffect(() => {
        loadProfile();
    }, []);

    async function loadProfile() {
        try {
            setLoading(true);
            setError("");
            const data = await api("/auth/me");
            setProfile(data);
            setFirstName(data.first_name || "");
            setLastName(data.last_name || "");
        } catch (e) {
            console.error(e);
            setError(e.message || "Erreur lors du chargement du profil");
        } finally {
            setLoading(false);
        }
    }

    async function handleSaveProfile(e) {
        e.preventDefault();
        setError("");
        setSuccess("");

        try {
            setSaving(true);
            const updated = await api("/auth/me", {
                method: "PATCH",
                body: JSON.stringify({
                    first_name: firstName.trim() || null,
                    last_name: lastName.trim() || null,
                }),
            });
            setProfile(updated);
            setSuccess("Profil mis à jour avec succès");
            
            // Mettre à jour le localStorage
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
                const user = JSON.parse(storedUser);
                user.first_name = updated.first_name;
                user.last_name = updated.last_name;
                localStorage.setItem("user", JSON.stringify(user));
            }
        } catch (e) {
            console.error(e);
            setError(e.message || "Erreur lors de la mise à jour du profil");
        } finally {
            setSaving(false);
        }
    }

    async function handleChangePassword(e) {
        e.preventDefault();
        setPasswordError("");
        setPasswordSuccess("");

        // Validation
        if (!newPassword || newPassword.length < 8) {
            setPasswordError("Le nouveau mot de passe doit contenir au moins 8 caractères");
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError("Les mots de passe ne correspondent pas");
            return;
        }

        // Si l'utilisateur n'est pas en mode "must_change_password", on exige le mot de passe actuel
        if (!profile.must_change_password && !currentPassword) {
            setPasswordError("Veuillez saisir votre mot de passe actuel");
            return;
        }

        try {
            setChangingPassword(true);
            const response = await api("/auth/change-password", {
                method: "POST",
                body: JSON.stringify({
                    current_password: currentPassword || undefined,
                    new_password: newPassword,
                }),
            });

            setPasswordSuccess("Mot de passe modifié avec succès");
            
            // Réinitialiser les champs
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");

            // Recharger le profil pour mettre à jour les informations
            await loadProfile();

            // Mettre à jour le localStorage si nécessaire
            if (response.user) {
                localStorage.setItem("user", JSON.stringify(response.user));
            }
        } catch (e) {
            console.error(e);
            setPasswordError(e.message || "Erreur lors du changement de mot de passe");
        } finally {
            setChangingPassword(false);
        }
    }

    if (loading) {
        return (
            <div className="table-card">
                <div className="table-header">
                    <h2>Profil</h2>
                </div>
                <div className="table-wrapper">
                    <p>Chargement...</p>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="table-card">
                <div className="table-header">
                    <h2>Profil</h2>
                </div>
                <div className="table-wrapper">
                    <p style={{ color: "crimson" }}>Erreur : {error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="table-card">
            <div className="table-header">
                <h2>Mon profil</h2>
            </div>
            <div className="table-wrapper">
                <div className="profile-container">
                    {/* Section Informations personnelles */}
                    <div className="profile-section">
                        <h3>Informations personnelles</h3>
                        <form onSubmit={handleSaveProfile} className="profile-form">
                            <div className="profile-form-grid">
                                <div className="form-field-group">
                                    <label htmlFor="email" className="form-label">
                                        Email
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        className="input input-professional"
                                        value={profile.email || ""}
                                        disabled
                                        style={{ backgroundColor: "var(--bg-gray)", cursor: "not-allowed" }}
                                    />
                                    <span className="field-hint">L'email ne peut pas être modifié</span>
                                </div>

                                <div className="form-field-group">
                                    <label htmlFor="role" className="form-label">
                                        Rôle
                                    </label>
                                    <input
                                        id="role"
                                        type="text"
                                        className="input input-professional"
                                        value={profile.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : ""}
                                        disabled
                                        style={{ backgroundColor: "var(--bg-gray)", cursor: "not-allowed" }}
                                    />
                                </div>

                                <div className="form-field-group">
                                    <label htmlFor="first-name" className="form-label">
                                        Prénom
                                    </label>
                                    <input
                                        id="first-name"
                                        type="text"
                                        className="input input-professional"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder="Votre prénom"
                                    />
                                </div>

                                <div className="form-field-group">
                                    <label htmlFor="last-name" className="form-label">
                                        Nom
                                    </label>
                                    <input
                                        id="last-name"
                                        type="text"
                                        className="input input-professional"
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder="Votre nom"
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="form-message error" style={{ marginTop: "16px" }}>
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="form-message success" style={{ marginTop: "16px" }}>
                                    {success}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="primary-button"
                                disabled={saving}
                                style={{ marginTop: "24px" }}
                            >
                                {saving ? "Enregistrement..." : "Enregistrer les modifications"}
                            </button>
                        </form>
                    </div>

                    {/* Section Changement de mot de passe */}
                    <div className="profile-section">
                        <h3>Changer le mot de passe</h3>
                        <form onSubmit={handleChangePassword} className="profile-form">
                            {!profile.must_change_password && (
                                <div className="form-field-group">
                                    <label htmlFor="current-password" className="form-label">
                                        Mot de passe actuel <span className="required">*</span>
                                    </label>
                                    <input
                                        id="current-password"
                                        type="password"
                                        className="input input-professional"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="Saisissez votre mot de passe actuel"
                                        required={!profile.must_change_password}
                                    />
                                </div>
                            )}

                            <div className="form-field-group">
                                <label htmlFor="new-password" className="form-label">
                                    Nouveau mot de passe <span className="required">*</span>
                                </label>
                                <input
                                    id="new-password"
                                    type="password"
                                    className="input input-professional"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Minimum 8 caractères"
                                    required
                                    minLength={8}
                                />
                                <span className="field-hint">Le mot de passe doit contenir au moins 8 caractères</span>
                            </div>

                            <div className="form-field-group">
                                <label htmlFor="confirm-password" className="form-label">
                                    Confirmer le nouveau mot de passe <span className="required">*</span>
                                </label>
                                <input
                                    id="confirm-password"
                                    type="password"
                                    className="input input-professional"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Répétez le nouveau mot de passe"
                                    required
                                    minLength={8}
                                />
                            </div>

                            {passwordError && (
                                <div className="form-message error" style={{ marginTop: "16px" }}>
                                    {passwordError}
                                </div>
                            )}

                            {passwordSuccess && (
                                <div className="form-message success" style={{ marginTop: "16px" }}>
                                    {passwordSuccess}
                                </div>
                            )}

                            <button
                                type="submit"
                                className="primary-button"
                                disabled={changingPassword}
                                style={{ marginTop: "24px" }}
                            >
                                {changingPassword ? "Modification..." : "Changer le mot de passe"}
                            </button>
                        </form>
                    </div>

                    {/* Section Informations du compte */}
                    <div className="profile-section">
                        <h3>Informations du compte</h3>
                        <div className="profile-info-grid">
                            <div className="info-item">
                                <span className="info-label">Date de création</span>
                                <span className="info-value">
                                    {profile.created_at
                                        ? new Date(profile.created_at).toLocaleDateString("fr-FR", {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                        })
                                        : "-"}
                                </span>
                            </div>

                            <div className="info-item">
                                <span className="info-label">Dernière modification du mot de passe</span>
                                <span className="info-value">
                                    {profile.password_changed_at
                                        ? new Date(profile.password_changed_at).toLocaleDateString("fr-FR", {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                        })
                                        : "Jamais"}
                                </span>
                            </div>

                            <div className="info-item">
                                <span className="info-label">Statut du compte</span>
                                <span className={`status-badge ${profile.is_active ? "active" : "inactive"}`}>
                                    {profile.is_active ? "Actif" : "Inactif"}
                                </span>
                            </div>

                            {profile.must_change_password && (
                                <div className="info-item warning">
                                    <span className="info-label">⚠️ Action requise</span>
                                    <span className="info-value">
                                        Vous devez changer votre mot de passe
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
