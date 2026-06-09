import { Injectable, Module, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { DatabaseModule } from './database/database.module';
import { StoriesModule } from './stories/stories.module';
import { CharactersModule } from './characters/characters.module';
import { SessionsModule } from './sessions/sessions.module';
import { MessagesModule } from './messages/messages.module';
import { SandboxModule } from './sandbox/sandbox.module';
import { LlmModule } from './llm/llm.module';
import { HealthModule } from './health/health.module';
import { StorageModule } from './storage/storage.module';
import { ThrottlerBehindProxyGuard } from './common/throttler-behind-proxy.guard';

/**
 * 在 Nest 启动时执行一次连接重试 + runMigrations()。
 * dev（mysql）首次连接失败可重试一次；prod（sqlite）通常无网络重试。
 */
@Injectable()
class MigrationRunner implements OnApplicationBootstrap {
  private readonly logger = new Logger('MigrationRunner');
  constructor(private readonly ds: DataSource) {}

  async onApplicationBootstrap() {
    const type = this.ds.options.type;
    if (type === 'mysql') {
      // 一次重连尝试：mysql2 在 PROTOCOL_CONNECTION_LOST 时可自动重连，但首次连接错误时不一定
      try {
        await this.ds.query('SELECT 1');
      } catch (err) {
        this.logger.warn(`首次 MySQL ping 失败，重试中：${(err as Error).message}`);
        await new Promise((r) => setTimeout(r, 1000));
        try {
          await this.ds.query('SELECT 1');
        } catch (e) {
          this.logger.error(
            `MySQL 重连失败：请先执行 \`npm run db:up\` 启动容器。错误：${(e as Error).message}`,
          );
          throw e;
        }
      }
    }
    const ran = await this.ds.runMigrations({ transaction: 'each' });
    this.logger.log(`已应用迁移：${ran.length === 0 ? '无（已是最新）' : ran.map((m) => m.name).join(', ')}`);
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../.env'] }),
    EventEmitterModule.forRoot({ global: true, wildcard: true }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 60 },
    ]),
    DatabaseModule,
    StorageModule,
    StoriesModule,
    CharactersModule,
    SessionsModule,
    MessagesModule,
    SandboxModule,
    LlmModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerBehindProxyGuard },
    MigrationRunner,
  ],
})
export class AppModule {}
