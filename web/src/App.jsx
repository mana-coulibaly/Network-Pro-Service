// web/src/App.jsx
import { useState, useEffect } from "react";
import "./App.css";

// Auth
import Login from "./components/auth/Login.jsx";

// Pages
import { 
  PAGES,
  CurrentCallsPage,
  HistoryPage,
  NewTicketPage,
  ToolsPage,
  InventoryPage,
  TimesheetPage,
  WorkorderPage,
  ProfilePage,
  EmployeesPage,
  ManagerTickets,
  AdminUsers,
  AdminDashboard,
} from "./components/pages";
import ChangePassword from "./components/auth/ChangePassword.jsx";



// Identifiants de pages (importés depuis components/pages)

function App() {
  const [auth, setAuth] = useState({ user: null, token: null });
  const [activePage, setActivePage] = useState(() => {
    // Déterminer la page par défaut selon le rôle
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.role === "admin") {
          return PAGES.ADMIN_DASHBOARD;
        }
      } catch (e) {
        // Ignore
      }
    }
    return PAGES.CURRENT_CALLS;
  });
  const [inventaireOpen, setInventaireOpen] = useState(false);
  const [forcePwdChange, setForcePwdChange] = useState(false);


  // Restore auth depuis localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem("accessToken");
    const storedUser = localStorage.getItem("user");
    if (storedToken) {
      setAuth({
        token: storedToken,
        user: storedUser ? JSON.parse(storedUser) : null,
      });
    }
  }, []);

  // Login réussi
  function handleLoginSuccess(data) {
      const { access, user } = data;

      localStorage.setItem("accessToken", access);
      localStorage.setItem("user", JSON.stringify(user));
      setAuth({ token: access, user });

      // Définir la page par défaut selon le rôle
      if (user.role === "admin") {
        setActivePage(PAGES.ADMIN_DASHBOARD);
      } else {
        setActivePage(PAGES.CURRENT_CALLS);
      }

      // IMPORTANT: si l'utilisateur doit changer son mot de passe, on affiche direct
      if (user?.must_change_password) {
        setForcePwdChange(true);
        sessionStorage.setItem("forcePwdChange", "1"); // optionnel mais utile
      } else {
        setForcePwdChange(false);
        sessionStorage.removeItem("forcePwdChange");
      }
  }


  // Logout
  function handleLogout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    setAuth({ token: null, user: null });
  }

  // Choix de la page centrale
  function renderPage(role = null) {
    switch (activePage) {
      case PAGES.HISTORY:
        return <HistoryPage />;

      case PAGES.NEW_TICKET:
        return <NewTicketPage onTicketCreated={(ticket) => {
          // Rediriger vers "Appels en cours" après création
          setActivePage(PAGES.CURRENT_CALLS);
        }} />;

      case PAGES.TOOLS:
        return <ToolsPage />;

      case PAGES.INVENTORY:
        return <InventoryPage />;

      case PAGES.TIMESHEET:
        return <TimesheetPage />;

      case PAGES.WORKORDER:
        return <WorkorderPage />;

      case PAGES.INFO:
        return <ProfilePage />;

      case PAGES.MANAGER_TICKETS:
        return <ManagerTickets />;

      case PAGES.EMPLOYEES:
        return <EmployeesPage />;

      case PAGES.ADMIN_USERS:
        return <AdminUsers />;

      case PAGES.ADMIN_DASHBOARD:
        return <AdminDashboard />;

      case PAGES.CURRENT_CALLS:
      default:
        return <CurrentCallsPage />;
    }
  }

  // Pas de token → écran de login
  if (!auth.token) {
    return <Login onLogin={handleLoginSuccess} />;
  }

const forcePwd = forcePwdChange || sessionStorage.getItem("forcePwdChange") === "1";

