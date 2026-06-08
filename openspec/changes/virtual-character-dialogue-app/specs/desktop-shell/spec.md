## ADDED Requirements

### Requirement: Electron 主进程管理窗口
系统 SHALL 在 Electron 主进程中创建主窗口、菜单与本地服务子进程。

#### Scenario: 启动主窗口
- **WHEN** 应用启动
- **THEN** 主进程创建 BrowserWindow 并加载本地前端入口

### Requirement: 主进程托管本地 Nest 服务
系统 SHALL 在主窗口创建之前 fork 本地 NestJS 后端，等待健康检查通过后再加载前端。

#### Scenario: 等待后端健康
- **WHEN** 主进程启动后端
- **THEN** 主进程轮询 `http://127.0.0.1:7001/health`，200 后再 loadURL 前端

#### Scenario: 后端启动失败提示
- **WHEN** 后端在超时时间内未返回 200
- **THEN** 主进程显示错误对话框并退出

### Requirement: prod 启动不依赖 Docker
系统 SHALL 在打包后的桌面端（prod 模式）使用 better-sqlite3，**不依赖用户机器安装 Docker**。

#### Scenario: prod 首次启动
- **WHEN** 用户在未安装 Docker 的机器上双击安装好的桌面应用
- **THEN** 应用正常启动，SQLite 文件创建在 `<userData>/app.db`，主窗口加载

#### Scenario: dev 模式容器为可选前置
- **WHEN** 开发者执行 `npm run dev:server` 且未启动 MySQL 容器
- **THEN** 后端启动失败并打印明确指引（`npm run db:up`），由开发者手动决定是否启动

### Requirement: 预加载脚本暴露受限 IPC
系统 SHALL 通过 preload 暴露受限的 IPC 能力（如打开文件、读写配置、查询 DB 状态），不直接暴露 `nodeIntegration`。

#### Scenario: 上下文隔离启用
- **WHEN** 主窗口创建
- **THEN** `contextIsolation: true`、`nodeIntegration: false`、`sandbox: true` 全部开启

### Requirement: 本地配置管理
系统 SHALL 在用户数据目录管理应用配置（API Key、数据目录、主题等）。

#### Scenario: 读写配置
- **WHEN** 应用需要读取/更新配置
- **THEN** 主进程访问 `<userData>/config.json` 并返回最新值

#### Scenario: 首次启动引导
- **WHEN** 配置文件不存在或缺少 API Key
- **THEN** 应用显示引导界面要求用户填写

### Requirement: 打包与更新
系统 SHALL 通过 electron-builder 打包为桌面安装包；**不**在安装包中包含 Docker/MySQL 镜像。

#### Scenario: 打包成功
- **WHEN** 执行 `npm run build:win`（或 mac）
- **THEN** 生成可分发的安装包，安装包内仅含前端 dist、后端 dist 与 better-sqlite3 native 模块（已 rebuild）

#### Scenario: 安装包体积可接受
- **WHEN** 打包完成
- **THEN** 安装包体积受 better-sqlite3 native 模块影响，单平台 < 50MB（不含 LLM 模型/镜像）
