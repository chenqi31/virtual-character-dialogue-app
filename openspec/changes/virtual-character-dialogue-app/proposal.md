## Why

用户需要一个轻量级的桌面应用来创建和体验由大模型驱动的虚拟人物对话场景。当前缺少一个让用户能够自定义故事背景与人物设定、并观察/参与虚拟人物之间"自主交流"或与用户互动的工具。通过桌面应用形态（Electron）打包，使用户可在本地离线使用，必要时再调用大模型接口（minimax）生成对话内容。

## What Changes

- 新增桌面应用（Electron 壳 + Vite + Vue 3 前端 + NestJS 后端）的整体工程骨架。
- 引入"故事背景与人物设定"管理能力：用户可增删改查故事场景与人物卡片（名称、人设、性格、初始关系等）。
- 引入"虚拟人物沙盒"：两个虚拟角色能够在系统编排下轮流生成对话（角色 A 发言 → 角色 B 回应），形成可观察的连续剧情。
- 引入"用户与虚拟角色互动"：用户以"第三方"身份进入对话，对任一角色发言，两个角色能够理解上下文并继续互动。
- 后端代理大模型接口（minimax），统一管理 API Key、提示词模板、上下文窗口与限流。
- 持久化：本地文件/SQLite 存储故事、人物、对话历史；窗口关闭后下次打开仍可恢复。

## Capabilities

### New Capabilities

- `character-and-story-management`: 故事背景与人物设定的管理（创建/编辑/删除/列表/详情）。
- `sandbox-dialogue`: 虚拟人物沙盒：两个角色之间自动轮流对话，支持开始/暂停/继续/重置。
- `interactive-dialogue`: 用户作为第三方参与，与任一虚拟角色对话，所有对话可被两个角色在沙盒中感知。
- `llm-proxy`: 后端代理 minimax 大模型接口，负责提示词拼装、上下文裁剪、流式响应与限流。
- `desktop-shell`: Electron 桌面壳：主进程、渲染进程、本地文件/配置管理、菜单与托盘。
- `data-persistence`: 本地数据持久化（SQLite/JSON），保存故事、人物、会话与历史消息。

### Modified Capabilities

（暂无现有规范被修改。）

## Impact

- 新增技术栈：Electron、Vite、Vue 3、Pinia、Vue Router、Node.js (NestJS)、TypeORM、better-sqlite3、minimax HTTP 客户端（fetch/axios）。
- 新增工程目录：
  - `electron/`：主进程、预加载脚本、构建配置（electron-builder / electron-vite）。
  - `web/`：Vite + Vue 3 渲染层。
  - `server/`：NestJS 后端，提供 LLM 代理 REST/SSE 接口、本地数据 API。
- 依赖：minimax 大模型接口凭据（环境变量或用户在设置中配置），首次运行需联网。
- 桌面平台目标：Windows / macOS（Linux 可选），打包为可分发的桌面安装包。
- 不会影响任何外部系统（本应用为独立桌面应用）。
