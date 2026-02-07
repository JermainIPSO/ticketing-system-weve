import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { asyncHandler } from '../lib/async-handler';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

const priorityEnum = z.enum(['LOW', 'MEDIUM', 'HIGH']);
const statusEnum = z.enum(['OPEN', 'IN_PROGRESS', 'CLOSED']);

const createSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(2000),
  priority: priorityEnum.optional()
});

const updateSchema = z
  .object({
    title: z.string().min(3).max(120).optional(),
    description: z.string().min(10).max(2000).optional(),
    priority: priorityEnum.optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided.'
  });

const assignSchema = z.object({
  assignedTo: z.string().min(2)
});

const statusSchema = z.object({
  status: statusEnum
});

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const tickets =
      user.role === 'admin'
        ? await prisma.ticket.findMany({
            orderBy: { updatedAt: 'desc' }
          })
        : await prisma.ticket.findMany({
            where: { createdBy: user.username },
            orderBy: { updatedAt: 'desc' }
          });

    return res.json(tickets);
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id }
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    if (user.role !== 'admin' && ticket.createdBy !== user.username) {
      return res.status(403).json({ message: 'Forbidden.' });
    }

    return res.json(ticket);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const payload = createSchema.parse(req.body);

    const ticket = await prisma.ticket.create({
      data: {
        title: payload.title,
        description: payload.description,
        priority: payload.priority ?? 'MEDIUM',
        createdBy: user.username
      }
    });

    return res.status(201).json(ticket);
  })
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const payload = updateSchema.parse(req.body);

    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id }
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    if (user.role !== 'admin' && ticket.createdBy !== user.username) {
      return res.status(403).json({ message: 'Forbidden.' });
    }

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: payload
    });

    return res.json(updated);
  })
);

router.post(
  '/:id/close',
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id }
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    if (user.role !== 'admin' && ticket.createdBy !== user.username) {
      return res.status(403).json({ message: 'Forbidden.' });
    }

    const closed = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { status: 'CLOSED', closedAt: new Date() }
    });

    return res.json(closed);
  })
);

router.post(
  '/:id/assign',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const payload = assignSchema.parse(req.body);
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id }
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: { assignedTo: payload.assignedTo }
    });

    return res.json(updated);
  })
);

router.patch(
  '/:id/status',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const payload = statusSchema.parse(req.body);
    const ticket = await prisma.ticket.findUnique({
      where: { id: req.params.id }
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    const updated = await prisma.ticket.update({
      where: { id: req.params.id },
      data: {
        status: payload.status,
        closedAt: payload.status === 'CLOSED' ? new Date() : null
      }
    });

    return res.json(updated);
  })
);

export default router;
