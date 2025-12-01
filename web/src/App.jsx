// web/src/App.jsx
// Page unique type dashboard inspirée de la maquette fournie
import { useState } from 'react';
import './App.css';

export default function App() {
  const [inventaireOpen, setInventaireOpen] = useState(false);

  return (
    <div className="dashboard-root">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-mark" />
          <span className="logo-text">SPINETOR</span>
        </div>

        <nav className="sidebar-nav">
          <button className="nav-item">
            <span className="nav-icon">📞</span>
            <span>Appels en cours</span>
          </button>
          <button className="nav-item">
            <span className="nav-icon">📜</span>
            <span>Appels historique</span>
          </button>
          <button className="nav-item">
            <span className="nav-icon">📅</span>
            <span>Calendrier</span>
          </button>
          <button className="nav-item">
            <span className="nav-icon">📄</span>
            <span>Document manquants</span>
          </button>
          <div className="nav-group">
            <button 
              className="nav-item nav-item-parent" 
              onClick={() => setInventaireOpen(!inventaireOpen)}
            >
              <span className="nav-icon">📦</span>
              <span>Inventaire</span>
              <span className={`nav-chevron ${inventaireOpen ? 'open' : ''}`}>▾</span>
            </button>
            {inventaireOpen && (
              <button className="nav-item nav-item-child">
                <span className="nav-icon">🛒</span>
                <span>Commande</span>
              </button>
            )}
          </div>
          <button className="nav-item">
            <span className="nav-icon">⏰</span>
            <span>Feuille de temps</span>
          </button>
          <button className="nav-item">
            <span className="nav-icon">📝</span>
            <span>Bon de travail vide</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item">
            <span className="nav-icon">❓</span>
            <span>Aide</span>
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
              <div className="user-name">Jenny Wilson</div>
              <div className="user-role">Professional photographer</div>
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

        {/* Cartes résumé */}
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

        {/* Tableau */}
        <section className="table-card">
          <div className="table-header">
            <h2>My Applications</h2>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Event</th>
                  <th>Sales</th>
                  <th>Commission</th>
                  <th>Payout Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { id: 1, event: 'Book Launch', sales: 23, commission: '$129', status: 'Pending' },
                  { id: 2, event: 'Wedding Gala', sales: 42, commission: '$242', status: 'Paid' },
                  { id: 3, event: 'Wedding Gala', sales: 37, commission: '$127', status: 'Pending' },
                  { id: 4, event: 'Book Launch', sales: 39, commission: '$63', status: 'Paid' },
                  { id: 5, event: 'Wedding Gala', sales: 14, commission: '$58', status: 'Pending' },
                  { id: 6, event: 'Wedding Gala', sales: 74, commission: '$283', status: 'Paid' },
                  { id: 7, event: 'Book Launch', sales: 37, commission: '$58', status: 'Pending' },
                  { id: 8, event: 'Wedding Gala', sales: 52, commission: '$260', status: 'Paid' },
                  { id: 9, event: 'Book Launch', sales: 37, commission: '$63', status: 'Pending' },
                  { id: 10, event: 'Wedding Gala', sales: 14, commission: '$58', status: 'Paid' },
                ].map((row) => (
                  <tr key={row.id}>
                    <td>{row.id}</td>
                    <td>{row.event}</td>
                    <td>{row.sales}</td>
                    <td>{row.commission}</td>
                    <td>
                      <span
                        className={
                          row.status === 'Paid'
                            ? 'status-pill status-paid'
                            : 'status-pill status-pending'
                        }
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
