# Virtual Character Dialogue App

虚拟人物对话桌面应用：用户自建故事背景与人物，两个虚拟角色可在沙盒中自动交流，用户也能以第三方身份介入。

## 技术栈

- 桌面壳：Electron + electron-vite
- 前端：Vite + Vue 3 + Pinia + Vue Router
- 后端：NestJS 10（@nestjs/platform-express）+ TypeScript
- 数据：dev = Docker MySQL 8；prod = better-sqlite3（双轨）
- ORM：TypeORM（@nestjs/typeorm）
- 大模型：minimax（OpenAI 兼容 chat completions）
- 流式：SSE（后端 Nest `@Sse()` Observable，前端 `fetch` + ReadableStream）

## 目录结构

```
.
├── electron/        # 桌面壳（main / preload / spawnServer / config / 菜单 / builder 配置）
├── web/             # Vite + Vue3 渲染层
├── server/          # NestJS 后端
├── shared/          # 跨端共享类型
├── docker/          # docker-compose / mysql conf / env
├── docs/            # USAGE / ARCHITECTURE / BACKUP
└── openspec/        # OpenSpec 变更与规范
```

## 开发命令

```bash
# 安装依赖（workspaces）
npm install

# 启动 dev：自动拉起 MySQL 容器 + Nest 后端 + Vite 前端 + Electron
npm run dev

# 仅后端
npm run dev:server

# 仅前端 HMR
npm run dev:web

# 仅 Electron（需后端已起）
npm run dev:electron

# 数据库
npm run db:up     # 启动 MySQL 容器
npm run db:down   # 停止
npm run db:reset  # 停止并清空数据
```

## 构建与打包

```bash
npm run build:web      # 打包前端 dist/
npm run build:server   # 打包后端 dist/
npm run build:win      # 打包 Windows 安装包
npm run build:mac      # 打包 macOS dmg
```

## 启动链路（dev / prod 差异）

| 模式 | 数据库 | 启动方式 | 说明 |
|---|---|---|---|
| dev  | Docker MySQL（3307） | `npm run dev` 顺次拉起 db → server → web → electron | 开发者本机需 Docker |
| prod | better-sqlite3 单文件 | Electron 启动时由 main 进程 fork Nest → `/health` 200 → loadURL | 终用户**无需**安装 Docker |

## NestJS 启动注意事项

- tsconfig 必须开启 `experimentalDecorators` 与 `emitDecoratorMetadata`（见 `tsconfig.base.json`）。
- 启动开发后端使用 `nest start --watch`（位于 `server/package.json`），由 `nest-cli.json` 驱动。
- 装饰器元数据丢失会导致 `@nestjs/typeorm` 注入失败，CI 应检查构建产物。

## 已知限制

- **minimax 鉴权方式**：现阶段按 OpenAI 兼容风格（`Authorization: Bearer <key>`）实现；若 minimax 实际接口使用签名鉴权，需要修改 `LlmClient`。
- **角色头像**：暂不支持角色头像上传与展示；如后续需要，可在 `<userData>/avatars/` 目录存储，前端通过 `file://` 协议加载。
- **沙盒轮次上限**：硬编码为 20 轮，暂不支持用户自定义。
- **并发会话**：同一故事仅支持一个活跃沙盒会话；多会话需手动切换。
- **离线模式**：应用依赖 minimax API，无离线对话能力。
- **数据迁移**：dev（MySQL）与 prod（SQLite）之间暂不支持数据互迁，需手动导出/导入。

## 配置项

- 复制 `.env.example` 为 `.env`，填入 `MINIMAX_API_KEY`。
- 桌面端首次启动会引导用户填写 API Key，保存到 `<userData>/config.json`。

## OpenSpec

本项目通过 OpenSpec 管理变更；变更与规范位于 `openspec/`。当前活跃变更：`virtual-character-dialogue-app`。
