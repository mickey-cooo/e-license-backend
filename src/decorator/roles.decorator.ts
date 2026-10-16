import { SetMetadata } from '@nestjs/common';
import { RoleType } from '../enum/role.status';

export const ROLES_KEY = 'ROLES_KEY';
export const IS_PUBLIC_KEY = 'IS_PUBLIC_KEY';

export const Roles = (...roles: RoleType[]) => SetMetadata(ROLES_KEY, roles);
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
