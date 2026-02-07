import jwt from 'jsonwebtoken';
import { env } from './env';

export type UserRole = 'user' | 'admin';
export type AuthUser = {
  id: string;
  username: string;
  role: UserRole;
};

export const signToken = (user: AuthUser) => {
  return jwt.sign(user, env.JWT_SECRET, { expiresIn: '2h' });
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, env.JWT_SECRET) as AuthUser;
};
