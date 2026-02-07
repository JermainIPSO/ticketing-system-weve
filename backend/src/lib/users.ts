import bcrypt from 'bcryptjs';
import type { UserRole } from './auth';

export type User = {
  id: string;
  username: string;
  role: UserRole;
  passwordHash: string;
};

// Demo users for the assignment. Replace with a real user store in production.
export const users: User[] = [
  {
    id: 'u1',
    username: 'user',
    role: 'user',
    passwordHash: bcrypt.hashSync('user123', 10)
  },
  {
    id: 'a1',
    username: 'admin',
    role: 'admin',
    passwordHash: bcrypt.hashSync('admin123', 10)
  }
];

export const findUserByUsername = (username: string) =>
  users.find((user) => user.username === username);
