import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

/** Repris du TP3. `@Global` : PrismaService s'injecte partout sans réimporter ce module. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
