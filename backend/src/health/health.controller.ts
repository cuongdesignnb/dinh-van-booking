import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /** Liveness plus a real database round trip, used by the container healthcheck. */
  @Public()
  @Get()
  async check(): Promise<{ status: string; database: string; time: string }> {
    let database = 'down';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'up';
    } catch {
      database = 'down';
    }
    return { status: database === 'up' ? 'ok' : 'degraded', database, time: new Date().toISOString() };
  }
}
