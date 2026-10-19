import { SetMetadata } from '@nestjs/common';
import type { Role } from './roles.js';

export const ROLES_KEY = 'roles';

/** Déclare les rôles autorisés sur une route. Lu par RolesGuard. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
