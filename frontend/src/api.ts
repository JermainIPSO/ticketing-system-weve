import type { Ticket, TicketPriority, TicketStatus, User } from './types';

const PROD_API_FALLBACK = 'https://weve-ticketing-api-jermain.onrender.com';
const API_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? 'http://localhost:4000' : PROD_API_FALLBACK);
const TOKEN_KEY = 'ticketing_token';
const USER_KEY = 'ticketing_user';

export const getStoredToken = () => localStorage.getItem(TOKEN_KEY);
export const storeToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const getStoredUser = (): User | null => {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
};

export const storeUser = (user: User) =>
  localStorage.setItem(USER_KEY, JSON.stringify(user));
export const clearUser = () => localStorage.removeItem(USER_KEY);

let authToken: string | null = getStoredToken();

export const setAuthToken = (token: string | null) => {
  authToken = token;
};

const request = async <T>(path: string, options: RequestInit = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers ?? {})
    }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = payload?.message ?? 'Request failed';
    throw new Error(message);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
};

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),
  getTickets: () => request<Ticket[]>('/tickets'),
  getTicket: (id: string) => request<Ticket>(`/tickets/${id}`),
  createTicket: (payload: {
    title: string;
    description: string;
    priority?: TicketPriority;
  }) =>
    request<Ticket>('/tickets', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),
  updateTicket: (
    id: string,
    payload: { title?: string; description?: string; priority?: TicketPriority }
  ) =>
    request<Ticket>(`/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    }),
  closeTicket: (id: string) =>
    request<Ticket>(`/tickets/${id}/close`, { method: 'POST' }),
  assignTicket: (id: string, assignedTo: string) =>
    request<Ticket>(`/tickets/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ assignedTo })
    }),
  updateStatus: (id: string, status: TicketStatus) =>
    request<Ticket>(`/tickets/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    })
};
