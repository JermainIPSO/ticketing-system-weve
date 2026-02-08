import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import './styles.css';
import {
  api,
  clearToken,
  clearUser,
  getStoredToken,
  getStoredUser,
  setAuthToken,
  storeToken,
  storeUser
} from './api';
import type { Ticket, TicketPriority, TicketStatus, User } from './types';

const priorities: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH'];
const statuses: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'CLOSED'];

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : '-';

const emptyForm = {
  title: '',
  description: '',
  priority: 'MEDIUM' as TicketPriority
};

const priorityRank: Record<TicketPriority, number> = {
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1
};

const statusClass = (status: TicketStatus) => status.toLowerCase().replace('_', '-');
const priorityClass = (priority: TicketPriority) => priority.toLowerCase();
const toErrorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

function App() {
  const [user, setUser] = useState<User | null>(getStoredUser());
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [busyTicketIds, setBusyTicketIds] = useState<Record<string, boolean>>({});
  const [assignDrafts, setAssignDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TicketStatus>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | TicketPriority>('ALL');
  const [sortBy, setSortBy] = useState<'updated' | 'created' | 'priority'>('updated');

  const isAdmin = user?.role === 'admin';

  const setTicketBusy = (ticketId: string, busy: boolean) => {
    setBusyTicketIds((prev) => {
      if (busy) {
        return { ...prev, [ticketId]: true };
      }
      const next = { ...prev };
      delete next[ticketId];
      return next;
    });
  };

  const isTicketBusy = (ticketId: string) => Boolean(busyTicketIds[ticketId]);

  const upsertTicket = (updated: Ticket) => {
    setTickets((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    setAssignDrafts((prev) => ({
      ...prev,
      [updated.id]: updated.assignedTo ?? ''
    }));
  };

  const loadTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTickets();
      setTickets(data);
      setAssignDrafts((prev) => {
        const next: Record<string, string> = {};
        for (const ticket of data) {
          next[ticket.id] = prev[ticket.id] ?? ticket.assignedTo ?? '';
        }
        return next;
      });
    } catch (err) {
      setError(toErrorMessage(err, 'Failed to load tickets.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setAuthToken(token);
    if (token) {
      void loadTickets();
    }
  }, [token, loadTickets]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const response = await api.login(loginForm.username, loginForm.password);
      setAuthToken(response.token);
      storeToken(response.token);
      storeUser(response.user);
      setToken(response.token);
      setUser(response.user);
      setLoginForm({ username: '', password: '' });
    } catch (err) {
      setLoginError(toErrorMessage(err, 'Login failed.'));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    clearToken();
    clearUser();
    setToken(null);
    setUser(null);
    setTickets([]);
    setAssignDrafts({});
    setBusyTicketIds({});
  };

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      const ticket = await api.createTicket(createForm);
      setTickets((prev) => [ticket, ...prev]);
      setAssignDrafts((prev) => ({ ...prev, [ticket.id]: ticket.assignedTo ?? '' }));
      setCreateForm(emptyForm);
    } catch (err) {
      setError(toErrorMessage(err, 'Unable to create ticket.'));
    }
  };

  const startEdit = (ticket: Ticket) => {
    setEditingId(ticket.id);
    setEditForm({
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(emptyForm);
  };

  const saveEdit = async (ticketId: string) => {
    setError(null);
    setTicketBusy(ticketId, true);
    try {
      const updated = await api.updateTicket(ticketId, editForm);
      upsertTicket(updated);
      cancelEdit();
      await loadTickets();
    } catch (err) {
      setError(toErrorMessage(err, 'Unable to update ticket.'));
    } finally {
      setTicketBusy(ticketId, false);
    }
  };

  const closeTicket = async (ticketId: string) => {
    setError(null);
    setTicketBusy(ticketId, true);
    try {
      const updated = await api.closeTicket(ticketId);
      upsertTicket(updated);
      await loadTickets();
    } catch (err) {
      setError(toErrorMessage(err, 'Unable to close ticket.'));
    } finally {
      setTicketBusy(ticketId, false);
    }
  };

  const assignTicket = async (ticketId: string, assignedTo: string) => {
    const normalized = assignedTo.trim();
    if (normalized.length < 2) {
      setError('Zuweisung muss mindestens 2 Zeichen haben.');
      return;
    }

    setError(null);
    setTicketBusy(ticketId, true);
    try {
      const updated = await api.assignTicket(ticketId, normalized);
      upsertTicket(updated);
      await loadTickets();
    } catch (err) {
      setError(toErrorMessage(err, 'Unable to assign ticket.'));
    } finally {
      setTicketBusy(ticketId, false);
    }
  };

  const updateStatus = async (ticketId: string, status: TicketStatus) => {
    setError(null);
    setTicketBusy(ticketId, true);
    try {
      const updated = await api.updateStatus(ticketId, status);
      upsertTicket(updated);
      await loadTickets();
    } catch (err) {
      setError(toErrorMessage(err, 'Unable to update status.'));
    } finally {
      setTicketBusy(ticketId, false);
    }
  };

  const takeTicket = async (ticketId: string) => {
    if (!user) return;

    const assignedTo = user.username;
    setAssignDrafts((prev) => ({ ...prev, [ticketId]: assignedTo }));
    setError(null);
    setTicketBusy(ticketId, true);
    try {
      await api.assignTicket(ticketId, assignedTo);
      const updated = await api.updateStatus(ticketId, 'IN_PROGRESS');
      upsertTicket(updated);
      await loadTickets();
    } catch (err) {
      setError(toErrorMessage(err, 'Unable to take ticket.'));
    } finally {
      setTicketBusy(ticketId, false);
    }
  };

  const summary = useMemo(() => {
    const total = tickets.length;
    const open = tickets.filter((t) => t.status === 'OPEN').length;
    const progress = tickets.filter((t) => t.status === 'IN_PROGRESS').length;
    const closed = tickets.filter((t) => t.status === 'CLOSED').length;
    return { total, open, progress, closed };
  }, [tickets]);

  const backlog = summary.open + summary.progress;
  const closedRate = summary.total ? Math.round((summary.closed / summary.total) * 100) : 0;

  const visibleTickets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    let data = tickets.filter((ticket) => {
      if (statusFilter !== 'ALL' && ticket.status !== statusFilter) return false;
      if (priorityFilter !== 'ALL' && ticket.priority !== priorityFilter) return false;
      if (!normalizedQuery) return true;
      return (
        ticket.title.toLowerCase().includes(normalizedQuery) ||
        ticket.description.toLowerCase().includes(normalizedQuery) ||
        ticket.createdBy.toLowerCase().includes(normalizedQuery) ||
        (ticket.assignedTo ?? '').toLowerCase().includes(normalizedQuery)
      );
    });

    data = [...data].sort((a, b) => {
      if (sortBy === 'priority') {
        return priorityRank[b.priority] - priorityRank[a.priority];
      }
      if (sortBy === 'created') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return data;
  }, [tickets, query, statusFilter, priorityFilter, sortBy]);

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Support Suite</p>
          <h1>Ticketing-System mit Premium-Feeling und klarer Prozesslogik.</h1>
          <p className="subtitle">
            Schlanke SPA, sichere API, sofortige Übersicht. Entwickelt für schnelle
            Support-Reaktionen und auditierbare Workflows.
          </p>
          {user && (
            <div className="hero-actions">
              <button className="btn ghost" onClick={loadTickets}>
                Daten aktualisieren
              </button>
              <button className="btn ghost" onClick={handleLogout}>
                Logout
              </button>
            </div>
          )}
        </div>
        <div className="hero-panel">
          <div className="stat-card">
            <span>Tickets total</span>
            <strong>{summary.total}</strong>
            <small>{backlog} im Backlog</small>
          </div>
          <div className="stat-card highlight">
            <span>Closed Rate</span>
            <strong>{closedRate}%</strong>
            <small>Qualitätsindikator</small>
          </div>
          <div className="stat-card">
            <span>In Arbeit</span>
            <strong>{summary.progress}</strong>
            <small>Aktive Fälle</small>
          </div>
        </div>
        {user && (
          <div className="profile">
            <div>
              <strong>{user.username}</strong>
              <span>{user.role === 'admin' ? 'Admin' : 'User'}</span>
            </div>
          </div>
        )}
      </header>

      {!user ? (
        <main className="login-grid">
          <section className="card hero-card">
            <h2>Support, der Eindruck macht.</h2>
            <p>
              Rollenbasierte Prozesse, schnelle Übersicht und eine UI, die Vertrauen
              schafft.
            </p>
            <div className="feature-list">
              <div>
                <strong>Live-Status</strong>
                <span>Offen, In Arbeit, Closed – immer sichtbar.</span>
              </div>
              <div>
                <strong>Admin-Steuerung</strong>
                <span>Zuweisung & Statuswechsel mit einem Klick.</span>
              </div>
              <div>
                <strong>Sicherer Stack</strong>
                <span>JWT, Rate Limits und Input-Validation.</span>
              </div>
            </div>
            <div className="chips">
              <span>React SPA</span>
              <span>Express API</span>
              <span>Prisma DB</span>
            </div>
          </section>
          <section className="card">
            <h2>Login</h2>
            <p>Nutze die Demo-Accounts für die Prüfung.</p>
            <form className="form" onSubmit={handleLogin}>
              <label>
                Benutzername
                <input
                  type="text"
                  value={loginForm.username}
                  onChange={(event) =>
                    setLoginForm((prev) => ({
                      ...prev,
                      username: event.target.value
                    }))
                  }
                  required
                />
              </label>
              <label>
                Passwort
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((prev) => ({
                      ...prev,
                      password: event.target.value
                    }))
                  }
                  required
                />
              </label>
              {loginError && <p className="error">{loginError}</p>}
              <button className="btn" type="submit" disabled={loginLoading}>
                {loginLoading ? 'Login läuft…' : 'Einloggen'}
              </button>
            </form>
            <div className="demo-accounts">
              <div>
                <strong>User</strong>
                <span>user / user123</span>
              </div>
              <div>
                <strong>Admin</strong>
                <span>admin / admin123</span>
              </div>
            </div>
          </section>
        </main>
      ) : (
        <main className="dashboard">
          <aside className="side">
            <section className="card">
              <h2>Neues Ticket</h2>
              <form className="form" onSubmit={handleCreate}>
                <label>
                  Titel
                  <input
                    type="text"
                    value={createForm.title}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        title: event.target.value
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  Beschreibung
                  <textarea
                    rows={4}
                    value={createForm.description}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        description: event.target.value
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  Priorität
                  <select
                    value={createForm.priority}
                    onChange={(event) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        priority: event.target.value as TicketPriority
                      }))
                    }
                  >
                    {priorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="btn" type="submit">
                  Ticket erstellen
                </button>
              </form>
            </section>

            <section className="card insight">
              <h3>Service-Insights</h3>
              <p>
                Backlog: <strong>{backlog}</strong> · Closed Rate:{' '}
                <strong>{closedRate}%</strong>
              </p>
              <p className="muted">
                Die Kennzahlen sind live aus den Tickets berechnet und zeigen den
                Bearbeitungsstand.
              </p>
            </section>
          </aside>

          <section className="content">
            <div className="panel-header">
              <div>
                <h2>Ticket-Übersicht</h2>
                <p className="muted">
                  {visibleTickets.length} von {summary.total} Tickets sichtbar
                </p>
              </div>
              <button className="btn ghost" onClick={loadTickets}>
                Refresh
              </button>
            </div>

            <div className="filters">
              <input
                type="search"
                placeholder="Suche nach Titel, Text oder Zuweisung"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as 'ALL' | TicketStatus)
                }
              >
                <option value="ALL">Alle Status</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <select
                value={priorityFilter}
                onChange={(event) =>
                  setPriorityFilter(event.target.value as 'ALL' | TicketPriority)
                }
              >
                <option value="ALL">Alle Prioritäten</option>
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value as 'updated' | 'created' | 'priority')
                }
              >
                <option value="updated">Sortiert: Letzte Änderung</option>
                <option value="created">Sortiert: Neu erstellt</option>
                <option value="priority">Sortiert: Priorität</option>
              </select>
            </div>

            {loading && <p>Tickets laden…</p>}
            {error && <p className="error">{error}</p>}

            {visibleTickets.length === 0 && !loading ? (
              <div className="empty-state">
                <h3>Keine Tickets gefunden</h3>
                <p>Erstelle ein neues Ticket oder passe die Filter an.</p>
              </div>
            ) : (
              <div className="ticket-list">
                {visibleTickets.map((ticket, index) => {
                  const ticketBusy = isTicketBusy(ticket.id);
                  const assignDraft = assignDrafts[ticket.id] ?? ticket.assignedTo ?? '';
                  const canCloseTicket =
                    ticket.status !== 'CLOSED' &&
                    !!user &&
                    (isAdmin || ticket.createdBy === user.username);

                  return (
                    <article
                      key={ticket.id}
                      className={`ticket priority-${priorityClass(ticket.priority)}`}
                      style={{ animationDelay: `${index * 0.04}s` }}
                    >
                    <div className="ticket-top">
                      <div>
                        <p className="ticket-eyebrow">
                          Erstellt von {ticket.createdBy}
                        </p>
                        <h3>{ticket.title}</h3>
                        <p className="muted">{ticket.description}</p>
                      </div>
                      <div className="ticket-tags">
                        <span className={`badge ${statusClass(ticket.status)}`}>
                          {ticket.status}
                        </span>
                        <span className={`pill ${priorityClass(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </div>
                    </div>

                    <div className="ticket-meta">
                      <span>Erstellt: {formatDate(ticket.createdAt)}</span>
                      <span>Aktualisiert: {formatDate(ticket.updatedAt)}</span>
                      <span>Closed: {formatDate(ticket.closedAt)}</span>
                      <span>Zuweisung: {ticket.assignedTo ?? '-'} </span>
                    </div>

                    {editingId === ticket.id ? (
                      <div className="form edit-form">
                        <label>
                          Titel
                          <input
                            type="text"
                            value={editForm.title}
                            onChange={(event) =>
                              setEditForm((prev) => ({
                                ...prev,
                                title: event.target.value
                              }))
                            }
                          />
                        </label>
                        <label>
                          Beschreibung
                          <textarea
                            rows={3}
                            value={editForm.description}
                            onChange={(event) =>
                              setEditForm((prev) => ({
                                ...prev,
                                description: event.target.value
                              }))
                            }
                          />
                        </label>
                        <label>
                          Priorität
                          <select
                            value={editForm.priority}
                            onChange={(event) =>
                              setEditForm((prev) => ({
                                ...prev,
                                priority: event.target.value as TicketPriority
                              }))
                            }
                          >
                            {priorities.map((priority) => (
                              <option key={priority} value={priority}>
                                {priority}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="actions">
                          <button
                            className="btn"
                            type="button"
                            disabled={ticketBusy}
                            onClick={() => saveEdit(ticket.id)}
                          >
                            {ticketBusy ? 'Speichern…' : 'Speichern'}
                          </button>
                          <button
                            className="btn ghost"
                            type="button"
                            disabled={ticketBusy}
                            onClick={cancelEdit}
                          >
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="actions">
                        <button
                          className="btn ghost"
                          type="button"
                          disabled={ticketBusy}
                          onClick={() => startEdit(ticket)}
                        >
                          Bearbeiten
                        </button>
                        {canCloseTicket && (
                          <button
                            className="btn danger"
                            type="button"
                            disabled={ticketBusy}
                            onClick={() => closeTicket(ticket.id)}
                          >
                            {ticketBusy ? 'Bitte warten…' : 'Ticket schließen'}
                          </button>
                        )}
                      </div>
                    )}

                    {isAdmin && (
                      <div className="admin-controls">
                        <label>
                          Zuweisen an
                          <input
                            type="text"
                            placeholder="support.agent"
                            value={assignDraft}
                            onChange={(event) =>
                              setAssignDrafts((prev) => ({
                                ...prev,
                                [ticket.id]: event.target.value
                              }))
                            }
                          />
                        </label>
                        <div className="admin-actions">
                          <button
                            className="btn ghost"
                            type="button"
                            disabled={ticketBusy || ticket.status === 'CLOSED'}
                            onClick={() => takeTicket(ticket.id)}
                          >
                            Annehmen
                          </button>
                          <button
                            className="btn ghost"
                            type="button"
                            disabled={ticketBusy || assignDraft.trim().length < 2}
                            onClick={() => assignTicket(ticket.id, assignDraft)}
                          >
                            Zuweisung speichern
                          </button>
                        </div>
                        <label>
                          Status
                          <select
                            value={ticket.status}
                            disabled={ticketBusy}
                            onChange={(event) =>
                              updateStatus(ticket.id, event.target.value as TicketStatus)
                            }
                          >
                            {statuses.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    )}
                  </article>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      )}

      <footer className="footer">
        <p>
          Sicherheit durch JWT, Rate Limiting & Input Validation. Entwickelt für
          ipso Praxisarbeit · WEVE.TA1A.PA
        </p>
      </footer>
    </div>
  );
}

export default App;
