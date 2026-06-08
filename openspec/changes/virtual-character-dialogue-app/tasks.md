## 1. 工程骨架与依赖

- [x] 1.1 创建 monorepo 目录结构：`electron/`、`web/`、`server/`、`shared/`、`docker/`、`package.json`(根 workspaces)
- [x] 1.2 安装核心依赖：Vue 3、Vite、Pinia、Vue Router、Electron、electron-vite、electron-builder、@nestjs/core、@nestjs/common、@nestjs/platform-express、@nestjs/config、@nestjs/typeorm、@nestjs/event-emitter、@nestjs/throttler、@nestjs/terminus、typeorm、mysql2、better-sqlite3、reflect-metadata、rxjs、class-validator、class-transformer、concurrently、typescript
- [x] 1.3 配置根 `package.json` 脚本：`dev`（docker + nest + vite + electron）、`dev:web`、`dev:server`、`dev:electron`、`db:up`、`db:down`、`db:reset`、`build:web`、`build:server`、`build:electron`、`build:win`、`build:mac`、`migration:generate`、`migration:run`、`migration:revert`
- [x] 1.4 配置 `.gitignore`、`tsconfig.base.json`（开启 `experimentalDecorators / emitDecoratorMetadata`）、`editorconfig`、`.env.example`、根 `docker/.env`
- [x] 1.5 在 README 中明示 NestJS + TS 启动命令使用 `ts-node-dev` 或 `nest start --watch`，并写好 `tsconfig` paths 别名

## 2. 数据库（双轨：dev=Docker MySQL，prod=SQLite）

- [x] 2.1 编写 `docker/docker-compose.yml`：启动 `mysql:8.0` 服务，端口 3306:3306，named volume 挂载 `./data/mysql`，env_file 注入密码
- [x] 2.2 编写 `docker/.env.example`：`MYSQL_ROOT_PASSWORD`、`MYSQL_DATABASE=virtual_chat`、`MYSQL_USER`、`MYSQL_PASSWORD`
- [x] 2.3 编写 `docker/mysql/conf.d/my.cnf`：`character-set-server=utf8mb4`、`collation-server=utf8mb4_unicode_ci`、`default-time-zone=+08:00`
- [x] 2.4 用 TypeORM 实体生成首版 migration `001_init.ts`：`stories / characters / sessions / messages`（dev MySQL 用 InnoDB、utf8mb4、外键 `ON DELETE CASCADE`、`INDEX(session_id, id)`）
- [x] 2.5 在 `server/src/database/data-source.ts` 中同时配置 dev（mysql）与 prod（sqlite）DataSource
- [x] 2.6 在 `server/src/storage/` 暴露 `Storage` 接口（`createStory / listMessages / ...`），提供 TypeORM 实现的 `TypeOrmStorageService`，由 Nest 工厂根据 `db.type` 注入
- [x] 2.7 业务 Service 只依赖 `Storage` 接口（通过 DI 注入），**禁止**直接 `InjectRepository` 到业务层
- [x] 2.8 在 `TypeOrmModule.forRootAsync` 工厂中实现连接重试（`PROTOCOL_CONNECTION_LOST` / `ECONNRESET` 一次重试），重试失败启动失败
- [x] 2.9 评估并落定 prod 方案：便携 MySQL（如 `glorand/mysql-server` / `mysql-8.0-winx64` zip 包，约 200MB）通过 `child_process.spawn` 拉起 `mysqld.exe` 监听 127.0.0.1:3307，**或**改用 `better-sqlite3` 单文件；本期选择 `better-sqlite3` 作为 prod 存储（更轻量、零安装）
- [x] 2.10 在 `OnApplicationBootstrap` 钩子中执行 `dataSource.runMigrations()`，dev/prod 行为一致

## 3. 后端：NestJS 服务

- [x] 3.1 初始化 NestJS 脚手架（`nest new server` 或手工），TypeScript 严格模式，tsconfig 开启装饰器元数据
- [x] 3.2 `AppModule` 注册：`ConfigModule`（全局）、`TypeOrmModule`（动态 forRoot）、`StorageModule`、`StoriesModule`、`CharactersModule`、`SessionsModule`、`MessagesModule`、`SandboxModule`、`LlmModule`、`HealthModule`、`ThrottlerModule`（全局）、`EventEmitterModule`（全局）
- [x] 3.3 `ConfigModule` 从 `.env` + 用户 `config.json` 加载：`MINIMAX_API_KEY / MINIMAX_BASE_URL / DB_TYPE / DB_PATH / PORT`
- [x] 3.4 实现 `StoryService` + `StoryController`（`/api/stories`）：`createStory / updateStory / deleteStory / listStories / getStory`（delete 通过外键级联）
- [x] 3.5 实现 `CharacterService` + `CharacterController`（`/api/characters`）：`createCharacter / updateCharacter / deleteCharacter / listCharacters / getCharacter`
- [x] 3.6 实现 `SessionService` + `SessionController`（`/api/sessions`）：`createSession / getSession / resetSession / clearMessages / updateState`
- [x] 3.7 实现 `MessageService` + `MessageController`（`/api/messages`）：`appendMessage / listMessages(pagination by beforeId)`
- [x] 3.8 实现 `LlmClient`（封装 minimax HTTP 客户端、baseUrl/ApiKey 配置、流式读取、AbortController），由 Nest `@Injectable()` 注入
- [x] 3.9 实现 `PromptBuilder`：系统提示词拼装（故事背景 + 人物设定 + 输出格式）+ **基于 token 长度的动态裁剪**（固定保留系统提示 + 最近 3-5 轮；按 tokenizer 或字符数估算，超出阈值时按时间由远到近丢弃更早消息）
- [x] 3.10 实现 `LlmController`：`@Sse() POST /api/llm/chat` 返回 `Observable<MessageEvent>`；客户端断开（unsubscribe）时调用 `LlmClient.abort()` 中止上游
- [x] 3.11 实现 `SandboxService`：状态机 `idle/running/paused/ended`、轮次上限 20、**事件驱动调度**（`@nestjs/event-emitter` 监听 `A.replied` 触发 `B.start()`）
- [x] 3.12 实现 `SandboxController`：`/api/sandbox/start|pause|resume|reset|inject`
- [x] 3.13 实现 `HealthController`：`@HealthCheck() GET /health` 返回 200 与当前 DB 类型（`mysql` / `sqlite`），使用 `@nestjs/terminus` 检查 DB ping
- [x] 3.14 实现限流：`@nestjs/throttler` 全局 60 req/min/IP + 自定义 Guard 强制同会话串行 + 全局最小间隔 200ms
- [x] 3.15 编写后端单元测试：CRUD、沙盒事件循环、提示词 token 裁剪、限流、迁移幂等（jest + @nestjs/testing）

