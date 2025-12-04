// web/src/utils/api.js

export const API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:3000";

// Petit helper générique pour appeler l'API avec le token
export async function api(path, options = {}) {
    const token = localStorage.getItem("accessToken");

    const headers = { ...(options.headers || {}) };

    // Auth header si token présent
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    // Content-Type JSON si body non-FormData
    if (options.body && !(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    const res = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
    });

    const text = await res.text();
    let data;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    // Gestion des erreurs
    if (!res.ok) {
        // 👉 Token expiré / invalide
        if (res.status === 401) {
        console.warn("Token invalide ou expiré, déconnexion…");

        // Nettoyage localStorage
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");

        // (optionnel) garder un message pour la prochaine fois:
        // sessionStorage.setItem("authError", data?.error || "Session expirée");

        // Reload → App.jsx ne trouve plus de token → Login
        window.location.reload();
        return;
        }

        const msg = data?.error || res.statusText || "API error";
        throw new Error(msg);
    }

    return data;
}
