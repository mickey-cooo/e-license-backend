import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../decorator/roles.decorator';
import { Repository } from 'typeorm';
import { UserEntity } from '../database/user.entity';
import { CommonStatus } from '../enum/common.status';
import { RoleType } from '../enum/role.status';
import { AuthGuard } from './auth.guard';
import { RoleGuard } from './role.guard';

const contextFor = (request: object) =>
  ({
    getHandler: () => 'handler',
    getClass: () => 'class',
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

const reflectorWith = (metadata: Record<string, unknown>) =>
  ({
    getAllAndOverride: (key: string) => metadata[key],
  }) as unknown as Reflector;

describe('AuthGuard', () => {
  const jwt = {
    verifyAsync: jest.fn(async (token: string) => {
      if (token !== 'good') throw new Error('bad');
      return { id: 'u1', role: RoleType.USER };
    }),
  } as unknown as JwtService;
  const repoWith = (user: Partial<UserEntity> | null) =>
    ({
      findOne: jest.fn(async () => user),
    }) as unknown as Repository<UserEntity>;
  const activeUser = {
    uuid: 'u1',
    role: RoleType.ADMIN,
    status: CommonStatus.ACTIVE,
  };
  const withToken = () => ({ headers: { authorization: 'Bearer good' } });

  it('lets public routes through without a token', async () => {
    const guard = new AuthGuard(
      jwt,
      reflectorWith({ [IS_PUBLIC_KEY]: true }),
      repoWith(null),
    );
    await expect(guard.canActivate(contextFor({ headers: {} }))).resolves.toBe(
      true,
    );
  });

  it('rejects a missing or bad token with 401', async () => {
    const guard = new AuthGuard(jwt, reflectorWith({}), repoWith(activeUser));
    await expect(
      guard.canActivate(contextFor({ headers: {} })),
    ).rejects.toThrow(UnauthorizedException);
    await expect(
      guard.canActivate(
        contextFor({ headers: { authorization: 'Bearer nope' } }),
      ),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('uses the role stored in the database, not the one in the token', async () => {
    const guard = new AuthGuard(jwt, reflectorWith({}), repoWith(activeUser));
    const request: any = withToken();
    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'u1', role: RoleType.ADMIN });
  });

  it('rejects a valid token whose user was deleted or removed', async () => {
    const deleted = { ...activeUser, status: CommonStatus.DELETED };
    for (const user of [deleted, null]) {
      const guard = new AuthGuard(jwt, reflectorWith({}), repoWith(user));
      await expect(guard.canActivate(contextFor(withToken()))).rejects.toThrow(
        UnauthorizedException,
      );
    }
  });
});

describe('RoleGuard', () => {
  const run = (roles: RoleType[] | undefined, user?: { role: RoleType }) =>
    new RoleGuard(reflectorWith({ [ROLES_KEY]: roles })).canActivate(
      contextFor({ user }),
    );

  it('allows any caller when no roles are required', () => {
    expect(run(undefined, { role: RoleType.USER })).toBe(true);
  });

  it('blocks a merchant from an admin route', () => {
    expect(run([RoleType.ADMIN], { role: RoleType.USER })).toBe(false);
  });

  it('allows admin and super admin on an admin route', () => {
    expect(run([RoleType.ADMIN], { role: RoleType.ADMIN })).toBe(true);
    expect(run([RoleType.ADMIN], { role: RoleType.SUPER_ADMIN })).toBe(true);
  });

  it('blocks when there is no user on the request', () => {
    expect(run([RoleType.ADMIN])).toBe(false);
  });
});
