import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { findUserByUsername } from '../lib/users';
import { signToken } from '../lib/auth';
import { asyncHandler } from '../lib/async-handler';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6)
});

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const payload = loginSchema.parse(req.body);
    const user = findUserByUsername(payload.username);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const isValid = await bcrypt.compare(payload.password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const token = signToken({
      id: user.id,
      username: user.username,
      role: user.role
    });

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  })
);

export default router;
