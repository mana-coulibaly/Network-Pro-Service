// web/src/components/auth/Login.jsx
import { useState, useEffect } from "react";   // ← ajoute useEffect ici
import { API_URL } from "../../utils/api.js";

export default function Login({ onLogin }) {
    const [email, setEmail] = useState("mistertest@example.com");
    const [password, setPassword] = useState("secret123");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Récupérer un éventuel message "session expirée"
    useEffect(() => {
        const authError = sessionStorage.getItem("authError");
        if (authError) {
        setError(authError);
        sessionStorage.removeItem("authError");
        }
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data?.error || res.statusText || "Login failed");
        }

        // data.access = token, data.user = user
        onLogin(data);
        } catch (e) {
        console.error(e);
        setError(e.message || "Erreur de connexion");
        } finally {
        setLoading(false);
        }
    }

    return (
        <div className="login-root">
        <div className="login-card">
            <h1 className="logo-text" style={{ marginBottom: "1rem" }}>
            NETWORK PRO
            </h1>
            <h2 style={{ marginBottom: "1rem" }}>Connexion</h2>

            <form onSubmit={handleSubmit} className="login-form">
            <label>
                <span>Email</span>
                <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                required
                />
            </label>

            <label>
                <span>Mot de passe</span>
                <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                />
            </label>

            <button
                type="submit"
                className="primary-button"
                disabled={loading}
                style={{ marginTop: "0.75rem" }}
            >
                {loading ? "Connexion..." : "Se connecter"}
            </button>
            </form>

            {error && (
            <p style={{ marginTop: "0.75rem", color: "crimson" }}>{error}</p>
            )}
        </div>
        </div>
    );
}