if (auth.user?.must_change_password || forcePwd) {
  return (
    <ChangePassword
      user={auth.user}
      onLogout={handleLogout}
      onDone={(updatedUser) => {
        sessionStorage.removeItem("forcePwdChange");
        setForcePwdChange(false);
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setAuth((prev) => ({ ...prev, user: updatedUser }));
      }}
    />
  );
}

  // Infos utilisateur
  //const userEmail = auth.user?.email || "";
  const userRole = auth.user?.role || "";
  //const isAdmin = userRole === "admin";

  // Vue spéciale pour ADMIN - inclut toutes les fonctionnalités
  if (userRole === "admin") {
  return (
    <div className="dashboard-root">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">N</div>
          <span className="logo-text">NETWORK PRO</span>
        </div>

        <nav className="sidebar-nav">
          {/* Menus spécifiques Admin */}
          <div className="nav-group" style={{ marginBottom: "8px", paddingBottom: "8px", borderBottom: "1px solid var(--border-color)" }}>
            <button
              className={`nav-item ${activePage === PAGES.ADMIN_DASHBOARD ? 'nav-item-active' : ''}`}
              onClick={() => setActivePage(PAGES.ADMIN_DASHBOARD)}
            >
              <span className="nav-icon">📊</span>
              <span>Tableau de bord</span>
            </button>
            <button
              className={`nav-item ${activePage === PAGES.EMPLOYEES ? 'nav-item-active' : ''}`}
              onClick={() => setActivePage(PAGES.EMPLOYEES)}
            >
              <span className="nav-icon">👥</span>
              <span>Employés</span>
            </button>
            <button
              className={`nav-item ${activePage === PAGES.ADMIN_USERS ? 'nav-item-active' : ''}`}
              onClick={() => setActivePage(PAGES.ADMIN_USERS)}
            >
              <span className="nav-icon">👤</span>
              <span>Utilisateurs</span>
            </button>
          </div>

          {/* Menus technicien - accessibles à l'admin */}
          <button
            className={`nav-item ${activePage === PAGES.CURRENT_CALLS ? 'nav-item-active' : ''}`}
            onClick={() => setActivePage(PAGES.CURRENT_CALLS)}
          >
            <span className="nav-icon">📞</span>
            <span>Appels en cours</span>
          </button>

          <button
            className={`nav-item ${activePage === PAGES.HISTORY ? 'nav-item-active' : ''}`}
            onClick={() => setActivePage(PAGES.HISTORY)}
          >
            <span className="nav-icon">📜</span>
            <span>Appels historique</span>
          </button>

          <button
            className={`nav-item ${activePage === PAGES.MANAGER_TICKETS ? 'nav-item-active' : ''}`}
            onClick={() => setActivePage(PAGES.MANAGER_TICKETS)}
          >
            <span className="nav-icon">📊</span>
            <span>Tous les tickets</span>
          </button>

          <button
            className={`nav-item ${activePage === PAGES.NEW_TICKET ? 'nav-item-active' : ''}`}
            onClick={() => setActivePage(PAGES.NEW_TICKET)}
          >
            <span className="nav-icon">➕</span>
            <span>Créer un ticket</span>
          </button>

          <button
            className={`nav-item ${activePage === PAGES.TOOLS ? 'nav-item-active' : ''}`}
            onClick={() => setActivePage(PAGES.TOOLS)}
          >
            <span className="nav-icon">🛠</span>
            <span>Outils/Équipements</span>
          </button>

          <button
            className={`nav-item ${activePage === PAGES.INFO ? 'nav-item-active' : ''}`}
            onClick={() => setActivePage(PAGES.INFO)}
          >
            <span className="nav-icon">ℹ</span>
            <span>Profil</span>
          </button>

          <div className="nav-group">
            <button
              className={`nav-item nav-item-parent ${inventaireOpen ? 'nav-item-active' : ''}`}
              onClick={() => setInventaireOpen(!inventaireOpen)}
            >
              <span className="nav-icon">📦</span>
              <span>Inventaire</span>
              <span className={`nav-chevron ${inventaireOpen ? "open" : ""}`}>
                ▾
              </span>
            </button>
            {inventaireOpen && (
              <button
                className={`nav-item nav-item-child ${activePage === PAGES.INVENTORY ? 'nav-item-active' : ''}`}
                onClick={() => setActivePage(PAGES.INVENTORY)}
              >
                <span className="nav-icon">🛒</span>
                <span>Commande</span>
              </button>
            )}
          </div>

          <button
            className={`nav-item ${activePage === PAGES.TIMESHEET ? 'nav-item-active' : ''}`}
            onClick={() => setActivePage(PAGES.TIMESHEET)}
          >
            <span className="nav-icon">⏰</span>
            <span>Feuille de temps</span>
          </button>

          <button
            className={`nav-item ${activePage === PAGES.WORKORDER ? 'nav-item-active' : ''}`}
            onClick={() => setActivePage(PAGES.WORKORDER)}
          >
            <span className="nav-icon">📝</span>
            <span>Bon de travail vide</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-user">
            <div className="avatar" />
            <div>
              <div className="user-name">
                {[auth.user?.first_name, auth.user?.last_name]
                  .filter(Boolean)
                  .join(" ") || auth.user?.email}
              </div>
              <div className="user-role">admin</div>
            </div>
          </div>

          <div className="topbar-actions">
            <button className="icon-button">🔔</button>
            <button className="icon-button">⚙</button>
            <button className="language-switch">
              English <span className="chevron">▾</span>
            </button>
          </div>
        </header>

        <section className="table-card">{renderPage(userRole)}</section>
      </main>
    </div>
  );
}

  // Nom à partir de first_name / last_name, sinon on retombe sur l'email
  const userName =
    auth.user
      ? [auth.user.first_name, auth.user.last_name].filter(Boolean).join(" ") ||
        auth.user.email ||
        "Utilisateur connecté"
      : "Utilisateur connecté";



  return (
    <div className="dashboard-root">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark">N</div>
          <span className="logo-text">NETWORK PRO</span>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activePage === PAGES.CURRENT_CALLS ? 'nav-item-active' : ''}`}
            onClick={() => setActivePage(PAGES.CURRENT_CALLS)}
          >
            <span className="nav-icon">📞</span>
            <span>Appels en cours</span>
          </button>

          <button
            className={`nav-item ${activePage === PAGES.HISTORY ? 'nav-item-active' : ''}`}
            onClick={() => setActivePage(PAGES.HISTORY)}
          >
            <span className="nav-icon">📜</span>
            <span>Appels historique</span>
          </button>

          {/*  Menu supplémentaire uniquement pour les managers */}
          {userRole === "manager" && (
            <button
              className={`nav-item ${activePage === PAGES.MANAGER_TICKETS ? 'nav-item-active' : ''}`}
              onClick={() => setActivePage(PAGES.MANAGER_TICKETS)}
            >
              <span className="nav-icon">📊</span>
              <span>Tous les tickets</span>
            </button>
          )}

          <button
            className={`nav-item ${activePage === PAGES.NEW_TICKET ? 'nav-item-active' : ''}`}
            onClick={() => setActivePage(PAGES.NEW_TICKET)}
          >
            <span className="nav-icon">➕</span>
            <span>Créer un ticket</span>
          </button>

          <button
            className={`nav-item ${activePage === PAGES.TOOLS ? 'nav-item-active' : ''}`}
            onClick={() => setActivePage(PAGES.TOOLS)}
          >
            <span className="nav-icon">🛠</span>
            <span>Outils/Équipements</span>
          </button>

          <button
            className={`nav-item ${activePage === PAGES.INFO ? 'nav-item-active' : ''}`}
            onClick={() => setActivePage(PAGES.INFO)}
          >
            <span className="nav-icon">ℹ</span>
            <span>Profil</span>
          </button>

          <div className="nav-group">
            <button
              className={`nav-item nav-item-parent ${inventaireOpen ? 'nav-item-active' : ''}`}
              onClick={() => setInventaireOpen(!inventaireOpen)}
            >
              <span className="nav-icon">📦</span>
              <span>Inventaire</span>
              <span className={`nav-chevron ${inventaireOpen ? "open" : ""}`}>
                ▾
              </span>
            </button>
            {inventaireOpen && (
              <button
                className={`nav-item nav-item-child ${activePage === PAGES.INVENTORY ? 'nav-item-active' : ''}`}
                onClick={() => setActivePage(PAGES.INVENTORY)}
              >
                <span className="nav-icon">🛒</span>
                <span>Commande</span>
              </button>
            )}
          </div>

          <button
            className={`nav-item ${activePage === PAGES.TIMESHEET ? 'nav-item-active' : ''}`}
            onClick={() => setActivePage(PAGES.TIMESHEET)}
          >
            <span className="nav-icon">⏰</span>
            <span>Feuille de temps</span>
          </button>

          <button
            className={`nav-item ${activePage === PAGES.WORKORDER ? 'nav-item-active' : ''}`}
            onClick={() => setActivePage(PAGES.WORKORDER)}
          >
            <span className="nav-icon">📝</span>
            <span>Bon de travail vide</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="main">
        {/* Top bar */}
        <header className="topbar">
          <div className="topbar-user">
            <div className="avatar" />
            <div>
              <div className="user-name">{userName}</div>
              <div className="user-role">{userRole}</div>
            </div>
          </div>

          <div className="topbar-actions">
            <button className="icon-button">🔔</button>
            <button className="icon-button">⚙</button>
            <button className="language-switch">
              English <span className="chevron">▾</span>
            </button>
          </div>
        </header>
        
        {/* Zone de contenu : page active */}
        <section className="table-card">{renderPage(userRole)}</section>
      </main>
    </div>
  );
}

export default App;
