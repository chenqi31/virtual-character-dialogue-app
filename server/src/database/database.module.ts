/*
 * @Author: chenqi31 chenqi31@hikvision.com.cn
 * @Date: 2026-06-08 19:21:36
 * @LastEditors: chenqi31 chenqi31@hikvision.com.cn
 * @LastEditTime: 2026-06-09 11:22:12
 * @Description: 
 */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Character, Message, Session, Story } from './entities';

/**
 * 动态 forRoot：根据 ConfigService.db.type 注入 mysql / sqlite。
 * 一次性重试由 onApplicationBootstrap 在 AppModule 触发 runMigrations 完成。
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const type = (config.get<string>('DB_TYPE') ?? 'mysql') as 'mysql' | 'sqlite';
        const common = {
          entities: [Story, Character, Session, Message],
          synchronize: false,
          autoLoadEntities: false,
        };
        if (type === 'sqlite') {
          return {
            type: 'better-sqlite3' as const,
            database:
              config.get<string>('DB_SQLITE_PATH') ||
              process.env.USER_DATA_DIR + '/app.db' ||
              './data/app.db',
            ...common,
          };
        }
        return {
          type: 'mysql' as const,
          host: config.get<string>('DB_HOST') || '127.0.0.1',
          port: Number(config.get<string>('DB_PORT') ?? 3307),
          username: config.get<string>('DB_USER') || 'virtual_chat',
          password: config.get<string>('DB_PASSWORD') || 'virtual_chat',
          database: config.get<string>('DB_NAME') || 'virtual_chat',
          charset: 'utf8mb4',
          timezone: '+08:00',
          extra: { connectionLimit: 10 },
          ...common,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