## 4. 前端：Vite + Vue 3 应用

- [x] 4.1 初始化 Vite Vue3 项目（TypeScript），`vite.config.ts` 代理 `/api` 到 `127.0.0.1:7001`
- [x] 4.2 配置 Pinia、Vue Router；目录：`views/`、`components/`、`stores/`、`api/`、`types/`
- [x] 4.3 定义 TypeScript 类型：`Story`、`Character`、`Session`、`Message`、`SandboxState`
- [x] 4.4 实现 `api/` 客户端：基于 `fetch` + `ReadableStream` **手动解析 SSE**（支持 POST、自定义 Header、可中断），封装为 `streamChat(payload, { onToken, signal })`；可选引入 `@microsoft/fetch-event-source` 兜底
- [x] 4.5 实现 `stores/stories.ts`、`stores/characters.ts`、`stores/session.ts`
- [x] 4.6 实现 `views/StoriesView`：故事列表、创建/编辑/删除对话框
- [x] 4.7 实现 `views/StoryDetailView`：故事详情 + 人物列表 + 人物编辑
- [x] 4.8 实现 `views/SandboxView`：对话流（A/B/用户消息气泡）、开始/暂停/继续/重置/注入事件按钮、停止生成按钮
- [x] 4.9 实现 `components/MessageBubble`、`components/CharacterCard`、`components/EventInjector`
- [x] 4.10 实现 `views/SettingsView`：API Key、baseUrl、当前 DB 驱动只读显示
- [x] 4.11 编写前端组件测试（vitest + @vue/test-utils），重点覆盖 SSE 解析与中断

## 5. Electron 桌面壳

- [x] 5.1 使用 `electron-vite` 脚手架，配置 `electron.vite.config.ts`
- [x] 5.2 实现 `electron/main.ts`：创建主窗口、`contextIsolation:true`、`sandbox:true`、`nodeIntegration:false`
- [x] 5.3 实现 `electron/preload.ts`：通过 `contextBridge` 暴露 `ipcRenderer.invoke` 受限接口（`config.get/set`、`dialog.openDataDir`、`db.status`）
- [x] 5.4 **prod 启动链路**：`spawnServer.ts` → fork Nest → 轮询 `/health` → `loadURL`；**不再依赖 `docker compose`**
- [x] 5.5 **dev 启动链路**：可选脚本 `db:up`（`docker compose up -d mysql`），由开发者手动启动；Electron dev 模式仅依赖后端
- [x] 5.6 实现 `electron/config.ts`：在 `<userData>/config.json` 读写配置（API Key、baseUrl、dbClient 强制 prod=sqlite）
- [x] 5.7 实现首次启动引导：缺少 API Key 时打开设置窗口；DB 不就绪时直接报错退出（prod 不应发生）
- [x] 5.8 实现菜单（File / Edit / View / Help）与开发者工具快捷键
- [x] 5.9 配置 `electron-builder`：`nsis`(win) + `dmg`(mac) + 资源包含 `dist-web/`、`server-dist/`；**不打包 `docker/`**；使用 better-sqlite3 需在打包前 `@electron/rebuild`

## 6. 集成与端到端验证

- [x] 6.1 启动 dev 模式（`docker compose up -d mysql` + Nest + Vite HMR + Electron），确认窗口加载、无白屏
- [x] 6.2 走通完整闭环：创建故事 → 创建两个人物 → 启动沙盒 → 观察 A/B 自动对话（事件驱动） → 注入事件 → 用户介入发言 → 停止生成（SSE 中断）→ 重置
- [x] 6.3 关闭并重开应用，确认数据持久化（dev=MySQL named volume / prod=SQLite 单文件）与历史恢复
- [x] 6.4 替换测试 minimax baseUrl/Key 验证 LLM 真实调用
- [x] 6.5 打包 Windows 安装包并安装运行，验证生产模式（无 Docker 依赖，prod 走 SQLite）

## 7. 文档与交付

- [x] 7.1 编写 `README.md`：技术栈、目录结构、开发/打包命令、**明确 dev/prod 数据库差异**、Nest 启动注意事项
- [x] 7.2 编写 `docs/USAGE.md`：使用流程与界面截图占位
- [x] 7.3 编写 `docs/ARCHITECTURE.md`：模块划分与数据流、双轨 DB 说明、Nest 模块拓扑
- [x] 7.4 提供示例 `config.example.json` 与 `docker/.env.example`
- [x] 7.5 编写 `docs/BACKUP.md`：dev 模式 `mysqldump` 备份与恢复；prod 模式直接拷贝 SQLite 文件
- [x] 7.6 列出已知限制（Open Questions 中的待定项）与 NestJS 装饰器/tsconfig 注意点
