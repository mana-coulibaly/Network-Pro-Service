// web/src/utils/api.js

export const API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:3000";

// token en mémoire + synchronisé avec localStorage
let accessToken = localStorage.getItem("accessToken") || null;

export function setAccessToken(token) {
    accessToken = token || null;
    if (token) {
        localStorage.setItem("accessToken", token);
    } else {
        localStorage.removeItem("accessToken");
    }
}

export function clearSession() {
    setAccessToken(null);
    localStorage.removeItem("user");
    }

    /**
     * Appelle /auth/refresh pour obtenir un nouveau access token
     */
    async function refreshAccessToken() {
    const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include", // important pour envoyer le cookie refresh
    });

    const text = await res.text();
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = null;
    }

    if (!res.ok) {
        clearSession();
        const msg = data?.error || "Session expirée, veuillez vous reconnecter.";
        // servira à afficher un message sur l'écran de login
        sessionStorage.setItem("authError", msg);
        throw new Error(msg);
    }

    if (data?.access) {
        setAccessToken(data.access);
    }
    if (data?.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
    }

    return data;
    }

    /**
     * Wrapper générique pour appeler l'API avec gestion auto du refresh
     */
    export async function api(path, options = {}) {
    const url = `${API_URL}${path}`;

    const headers = { ...(options.headers || {}) };

    if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
    }

    // Content-Type JSON si body non-FormData
    if (options.body && !(options.body instanceof FormData)) {
        headers["Content-Type"] = headers["Content-Type"] || "application/json";
    }

    let res = await fetch(url, {
        ...options,
        headers,
        credentials: "include", // pour envoyer le cookie refresh
    });

    let text = await res.text();
    let data;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    // Si token expiré / invalide : on tente un refresh une fois
    if (res.status === 401) {
        try {
        await refreshAccessToken();

        const retryHeaders = { ...(options.headers || {}) };
        if (accessToken) {
            retryHeaders.Authorization = `Bearer ${accessToken}`;
        }
        if (options.body && !(options.body instanceof FormData)) {
            retryHeaders["Content-Type"] =
            retryHeaders["Content-Type"] || "application/json";
        }

        res = await fetch(url, {
            ...options,
            headers: retryHeaders,
            credentials: "include",
        });

        text = await res.text();
        try {
            data = text ? JSON.parse(text) : null;
        } catch {
            data = text;
        }
        } catch (e) {
        // refresh impossible → on renvoie l'erreur
        throw e;
        }
    }

    if (!res.ok) {
        const msg = data?.error || res.statusText || "API error";
        throw new Error(msg);
    }

    return data;
}
