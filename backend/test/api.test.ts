import request from 'supertest';
import { beforeEach, afterAll, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/db/prisma';

const loginUser = async () => {
  const response = await request(app).post('/auth/login').send({
    username: 'user',
    password: 'user123'
  });
  return response.body.token as string;
};

const loginAdmin = async () => {
  const response = await request(app).post('/auth/login').send({
    username: 'admin',
    password: 'admin123'
  });
  return response.body.token as string;
};

beforeEach(async () => {
  await prisma.ticket.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('API', () => {
  it('returns health status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });

  it('allows a user to create and list tickets', async () => {
    const token = await loginUser();

    const create = await request(app)
      .post('/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Printer not working',
        description: 'The office printer shows an error code when printing.',
        priority: 'HIGH'
      });

    expect(create.status).toBe(201);
    expect(create.body.status).toBe('OPEN');

    const list = await request(app)
      .get('/tickets')
      .set('Authorization', `Bearer ${token}`);

    expect(list.status).toBe(200);
    expect(list.body.length).toBe(1);
  });

  it('allows admin to assign and update ticket status', async () => {
    const userToken = await loginUser();
    const adminToken = await loginAdmin();

    const create = await request(app)
      .post('/tickets')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'VPN issue',
        description: 'Cannot connect to VPN since this morning.',
        priority: 'MEDIUM'
      });

    const ticketId = create.body.id;

    const assign = await request(app)
      .post(`/tickets/${ticketId}/assign`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedTo: 'support.agent' });

    expect(assign.status).toBe(200);
    expect(assign.body.assignedTo).toBe('support.agent');

    const status = await request(app)
      .patch(`/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'IN_PROGRESS' });

    expect(status.status).toBe(200);
    expect(status.body.status).toBe('IN_PROGRESS');
  });
});
