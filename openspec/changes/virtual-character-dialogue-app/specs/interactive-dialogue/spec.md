## ADDED Requirements

### Requirement: 用户可作为第三方发言
系统 SHALL 允许用户进入任一会话，作为第三方对角色 A 或角色 B 发言。

#### Scenario: 用户发言并指定目标角色
- **WHEN** 用户在某会话中发送文本并选择目标角色
- **THEN** 系统以 user 角色写入历史，并向目标角色发起大模型调用生成回复

#### Scenario: 沙盒模式下用户发言暂停调度
- **WHEN** 沙盒处于 running 且用户发言
- **THEN** 系统在生成用户回复期间暂停自动调度，回复完成后再恢复

### Requirement: 另一角色能感知用户对话
系统 SHALL 让非用户目标角色在下一轮中感知到用户的发言并自然接话。

#### Scenario: 用户对 A 发言后 B 自然接话
- **WHEN** A 已回复用户
- **THEN** 系统在下一轮调度 B 时将用户消息与 A 的回复一起纳入上下文，B 生成的回复体现对前文的感知

### Requirement: 用户可清空上下文
系统 SHALL 允许用户清空某会话的历史消息，但保留人物与故事设定。

#### Scenario: 清空上下文
- **WHEN** 用户触发清空
- **THEN** 系统删除该会话全部 messages 记录，状态回到 idle

### Requirement: 用户可停止正在生成的回复
系统 SHALL 允许用户取消当前正在进行的流式生成。

#### Scenario: 取消生成
- **WHEN** 用户在前端点击"停止"
- **THEN** 前端通过 `AbortController` 中止 fetch；后端在 `req.on('close')` 时调用 `LlmClient` 的 abort 中止上游 LLM 请求；已写入数据库的部分内容回滚或标记截断
