// web/src/App.jsx
import { useState, useEffect } from "react";
import "./App.css";

// Auth
import Login from "./components/auth/Login.jsx";

// Pages
import CurrentCallsPage from "./components/pages/CurrentCallsPage.jsx";
import HistoryPage from "./components/pages/HistoryPage.jsx";
import NewTicketPage from "./components/pages/NewTicket.jsx";
import ToolsPage from "./components/pages/Tools.jsx";
import InventoryPage from "./components/pages/Inventory.jsx";
import TimesheetPage from "./components/pages/Timesheet.jsx";
import WorkorderPage from "./components/pages/Workorder.jsx";
import InfoPage from "./components/pages/InfoPage.jsx";
import ManagerTickets from "./components/pages/ManagerTickets.jsx";


// Identifiants de pages
const PAGES = {
  CURRENT_CALLS: "current_calls",
  HISTORY: "history",
  NEW_TICKET: "new_ticket",
  TOOLS: "tools",
  INVENTORY: "inventory",
  TIMESHEET: "timesheet",
  WORKORDER: "workorder",
  INFO: "info",
  MANAGER_TICKETS: "manager_tickets",
};

function App() {
  const [auth, setAuth] = useState({ user: null, token: null });
  const [activePage, setActivePage] = useState(PAGES.CURRENT_CALLS);
  const [inventaireOpen, setInventaireOpen] = useState(false);

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
  }

  // Logout
  function handleLogout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    setAuth({ token: null, user: null });
  }

  // Choix de la page centrale
  function renderPage() {
    switch (activePage) {
      case PAGES.HISTORY:
        return <HistoryPage />;

      case PAGES.NEW_TICKET:
        return <NewTicketPage />;

      case PAGES.TOOLS:
        return <ToolsPage />;

      case PAGES.INVENTORY:
        return <InventoryPage />;

      case PAGES.TIMESHEET:
        return <TimesheetPage />;

      case PAGES.WORKORDER:
        return <WorkorderPage />;

      case PAGES.INFO:
        return <InfoPage />;

      case PAGES.MANAGER_TICKETS:
        return <ManagerTickets />;

      case PAGES.CURRENT_CALLS:
      default:
        return <CurrentCallsPage />;
    }
  }

  // Pas de token → écran de login
  if (!auth.token) {
    return <Login onLogin={handleLoginSuccess} />;
  }

  // Infos utilisateur
  //const userEmail = auth.user?.email || "";
  const userRole = auth.user?.role || "";

  // Vue spéciale pour ADMIN
  if (userRole === "admin") {
    return (
      <div className="dashboard-root">
        <main className="main">
          <header className="topbar">
            <div className="topbar-user">
              <div className="avatar" />
              <div>
                <div className="user-name">
                  {[auth.user.first_name, auth.user.last_name]
                    .filter(Boolean)
                    .join(" ") || auth.user.email}
                </div>
                <div className="user-role">admin</div>
              </div>
            </div>

            <div className="topbar-actions">
              <button className="icon-button" onClick={handleLogout}>
                🚪
              </button>
            </div>
          </header>

          <section className="table-card" style={{ padding: "1.5rem" }}>
            <h2>Espace administrateur</h2>
            <p>
              Le compte connecté a le rôle <strong>admin</strong>. <br />
              Ici on branchera la gestion des utilisateurs, profils des techs,
              etc. via les endpoints <code>/admin/...</code> et{" "}
              <code>/manager/...</code>.
            </p>
          </section>
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
          <div className="logo-mark" />
          <span className="logo-text">NETWORK PRO</span>
        </div>

        <nav className="sidebar-nav">
          <button
            className="nav-item"
            onClick={() => setActivePage(PAGES.CURRENT_CALLS)}
          >
            <span className="nav-icon">📞</span>
            <span>Appels en cours</span>
          </button>

          <button
            className="nav-item"
            onClick={() => setActivePage(PAGES.HISTORY)}
          >
            <span className="nav-icon">📜</span>
            <span>Appels historique</span>
          </button>

                    {/*  Menu supplémentaire uniquement pour les managers */}
          {userRole === "manager" && (
            <button
              className="nav-item"
              onClick={() => setActivePage(PAGES.MANAGER_TICKETS)}
            >
              <span className="nav-icon">📊</span>
              <span>Tous les tickets</span>
            </button>
          )}

          <button
            className="nav-item"
            onClick={() => setActivePage(PAGES.NEW_TICKET)}
          >
            <span className="nav-icon">➕</span>
            <span>Créer un ticket</span>
          </button>

          <button
            className="nav-item"
            onClick={() => setActivePage(PAGES.TOOLS)}
          >
            <span className="nav-icon">🛠</span>
            <span>Outils/Équipements</span>
          </button>

          <button
            className="nav-item"
            onClick={() => setActivePage(PAGES.INFO)}
          >
            <span className="nav-icon">ℹ</span>
            <span>Profil</span>
          </button>

          <div className="nav-group">
            <button
              className="nav-item nav-item-parent"
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
                className="nav-item nav-item-child"
                onClick={() => setActivePage(PAGES.INVENTORY)}
              >
                <span className="nav-icon">🛒</span>
                <span>Commande</span>
              </button>
            )}
          </div>

          <button
            className="nav-item"
            onClick={() => setActivePage(PAGES.TIMESHEET)}
          >
            <span className="nav-icon">⏰</span>
            <span>Feuille de temps</span>
          </button>

          <button
            className="nav-item"
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

        {/* Cartes résumé (statiques pour l’instant) */}
        <section className="summary-cards">
          <div className="card">
            <div className="card-title">Total Earnings</div>
            <div className="card-value">$765K</div>
            <div className="card-sub">This month</div>
          </div>
          <div className="card">
            <div className="card-title">Total Photos Sold</div>
            <div className="card-value">1.3K</div>
            <div className="card-sub">From last month</div>
          </div>
          <div className="card">
            <div className="card-title">Pending Payout</div>
            <div className="card-value">$182</div>
            <div className="card-sub">From last month</div>
          </div>
          <div className="card">
            <div className="card-title">Paid Out</div>
            <div className="card-value">$300</div>
            <div className="card-sub">From last event</div>
          </div>
        </section>

        {/* Zone de contenu : page active */}
        <section className="table-card">{renderPage(userRole)}</section>
      </main>
    </div>
  );
}

export default App;
