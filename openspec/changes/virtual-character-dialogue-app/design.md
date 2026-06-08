## Context

本变更旨在从零搭建一个由大模型驱动的虚拟人物对话桌面应用。当前 `E:\自研\try-ai` 目录下除 OpenSpec 变更外无既有代码。

约束：
- 前端：Vite + Vue 3（Composition API + `<script setup>`），状态管理用 Pinia，路由用 Vue Router。
- 后端：**NestJS 10**（基于 Express 或 Fastify，模块化、DI、装饰器，对 TypeScript 一等支持；替代原 Egg.js 选型以获得更现代的开发体验与更稳的类型推导）。
- 桌面壳：Electron（main 进程负责窗口/菜单/本地 IO；renderer 进程承载 Vue 应用；preload 暴露受限 IPC）。
- 大模型：minimax 接口（OpenAI 兼容 chat completions 风格），后端统一代理。
- 数据：**双轨方案**。dev 环境 = Docker MySQL 8（`mysql2` + TypeORM 或 Knex + `@nestjs/typeorm`）；prod 环境（打包后的桌面端）= `better-sqlite3` 单文件（零安装、零依赖）。后端通过 `Storage` 抽象接口屏蔽差异。
- 部署目标：dev 时 MySQL 监听 `127.0.0.1:3306`、Nest 监听 `127.0.0.1:7001`、Electron 加载 `http://localhost:5173`；prod 时 Electron 启动本地 Nest（prod 走 SQLite）+ 加载 `dist/index.html`，**不再依赖 Docker**。

利益相关方：终端用户（自己玩故事）、后续开发者（维护/扩展）。

## Goals / Non-Goals

**Goals:**
- 提供桌面应用形态的"虚拟人物对话"体验。
- 故事/人物的本地化管理（CRUD）。
- 两个虚拟角色在沙盒中自主轮流对话（受用户控制：开始/暂停/重置/注入事件）。
- 用户可以第三身份介入，与任一角色对话。
- 前后端职责清晰：UI 渲染在 Electron renderer，对话编排与 LLM 代理在 Nest 后端。
- 桌面端安装包对最终用户零依赖：不需要 Docker、不需要手动启服务。
- 后端 TypeScript 体验良好，类型与依赖注入贯穿业务层。

**Non-Goals:**
- 不做账号体系、多人协作、云同步。
- 不做语音/视频/图像生成。
- 不做移动端。
- 不做插件市场、角色社区分享（首版仅本地）。
- 不在 prod 打包镜像或便携 MySQL 二进制（首版直接用 better-sqlite3，避免 ~200MB 资源占用与用户机器差异）。
- 不在 Nest 上做微服务拆分（单进程足够）。

## Decisions

### 1. 进程拓扑：Electron main + renderer + Nest 后端
- **选择**：Electron 启动时由 main 进程 fork 一个本地 NestJS 服务（端口 7001），renderer 通过 preload 暴露的 `ipcRenderer.invoke` 调用本地 HTTP API；同时直接 `fetch('http://127.0.0.1:7001/...')` 用于流式响应。
- **理由**：把 LLM 凭据、DB 访问隔离在本地后端，渲染层只关心 UI；Nest 模块化与 DI 便于扩展业务边界。
- **替代方案**：纯 Web 打包为 PWA → 拒绝：用户明确要求"桌面应用"。
- **替代方案**：Electron + 主进程直接调 LLM → 拒绝：主进程承担业务逻辑易膨胀，且难以复用。

### 2. 框架选型：NestJS（替代 Egg.js）
- **选择**：NestJS 10 + `@nestjs/platform-express`（或 fastify，看性能需要）。
- **理由**：
  - 一等 TypeScript 支持（官方 TS 模板、装饰器元数据、SWC 构建）。
  - 模块化 + DI 容器，业务边界（Stories / Characters / Sessions / Messages / Sandbox / Llm / Health）天然对应 Nest Module。
  - 生态成熟：与 `@nestjs/typeorm`、`@nestjs/config`、`@nestjs/event-emitter`、`@nestjs/throttler`、`@nestjs/terminus` 等官方/社区包天然集成。
  - SSE 流式：可通过 `@Sse()` 装饰器 + `Observable<MessageEvent>` 一行实现。
  - 对比 Egg.js：Egg 官方 TS 处于半废弃、`egg-ts-helper` 类型推导不稳，Node 新人更易踩坑。
