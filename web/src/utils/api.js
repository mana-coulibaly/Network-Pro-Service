// web/src/utils/api.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function api(path, { method = 'GET', body, token } = {}) {
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const hasBody = body !== undefined && body !== null;

    if (hasBody && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body:
        hasBody && !(body instanceof FormData)
            ? JSON.stringify(body)
            : hasBody
            ? body
            : undefined,
    });

    const text = await res.text();
    let data;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (!res.ok) {
        const msg = data?.error || res.statusText;
        throw new Error(msg);
    }

    return data;
}
