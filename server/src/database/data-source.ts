import 'reflect-metadata';
import { DataSource, DataSourceOptions } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { Character, Message, Session, Story } from './entities';

/**
 * 跨 dev（mysql）与 prod（sqlite）的 TypeORM DataSource。
 * 通过环境变量 DB_TYPE 切换。CLI 迁移与 Nest 启动均复用此文件。
 */

loadEnv();

const dbType = (process.env.DB_TYPE ?? 'mysql') as 'mysql' | 'sqlite';

const commonEntities = [Story, Character, Session, Message];

function buildOptions(): DataSourceOptions {
  if (dbType === 'sqlite') {
    return {
      type: 'better-sqlite3',
      database: process.env.DB_SQLITE_PATH || './data/app.db',
      entities: commonEntities,
      migrations: ['src/database/migrations/*.ts'],
      synchronize: false,
      logging: false,
    };
  }
  return {
    type: 'mysql',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3307),
    username: process.env.DB_USER || 'virtual_chat',
    password: process.env.DB_PASSWORD || 'virtual_chat',
    database: process.env.DB_NAME || 'virtual_chat',
    entities: commonEntities,
    migrations: ['src/database/migrations/*.ts'],
    synchronize: false,
    charset: 'utf8mb4_unicode_ci',
    timezone: '+08:00',
    logging: false,
  };
}

export const AppDataSource = new DataSource(buildOptions());
export const APP_DB_TYPE = dbType;