- **代价**：
  - Nest 启动比 Egg 略慢（数百 ms），桌面应用可忽略。
  - 装饰器/DI 风格对纯 JS 背景的人有一周学习成本。
  - 依赖更多（`reflect-metadata`、`class-validator`、`class-transformer`）。
- **替代方案**：保留 Egg.js → 拒绝：用户在评估后倾向 NestJS。
- **替代方案**：Fastify 原生（裸 `fastify` + 路由）→ 拒绝：缺少结构化项目骨架与守卫/拦截器生态，3 个业务模块后即显凌乱。

### 3. 大模型调用：SSE 流式 + fetch + ReadableStream（前端）
- **选择**：后端 `POST /api/llm/chat` 返回 `Content-Type: text/event-stream`，**前端使用 `fetch` + `ReadableStream.getReader()` 手动解析 SSE**（必要时可换 `@microsoft/fetch-event-source`），逐 token 渲染；中断通过 `AbortController`。
- **理由**：
  - 原生 `EventSource` 只支持 GET、无法携带自定义 Header，与本设计 POST + 鉴权头部不兼容。
  - `fetch` + 流式读取支持 POST、Header、`AbortController`，与后端对齐；流式观感好且天然支持中断。
- **后端**：使用 NestJS 的 `@Sse()` 装饰器返回 `Observable<MessageEvent>`，或在 controller 内 `res.write` 自实现 SSE writer；客户端断开时（`req.on('close')` / `Observable` unsubscribe）调用 `LlmClient` 的 `AbortController.abort()` 节省上游 token。

### 4. 提示词模板：分层拼装 + 基于 token 长度的动态裁剪
- **系统提示词 = 故事背景 + 人物设定（性格/口癖/与对方关系） + 输出格式约束**。
- **用户消息 = 历史 + 当前发言**。
- **裁剪策略**（在 `PromptBuilder` 实现）：
  - 固定保留：系统提示 + 故事背景 + 双方人物设定。
  - 历史按"轮"组织（每轮 = 一条 char_a + 一条 char_b，或 char_* + user）。
  - 优先级：最近 3-5 轮恒保留；超出后用 tokenizer（`gpt-tokenizer` 或 `tiktoken`）或字符数估算总长度，超过模型上下文上限时按时间从远到近丢弃更早轮次；保留"剧情锚点"消息（如 `system` 角色注入的事件）。
  - 暴露 `PromptBuilder.build(session, target)` 单一入口，便于单测。
- **理由**：固定滑窗（条数）会截断关键转折点；token 预算 + 优先级更稳。

### 5. 沙盒调度：状态机 + 事件驱动
- 状态：`idle → running(A_speaking) → running(B_speaking) → paused → ended`。
- **事件驱动**（不使用 `while(true) + setTimeout`）：
  - 通过 `@nestjs/event-emitter` 发布/订阅：`A.replied` → 触发 `B.start()`（间隔防刷屏可由 `setTimeout` 包装一次）。
  - `B.replied` → 触发 `A.start()`。
  - 外部 API：`start/pause/resume/reset/inject` 改写状态后再发射事件。
- **理由**：避免轮询造成的内存泄漏 / 阻塞；中断/异常能干净恢复；Node 单线程友好。
- **持久化**：`sessions` 表的 `state / current_round` 字段在每次状态变更时落库；崩溃后可读出 `running` 状态回退到 `paused`。

