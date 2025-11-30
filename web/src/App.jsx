// web/src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './components/auth/LoginPage';
import TechApp from './components/tech/TechApp';
import WebPortal from './components/portal/WebPortal';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/tech"
        element={
          <ProtectedRoute>
            <TechApp />
          </ProtectedRoute>
        }
      />

      <Route
        path="/portal"
        element={
          <ProtectedRoute>
            <WebPortal />
          </ProtectedRoute>
        }
      />


      {/* redirections */}
      <Route path="/" element={<Navigate to="/tech" replace />} />
      <Route path="*" element={<Navigate to="/tech" replace />} />
    </Routes>
  );
}
