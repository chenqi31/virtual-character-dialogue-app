import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    const dbType = (this.config.get<string>('DB_TYPE') ?? 'mysql') as 'mysql' | 'sqlite';
    return this.health.check([
      // 仅 ping 一次，开销低
      () => this.db.pingCheck('database', { timeout: 1500 }),
    ]).then((r) => ({
      ...r,
      dbType,
      timestamp: new Date().toISOString(),
    }));
  }
}