### 6. 持久化：双轨 DB（dev=Docker MySQL，prod=SQLite）
- **共同基座**：
  - 表结构用 **TypeORM entities + migration** 表达：`stories / characters / sessions / messages`（dev MySQL 用 InnoDB、utf8mb4、外键 `ON DELETE CASCADE`、`INDEX(session_id, id)`）。
  - 上层 `server/src/storage/` 提供 `Storage` 抽象接口（`createStory / listMessages / ...`），所有 Service 通过接口编程，**不直接调用 `Repository` API**。
  - 数据库驱动由 `ConfigService` 中 `db.type`（`mysql` | `sqlite`）按 `NODE_ENV` 或运行参数切换。
  - 选用 TypeORM 而非 Knex：与 NestJS 集成更深（`TypeOrmModule.forRoot` + `@InjectRepository`），Repository 模式与 Entity 装饰器提供更稳的类型推导；migration 工具齐全。
- **dev**：`docker-compose` 启动 `mysql:8.0`；Nest 通过 `@nestjs/typeorm` 注入 `DataSource`，连接参数从 `ConfigService` 读取；连接重试（`PROTOCOL_CONNECTION_LOST` / `ECONNRESET`）写在 `TypeOrmModule` 工厂与 `OnApplicationBootstrap` 钩子。
- **prod**：`better-sqlite3` 单文件 `<userData>/app.db`，通过 TypeORM 的 sqlite 驱动管理 schema，**禁止**新建第二套连接池。
- **理由**：
  - 用户明确希望 dev 用 Docker MySQL。
  - 但 prod 分发给最终用户时依赖 Docker 不现实（启动慢、占内存、不一定安装），better-sqlite3 零安装、零配置、足够支撑单机小数据量。
  - 通过 `Storage` 抽象 + TypeORM 同时支持两种驱动，业务层零侵入。
- **替代方案**：prod 内置便携 MySQL（`mysqld` 二进制 ~200MB）→ 拒绝：体积大、跨平台打包麻烦、用户机器差异多。
- **替代方案**：完全用 SQLite → 拒绝：用户明确要求 dev 阶段使用 Docker MySQL。
- **代价**：需要在 TypeORM entities 与 migration 中处理 MySQL/SQLite 语法差异（`MEDIUMTEXT` / `JSON` / 自增）；约束在 `Storage` 中只暴露跨方言可用的 API。

### 7. 桌面壳：electron-vite + electron-builder
- 使用 `electron-vite` 脚手架统一 dev/build 配置；主进程用 TS，preload 用 TS。
- 打包：`electron-builder`，目标 `nsis`（Windows）、`dmg`（macOS）。
- **prod 启动链路**（不依赖 Docker）：`spawnServer.ts` → fork Nest → 轮询 `/health` → `loadURL` 前端；`db.type=sqlite`。
- **dev 启动链路**（开发者手动）：`db:up` 启动 Docker MySQL → `dev:server` 启 Nest（`db.type=mysql`）→ `dev:electron` 启 Electron。
- better-sqlite3 是 native 模块，**打包前**必须 `@electron/rebuild`。

### 8. 凭据管理
- minimax API Key 存放在用户数据目录的 `config.json`（首次启动引导填入或读取环境变量 `MINIMAX_API_KEY`）；不进 git。
- Nest 端通过 `@nestjs/config` 加载 `process.env` 与运行时 `ConfigService` 读取。
- **理由**：避免硬编码；方便用户替换。

### 9. NestJS 模块划分
- `AppModule`：根模块，组装以下子模块。
- `ConfigModule`（全局）：从 `.env` + 用户 config 加载 `MINIMAX_API_KEY / DB_TYPE / DB_PATH / PORT`。
- `DatabaseModule`（全局）：根据 `DB_TYPE` 动态 `forRoot`（mysql | sqlite），并在启动时跑 `runMigrations()`。
- `StorageModule`：`Storage` 接口 + TypeORM 实现的 `TypeOrmStorageService`，由 Nest 工厂根据驱动注入。
- `StoriesModule` / `CharactersModule` / `SessionsModule` / `MessagesModule`：CRUD API（`/api/stories`, `/api/characters`, `/api/sessions`, `/api/messages`）。
- `SandboxModule`：`/api/sandbox/*` 端点，订阅 `@nestjs/event-emitter`。
- `LlmModule`：`/api/llm/chat` SSE 端点；`LlmClient`（minimax）、`PromptBuilder`。
- `HealthModule`：`/health` 端点，使用 `@nestjs/terminus` 检查 DB 连接。
- `ThrottlerModule`（全局）：API 限流（默认 60 req/min/IP）。
- `LoggerModule`：统一日志，prod 走文件。

