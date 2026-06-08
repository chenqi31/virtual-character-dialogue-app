import { app } from 'electron';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export interface AppConfig {
  apiKey?: string;
  baseUrl?: string;
  dbType?: 'sqlite';
  dbPath?: string;
}

function configPath() {
  const dir = app.getPath('userData');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, 'config.json');
}

export function readConfig(): AppConfig {
  const p = configPath();
  if (!existsSync(p)) return {};
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as AppConfig;
  } catch {
    return {};
  }
}

export function writeConfig(cfg: AppConfig) {
  const p = configPath();
  writeFileSync(p, JSON.stringify(cfg, null, 2), 'utf-8');
}
