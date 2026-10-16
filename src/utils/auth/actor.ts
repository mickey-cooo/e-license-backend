import { ForbiddenException } from '@nestjs/common';
import { RoleType } from '../../enum/role.status';

export type Actor = { id: string; role: RoleType };

export const isAdmin = (actor: Actor) =>
  actor.role === RoleType.ADMIN || actor.role === RoleType.SUPER_ADMIN;

// A plain admin may not change another admin or a super admin.
export function assertCanManageUser(
  actor: Actor,
  target: { uuid: string; role: RoleType },
) {
  if (actor.id === target.uuid || actor.role === RoleType.SUPER_ADMIN) {
    return;
  }
  if (target.role === RoleType.ADMIN || target.role === RoleType.SUPER_ADMIN) {
    throw new ForbiddenException();
  }
}

export function assertSelfOrAdmin(actor: Actor, userId: string) {
  if (actor.id !== userId && !isAdmin(actor)) {
    throw new ForbiddenException();
  }
}
