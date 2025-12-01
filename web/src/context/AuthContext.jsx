// web/src/context/AuthContext.jsx
import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    // Mode "sans connexion" : on simule un utilisateur déjà connecté
    const [token] = useState('dev-token');
    const [user] = useState({ email: 'dev@example.com', role: 'tech' });

    const value = {
        token,
        user,
        isAuthenticated: true,
        login: () => {},
        logout: () => {},
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    return useContext(AuthContext);
}
