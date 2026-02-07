export type UserRole = 'user' | 'admin';

export type User = {
  id: string;
  username: string;
  role: UserRole;
};

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export type Ticket = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdBy: string;
  assignedTo?: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
};
