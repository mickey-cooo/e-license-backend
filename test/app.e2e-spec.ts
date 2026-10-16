import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createHash } from 'crypto';
import request from 'supertest';
import { io, Socket } from 'socket.io-client';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { ResetPasswordEntity } from '../src/database/reset-password.entity';
import { UserEntity } from '../src/database/user.entity';
import { RoleType } from '../src/enum/role.status';
import { HttpAdapterHost } from '@nestjs/core';
import { HttpExceptionalFilter } from '../src/utils/exceptionalFilter/exceptionalFilter';

// Needs a real Postgres: set DB_*, JWT_SECRET, FRONTEND_URL, MAILER_* before running.
describe('e-licensing API (e2e)', () => {
  let app: INestApplication;
  let db: DataSource;
  const api = () => request(app.getHttpServer());
  const password = 'correct-horse-1';
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  const signUp = async (email: string) => {
    await api()
      .post('/api/v1/user/register')
      .send({ email, password, confirmPassword: password })
      .expect(201);
    const res = await api()
      .post('/api/v1/user/sign-in')
      .send({ email, password })
      .expect(201);
    return {
      token: res.body.accessToken as string,
      uuid: res.body.user.uuid as string,
    };
  };

  const merchantBody = (suffix: string) => ({
    merchantName: `Shop ${suffix}`,
    businessRegistrationNumber: `REG-${suffix}`,
    taxId: `12345678901${suffix}`,
    merchantType: 'food_and_beverage',
    contactName: 'Somchai',
    contactEmail: 'shop@example.com',
    contactPhoneNumber: '0812345678',
    hasFoodPreparation: true,
  });

  beforeAll(async () => {
    process.env.THROTTLE_DISABLED = 'true';
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    // keep in sync with src/main.ts (prefix, pipe, filter)
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionalFilter(app.get(HttpAdapterHost)));
    await app.init();
    db = app.get(DataSource);
    await db.query(
      'TRUNCATE "document_progress","document_request","reset_password","user","merchant","address" CASCADE',
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves health without login but blocks everything else', async () => {
    await api().get('/api/v1/health').expect(200);
    await api().get('/api/v1/merchant/list').expect(401);
    await api().get('/api/v1/document-workflow/list').expect(401);
    await api().post('/api/v1/mailer/send-email').send({}).expect(404);
  });

  it('validates input and returns proper auth errors', async () => {
    await api()
      .post('/api/v1/user/register')
      .send({ email: 'bad', password: 'x', confirmPassword: 'x' })
      .expect(400);
    await api()
      .post('/api/v1/user/register')
      .send({ email: 'a@x.com', password, confirmPassword: password, extra: 1 })
      .expect(400);
    const first = await signUp('Dup@X.com');
    expect(first.token).toBeTruthy();
    await api()
      .post('/api/v1/user/register')
      .send({ email: 'dup@x.com', password, confirmPassword: password })
      .expect(400);
    await api()
      .post('/api/v1/user/sign-in')
      .send({ email: 'dup@x.com', password: 'wrong-password' })
      .expect(401);
    await api()
      .post('/api/v1/user/sign-in')
      .send({ email: 'nobody@x.com', password })
      .expect(401);
  });

  it('runs the merchant and document flow with roles and ownership', async () => {
    const owner = await signUp('owner@x.com');
    const other = await signUp('other@x.com');
    const adminUser = await signUp('admin@x.com');
    await db
      .getRepository(UserEntity)
      .update(adminUser.uuid, { role: RoleType.ADMIN });
    const admin = (
      await api()
        .post('/api/v1/user/sign-in')
        .send({ email: 'admin@x.com', password })
        .expect(201)
    ).body;

    // merchant: owner creates one, cannot create a second, cannot list, other cannot read
    const created = await api()
      .post('/api/v1/merchant/create')
      .set(bearer(owner.token))
      .send(merchantBody('01'))
      .expect(201);
    const merchantId = created.body.data.merchant.uuid;
    expect(
      created.body.data.licenseAnalysis.recommendedLicenses.map(
        (l: any) => l.code,
      ),
    ).toContain('LIC-FNB-001');
    await api()
      .post('/api/v1/merchant/create')
      .set(bearer(owner.token))
      .send(merchantBody('02'))
      .expect(400);
    await api()
      .post('/api/v1/merchant/create')
      .set(bearer(other.token))
      .send(merchantBody('01'))
      .expect(400); // same tax id
    await api()
      .get('/api/v1/merchant/list')
      .set(bearer(owner.token))
      .expect(403);
    await api()
      .get(`/api/v1/merchant/${merchantId}`)
      .set(bearer(other.token))
      .expect(403);
    await api()
      .get(`/api/v1/merchant/${merchantId}`)
      .set(bearer(owner.token))
      .expect(200);
    await api().get('/api/v1/merchant/me').set(bearer(owner.token)).expect(200);
    await api()
      .patch(`/api/v1/merchant/update/${merchantId}`)
      .set(bearer(owner.token))
      .send({ contactName: 'New Name' })
      .expect(200);

    // merchant: admin lists with a total, reviews once
    const list = await api()
      .get('/api/v1/merchant/list?limit=5')
      .set(bearer(admin.accessToken))
      .expect(200);
    expect(list.body.total).toBe(1);
    await api()
      .patch(`/api/v1/merchant/review/${merchantId}`)
      .set(bearer(owner.token))
      .send({ status: 'approved' })
      .expect(403);
    await api()
      .patch(`/api/v1/merchant/review/${merchantId}`)
      .set(bearer(admin.accessToken))
      .send({ status: 'active' })
      .expect(400);
    await api()
      .patch(`/api/v1/merchant/review/${merchantId}`)
      .set(bearer(admin.accessToken))
      .send({ status: 'approved', remark: 'ok' })
      .expect(200);
    await api()
      .patch(`/api/v1/merchant/review/${merchantId}`)
      .set(bearer(admin.accessToken))
      .send({ status: 'rejected' })
      .expect(400);
    await api()
      .get(`/api/v1/merchant/${merchantId}`)
      .set(bearer(owner.token))
      .expect(200);

    // an approved merchant that changes its tax id goes back to review
    await api()
      .patch(`/api/v1/merchant/update/${merchantId}`)
      .set(bearer(owner.token))
      .send({ taxId: '9999999999999' })
      .expect(200);
    const afterEdit = await api()
      .get(`/api/v1/merchant/${merchantId}`)
      .set(bearer(owner.token))
      .expect(200);
    expect(afterEdit.body.data.status).toBe('pending');

    // documents
    const doc = {
      title: 'Licence form',
      documentType: 'form',
      fileUrl: 'https://files.example.com/a.pdf',
      merchantUuid: merchantId,
    };
    await api()
      .post('/api/v1/document-workflow/create')
      .set(bearer(owner.token))
      .send({ ...doc, fileUrl: 'javascript:alert(1)' })
      .expect(400);
    await api()
      .post('/api/v1/document-workflow/create')
      .set(bearer(owner.token))
      .send({ ...doc, submittedBy: 'admin' })
      .expect(400);
    await api()
      .post('/api/v1/document-workflow/create')
      .set(bearer(other.token))
      .send(doc)
      .expect(403);
    const made = await api()
      .post('/api/v1/document-workflow/create')
      .set(bearer(owner.token))
      .send(doc)
      .expect(201);
    const docId = made.body.data.uuid;
    await api()
      .get(`/api/v1/document-workflow/${docId}`)
      .set(bearer(other.token))
      .expect(403);
    expect(
      (
        await api()
          .get('/api/v1/document-workflow/list')
          .set(bearer(other.token))
          .expect(200)
      ).body.total,
    ).toBe(0);
    expect(
      (
        await api()
          .get('/api/v1/document-workflow/list')
          .set(bearer(owner.token))
          .expect(200)
      ).body.total,
    ).toBe(1);

    await api()
      .patch(`/api/v1/document-workflow/status/${docId}`)
      .set(bearer(owner.token))
      .send({ status: 'approved' })
      .expect(403);
    await api()
      .patch(`/api/v1/document-workflow/status/${docId}`)
      .set(bearer(admin.accessToken))
      .send({ status: 'approved' })
      .expect(400); // skips steps
    await api()
      .patch(`/api/v1/document-workflow/status/${docId}`)
      .set(bearer(admin.accessToken))
      .send({ status: 'forwarded_to_admin' })
      .expect(400); // forward has its own endpoint
    await api()
      .patch(`/api/v1/document-workflow/forward/${docId}`)
      .set(bearer(admin.accessToken))
      .send({})
      .expect(200);
    // once forwarded, the owner can neither swap the file nor delete the document
    await api()
      .patch(`/api/v1/document-workflow/update/${docId}`)
      .set(bearer(owner.token))
      .send({ fileUrl: 'https://files.example.com/swapped.pdf' })
      .expect(400);
    await api()
      .delete(`/api/v1/document-workflow/delete/${docId}`)
      .set(bearer(owner.token))
      .expect(400);
    await api()
      .patch(`/api/v1/document-workflow/forward/${docId}`)
      .set(bearer(admin.accessToken))
      .send({})
      .expect(400);
    await api()
      .patch(`/api/v1/document-workflow/status/${docId}`)
      .set(bearer(admin.accessToken))
      .send({ status: 'in_review' })
      .expect(200);
    await api()
      .patch(`/api/v1/document-workflow/status/${docId}`)
      .set(bearer(admin.accessToken))
      .send({ status: 'approved' })
      .expect(200);
    await api()
      .patch(`/api/v1/document-workflow/status/${docId}`)
      .set(bearer(admin.accessToken))
      .send({ status: 'submitted' })
      .expect(400);
    await api()
      .patch(`/api/v1/document-workflow/update/${docId}`)
      .set(bearer(owner.token))
      .send({ title: 'x' })
      .expect(400); // final

    const detail = await api()
      .get(`/api/v1/document-workflow/${docId}`)
      .set(bearer(owner.token))
      .expect(200);
    expect(detail.body.data.progress.map((p: any) => p.status)).toEqual([
      'submitted',
      'forwarded_to_admin',
      'in_review',
      'approved',
    ]);
    expect(detail.body.data.progress[3].createdBy).toBe(admin.user.uuid);

    // users: self only, admin any
    await api()
      .get(`/api/v1/user/${owner.uuid}`)
      .set(bearer(owner.token))
      .expect(200);
    await api()
      .get(`/api/v1/user/${owner.uuid}`)
      .set(bearer(other.token))
      .expect(403);
    await api()
      .get(`/api/v1/user/${owner.uuid}`)
      .set(bearer(admin.accessToken))
      .expect(200);
    await api()
      .delete(`/api/v1/user/delete/${owner.uuid}`)
      .set(bearer(other.token))
      .expect(403);
    await api()
      .post('/api/v1/user/list')
      .set(bearer(owner.token))
      .send({ ids: [owner.uuid] })
      .expect(403);
    await api()
      .post('/api/v1/user/list')
      .set(bearer(admin.accessToken))
      .send({ ids: [] })
      .expect(400);
    const users = await api()
      .post('/api/v1/user/list')
      .set(bearer(admin.accessToken))
      .send({ ids: [owner.uuid, other.uuid] })
      .expect(201);
    expect(users.body.data).toHaveLength(2);
    await api()
      .patch(`/api/v1/user/update/${owner.uuid}`)
      .set(bearer(owner.token))
      .send({
        name: { th: 'ก', en: 'A' },
        lastName: { th: 'ข', en: 'B' },
        phoneNumber: '0812345678',
      })
      .expect(200);
    await api()
      .post('/api/v1/user/create')
      .set(bearer(owner.token))
      .send({})
      .expect(403);
  });

  it('applies deletion and role changes to tokens that were already issued', async () => {
    const leaver = await signUp('leaver@x.com');
    await api()
      .get('/api/v1/merchant/me')
      .set(bearer(leaver.token))
      .expect(404);
    await api()
      .delete(`/api/v1/user/delete/${leaver.uuid}`)
      .set(bearer(leaver.token))
      .expect(200);
    await api()
      .get('/api/v1/merchant/me')
      .set(bearer(leaver.token))
      .expect(401);

    const member = await signUp('promoted@x.com');
    await api()
      .get('/api/v1/merchant/list')
      .set(bearer(member.token))
      .expect(403);
    await db
      .getRepository(UserEntity)
      .update(member.uuid, { role: RoleType.ADMIN });
    await api()
      .get('/api/v1/merchant/list')
      .set(bearer(member.token))
      .expect(200);
    await db
      .getRepository(UserEntity)
      .update(member.uuid, { role: RoleType.USER });
    await api()
      .get('/api/v1/merchant/list')
      .set(bearer(member.token))
      .expect(403);
  });

  it('stops a plain admin from changing another admin', async () => {
    const boss = await signUp('boss@x.com');
    const peer = await signUp('peer@x.com');
    await db
      .getRepository(UserEntity)
      .update(boss.uuid, { role: RoleType.SUPER_ADMIN });
    await db
      .getRepository(UserEntity)
      .update(peer.uuid, { role: RoleType.ADMIN });
    await api()
      .delete(`/api/v1/user/delete/${boss.uuid}`)
      .set(bearer(peer.token))
      .expect(403);
    await api()
      .delete(`/api/v1/user/delete/${peer.uuid}`)
      .set(bearer(boss.token))
      .expect(200);
  });

  it('resets a password once with an emailed token', async () => {
    const user = await signUp('forgot@x.com');
    await api()
      .post('/api/v1/user/forgot-password')
      .send({ email: 'forgot@x.com' })
      .expect(201);
    await api()
      .post('/api/v1/user/forgot-password')
      .send({ email: 'unknown@x.com' })
      .expect(201);
    const rows = await db
      .getRepository(ResetPasswordEntity)
      .find({ where: { user: { uuid: user.uuid } } });
    expect(rows).toHaveLength(1);

    const token = 'a'.repeat(64);
    await db.getRepository(ResetPasswordEntity).update(rows[0].uuid, {
      resetToken: createHash('sha256').update(token).digest('hex'),
    });
    const body = {
      token,
      newPassword: 'brand-new-pass-1',
      confirmNewPassword: 'brand-new-pass-1',
    };
    await api()
      .post('/api/v1/user/reset-password')
      .send({ ...body, confirmNewPassword: 'nope-nope-nope' })
      .expect(400);
    await api().post('/api/v1/user/reset-password').send(body).expect(201);
    await api().post('/api/v1/user/reset-password').send(body).expect(400);
    await api()
      .post('/api/v1/user/sign-in')
      .send({ email: 'forgot@x.com', password })
      .expect(401);
    await api()
      .post('/api/v1/user/sign-in')
      .send({ email: 'forgot@x.com', password: body.newPassword })
      .expect(201);
  });

  it('rate limits sign-in attempts per IP', async () => {
    process.env.THROTTLE_DISABLED = 'false';
    try {
      const statuses: number[] = [];
      for (let i = 0; i < 7; i++) {
        const res = await api()
          .post('/api/v1/user/sign-in')
          .send({ email: 'nobody@x.com', password: 'whatever-pass' });
        statuses.push(res.status);
      }
      expect(statuses.slice(0, 5)).toEqual([401, 401, 401, 401, 401]);
      expect(statuses.slice(5)).toEqual([429, 429]);
    } finally {
      process.env.THROTTLE_DISABLED = 'true';
    }
  });

  it('only pushes document events to admins and the document owner', async () => {
    await app.listen(0);
    const url = `${await app.getUrl()}/document-workflow`;
    const owner = await signUp('ws-owner@x.com');
    const other = await signUp('ws-other@x.com');
    const adminUser = await signUp('ws-admin@x.com');
    await db
      .getRepository(UserEntity)
      .update(adminUser.uuid, { role: RoleType.ADMIN });
    const admin = (
      await api()
        .post('/api/v1/user/sign-in')
        .send({ email: 'ws-admin@x.com', password })
        .expect(201)
    ).body;

    const connect = (token?: string) =>
      new Promise<{ socket: Socket; events: any[]; connected: boolean }>(
        (resolve) => {
          const socket = io(url, {
            auth: token ? { token } : {},
            transports: ['websocket'],
            reconnection: false,
          });
          const state = { socket, events: [] as any[], connected: false };
          socket.on('document-workflow.connected', () => {
            state.connected = true;
            resolve(state);
          });
          socket.on('document-workflow.progress-updated', (e) =>
            state.events.push(e),
          );
          socket.on('disconnect', () => resolve(state));
          socket.on('connect_error', () => resolve(state));
        },
      );

    const anon = await connect();
    expect(anon.connected).toBe(false);
    const [ownerWs, otherWs, adminWs] = await Promise.all([
      connect(owner.token),
      connect(other.token),
      connect(admin.accessToken),
    ]);
    expect([ownerWs.connected, otherWs.connected, adminWs.connected]).toEqual([
      true,
      true,
      true,
    ]);

    const made = await api()
      .post('/api/v1/document-workflow/create')
      .set(bearer(owner.token))
      .send({
        title: 'WS doc',
        documentType: 'form',
        fileUrl: 'https://files.example.com/ws.pdf',
      })
      .expect(201);
    await api()
      .patch(`/api/v1/document-workflow/forward/${made.body.data.uuid}`)
      .set(bearer(admin.accessToken))
      .send({})
      .expect(200);
    await api()
      .patch(`/api/v1/document-workflow/status/${made.body.data.uuid}`)
      .set(bearer(admin.accessToken))
      .send({ status: 'in_review' })
      .expect(200);
    await new Promise((r) => setTimeout(r, 300));

    expect(adminWs.events.map((e) => e.status)).toEqual([
      'submitted',
      'forwarded_to_admin',
    ]);
    expect(ownerWs.events.map((e) => e.status)).toEqual(['in_review']);
    expect(otherWs.events).toEqual([]);
    expect(JSON.stringify(adminWs.events)).not.toContain('submittedBy');
    [anon, ownerWs, otherWs, adminWs].forEach((c) => c.socket.close());
  });
});
