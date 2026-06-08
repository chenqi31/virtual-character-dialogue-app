## ADDED Requirements

### Requirement: 后端统一代理大模型接口
系统 SHALL 在后端聚合对 minimax 大模型接口的调用，渲染层不直接持有 API Key。

#### Scenario: 渲染层不接触凭据
- **WHEN** 前端调用聊天接口
- **THEN** 请求中不包含任何 API Key 字段，凭据由后端从本地配置读取

### Requirement: 流式响应
系统 SHALL 以 Server-Sent Events 形式将大模型输出流式返回给前端；后端使用 NestJS 的 `@Sse()` 装饰器返回 `Observable<MessageEvent>`。

#### Scenario: SSE 增量
- **WHEN** 大模型返回多个 token
- **THEN** 系统按到达顺序向客户端推送 data: 事件，事件负载为增量文本

#### Scenario: 客户端断开中止上游
- **WHEN** 客户端在生成中关闭连接 / 取消 fetch
- **THEN** Nest 的 `Observable` 取消订阅，`LlmClient` 收到通知并调用 `AbortController.abort()` 中止上游 LLM 请求以节省费用

### Requirement: 提示词拼装
系统 SHALL 根据会话上下文拼装系统提示词，包含故事背景、人物设定与历史裁剪窗口；历史裁剪 SHALL 基于 token 预算动态进行。

#### Scenario: 系统提示词包含人设
- **WHEN** 为角色 A 生成回复
- **THEN** 系统提示词中 SHALL 包含 A 的人设、性格、面向 B 的关系说明

#### Scenario: 历史按 token 预算裁剪
- **WHEN** 历史累计 token 数超过模型上下文上限的预算阈值
- **THEN** 系统按时间从远到近丢弃更早消息；最近 3-5 轮与系统提示词 SHALL 始终保留

#### Scenario: 剧情锚点优先保留
- **WHEN** 存在 `role=system` 的事件注入消息
- **THEN** 系统在裁剪中将其视为锚点，优先保留或在丢弃前注入压缩摘要

### Requirement: 限流
系统 SHALL 在本地限制大模型调用频率，避免误循环造成超额；通过 `@nestjs/throttler` 全局 Guard + 同会话串行锁实现。

#### Scenario: 同会话串行调用
- **WHEN** 同会话内有未完成的大模型调用
- **THEN** 系统拒绝/排队后续调用直到上一次完成

#### Scenario: 全局最小间隔
- **WHEN** 连续两次调用时间间隔小于 200ms
- **THEN** 系统延迟到间隔满足再发起请求

#### Scenario: 全局 API 节流
- **WHEN** 单 IP 在 60 秒内请求超过 60 次
- **THEN** `@nestjs/throttler` 返回 429 Too Many Requests

### Requirement: 可替换的 LLM 客户端
系统 SHALL 将大模型 HTTP 客户端封装为可替换实现，便于切换 baseUrl 与鉴权方式。

#### Scenario: 替换 baseUrl
- **WHEN** 配置文件中的 baseUrl 改变
- **THEN** 系统下次调用使用新地址而不需修改代码

#### Scenario: 与数据库驱动解耦
- **WHEN** 后端运行在 dev（MySQL）或 prod（SQLite）模式
- **THEN** `POST /api/llm/chat` 端点行为一致，与 DB 驱动无关
