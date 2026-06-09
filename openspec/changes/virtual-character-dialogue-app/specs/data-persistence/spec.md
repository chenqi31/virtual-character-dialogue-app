## ADDED Requirements

### Requirement: 数据由 dev 模式 Docker MySQL 与 prod 模式 SQLite 共同支持
系统 SHALL 在 dev 环境使用 docker-compose 启动的 MySQL 8；在 prod（桌面端打包）环境使用 better-sqlite3 单文件。两种模式通过 `Storage` 抽象接口对外暴露一致 API。

#### Scenario: dev 模式容器启动后数据可访问
- **WHEN** `npm run db:up` 成功，MySQL 监听 127.0.0.1:3307
- **THEN** Nest 后端可通过 `@nestjs/typeorm` 注入的 `DataSource`（底层 `mysql2` 连接池）读写所有表

#### Scenario: prod 模式 SQLite 文件可访问
- **WHEN** 桌面应用首次启动
- **THEN** 系统在 `<userData>/app.db` 创建 SQLite 文件并通过 `Storage` 接口读写所有表

#### Scenario: 重启应用后数据仍在
- **WHEN** 关闭应用并重新打开
- **THEN** dev 模式下数据由 named volume 持久化；prod 模式下数据由 `<userData>/app.db` 持久化；两种模式重启后历史可恢复

#### Scenario: 缺失 Docker 环境时给出明确错误
- **WHEN** 开发者执行 `dev:server` 但 MySQL 容器未启动
- **THEN** Nest 启动失败并打印明确错误（指引执行 `npm run db:up`）

### Requirement: 表结构
系统 SHALL 维护以下表：`stories`、`characters`、`sessions`、`messages`，并启用外键约束（InnoDB 引擎，SQLite 通过外键 pragma）。

#### Scenario: 字段定义
- **WHEN** 应用首次连接
- **THEN** 数据库中存在四张表，字段类型与 design.md 中表结构一致

#### Scenario: 外键级联删除
- **WHEN** 删除一个 story
- **THEN** 该 story 下的 characters / sessions / messages 被级联删除

#### Scenario: 字符集与排序
- **WHEN** 创建 MySQL 表
- **THEN** 表与数据库默认使用 `utf8mb4 / utf8mb4_unicode_ci`

### Requirement: 消息历史查询
系统 SHALL 支持按会话分页查询历史消息，按时间升序返回。

#### Scenario: 分页查询
- **WHEN** 客户端提供 sessionId、limit、beforeId
- **THEN** 系统返回该会话 id 小于 beforeId 的最多 limit 条消息，按 id 升序

#### Scenario: 高效分页
- **WHEN** 同一会话存在大量历史消息
- **THEN** 系统通过 `INDEX(session_id, id)` 在毫秒级返回分页结果

### Requirement: Schema 版本与迁移（TypeORM migrations）
系统 SHALL 使用 TypeORM 的 migration 工具管理 schema，dev 与 prod 驱动共用同一份 entity 源（`@Column` 注解跨方言）。

#### Scenario: 应用新迁移
- **WHEN** Nest 启动时 `dataSource.runMigrations()` 被调用
- **THEN** TypeORM 按顺序执行未应用 migration，并通过 `migrations` 表记录

#### Scenario: 幂等性
- **WHEN** 已应用过的 migration 被再次执行
- **THEN** TypeORM 自动跳过（不需要自造轮子）

### Requirement: 连接池与故障恢复
dev 模式下系统 SHALL 通过 `@nestjs/typeorm` 配置 `mysql2` 连接池，并对瞬时断连进行一次重试。

#### Scenario: 连接池大小
- **WHEN** Nest 启动并连接 MySQL
- **THEN** TypeORM `DataSource` 以 `connectionLimit`（默认 10）建立连接

#### Scenario: 断连重试
- **WHEN** 执行查询时遇到 `PROTOCOL_CONNECTION_LOST` 或 `ECONNRESET`
- **THEN** 系统自动重连一次后重试查询；重试仍失败则返回 5xx 错误

#### Scenario: 禁止双连接池
- **WHEN** 业务代码访问数据库
- **THEN** 统一通过 `Storage` 接口或 Nest 注入的 Repository；**禁止**新建第二套 `mysql2.createPool`

### Requirement: 存储抽象 Storage
系统 SHALL 通过 `server/src/storage/` 暴露统一 `Storage` 接口，业务 Service 不感知具体驱动。

#### Scenario: 切换驱动
- **WHEN** `ConfigService` 中 `db.type` 从 `mysql` 改为 `sqlite`
- **THEN** 业务代码无需改动即可运行（仅需重新迁移一次）
