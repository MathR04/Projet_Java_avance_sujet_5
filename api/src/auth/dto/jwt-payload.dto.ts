import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { JwtPayload } from '../auth.guard.js';
import { ROLES, type Role } from '../roles.js';

/** Ce que porte le token, tel que `GET /auth/whoami` le renvoie. */
export class JwtPayloadDto implements JwtPayload {
  @ApiProperty({ description: 'User id' })
  sub!: string;

  @ApiProperty({ example: 'camille.martin@etu.castelmont.fr' })
  email!: string;

  @ApiProperty({ example: 'Camille Martin' })
  name!: string;

  @ApiProperty({ enum: ROLES, example: 'STUDENT' })
  role!: Role;

  @ApiPropertyOptional({ enum: [1, 2, 3], nullable: true })
  year?: number | null;

  @ApiPropertyOptional({ nullable: true })
  companyId?: string | null;
}