### 10. 迁移工具：TypeORM migrations
- 使用 `typeorm migration:generate / migration:run / migration:revert` 维护 schema；`data-source.ts` 同时配置 dev/prod 双驱动。
- 在 Nest `OnApplicationBootstrap` 钩子中执行 `dataSource.runMigrations()`，幂等。
- 配套 `npm run migration:generate / migration:run / migration:revert` 命令。

## Risks / Trade-offs

- **R1：LLM 速率/费用** → Mitigation：本地加限流（`@nestjs/throttler`，每秒最多 1 次调用）+ 默认每轮 ≤ 60 字 + 提供"停止生成"按钮（SSE 中断上游）。
- **R2：上下文膨胀导致费用失控** → Mitigation：基于 token 预算的动态裁剪（系统提示 + 最近 3-5 轮为硬保留），并提供"清空上下文"操作。
- **R3：沙盒死循环** → Mitigation：单次沙盒最多 N 轮（默认 20，可配置）；事件驱动调度，崩溃/异常可恢复；可加"重复内容"检测收敛。
- **R4：minimax 接口变更/不可用** → Mitigation：HTTP 客户端封装在 `LlmClient` 中，可一行替换 baseUrl；所有 LLM 调用集中。
- **R5：dev 端 Docker 启动顺序** → Mitigation：dev 模式下由开发者手动执行 `npm run db:up`；Electron dev 不强制包含 DB 启动；缺 DB 时 Nest 启动失败给出明确指引。
- **R6：prod 数据迁移（从 SQLite 切到 MySQL）** → Mitigation：短期 prod 仅 SQLite，不做此迁移；若未来要上 MySQL，提供一次性脚本。
- **R7：双驱动 SQL 方言差异** → Mitigation：entities 优先用 `text / integer / datetime` 等跨方言类型；通过 TypeORM `@Column` 类型注解而非裸 SQL；将方言相关差异限制在 entity/migration 文件内。
- **R8：better-sqlite3 native 模块与 Electron ABI 不匹配** → Mitigation：使用 `@electron/rebuild` 在打包前重编译。
- **R9：NestJS 装饰器 / reflect-metadata 元数据丢失** → Mitigation：tsconfig 必须开 `experimentalDecorators / emitDecoratorMetadata`；并在 README 记录；CI 检查构建产物。
- **R10：NestJS 启动慢于 Egg** → Mitigation：桌面场景下首启多 200-400ms 可接受；如未来需要可切到 Fastify 适配器。

## Migration Plan

- **dev**：dev MySQL 通过 TypeORM migrations 维护。
- **prod**：prod SQLite 文件位于 `<userData>/app.db`，同样由 TypeORM migrations 维护；首版只发布 v1 schema。
- **桌面应用更新**：`electron-updater` 走 GitHub Releases 或本地内网。
- **跨驱动备份/恢复**：dev 走 `mysqldump`；prod 直接拷贝 SQLite 文件。

## Open Questions

- minimax 接口的具体鉴权方式（Bearer Token? 签名?）需要用户提供示例或文档；现阶段按 OpenAI 兼容风格实现。
- 是否需要"角色头像"？如需要，文件存到哪里（用户数据目录 `avatars/`）。
- 是否需要导出对话（Markdown / JSON）？本变更先留接口位、不做 UI。
- 若 prod 阶段单 SQLite 不够用，是否切到便携 MySQL？需要看用户量。
- Nest 适配器：Express（生态最广） vs Fastify（性能更好），首版 Express 优先。
