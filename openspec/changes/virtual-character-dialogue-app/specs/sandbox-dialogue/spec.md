## ADDED Requirements

### Requirement: 沙盒会话初始化
系统 SHALL 允许用户在一个故事中选定两个虚拟人物创建沙盒会话。

#### Scenario: 创建沙盒会话
- **WHEN** 用户提供故事 ID 与两个不同的人物 ID
- **THEN** 系统创建会话并返回会话 ID

#### Scenario: 拒绝相同人物
- **WHEN** 用户为沙盒提供相同的两个人物 ID
- **THEN** 系统返回 400 错误

### Requirement: 沙盒自动轮流对话
系统 SHALL 在沙盒启动后让两个角色按顺序自动生成对话，调度使用**事件驱动**模型（A 完成后触发 B 开始，而非轮询）。

#### Scenario: 角色 A 率先发言
- **WHEN** 用户启动沙盒
- **THEN** 系统调用大模型生成角色 A 的第一条消息并写入历史

#### Scenario: 角色 B 由 A 的完成事件触发
- **WHEN** 角色 A 的消息生成完成
- **THEN** 系统监听 `A.replied` 事件，调度 B 的生成；B 完成后发射 `B.replied` 事件

#### Scenario: 达到轮次上限自动停止
- **WHEN** 沙盒累计发言达到配置上限（默认 20）
- **THEN** 系统将状态置为 ended 并停止订阅调度事件

### Requirement: 沙盒可暂停/继续/重置
系统 SHALL 提供对沙盒会话的暂停、继续与重置控制。

#### Scenario: 暂停沙盒
- **WHEN** 用户在沙盒运行中触发暂停
- **THEN** 系统停止下一次调度，状态置为 paused

#### Scenario: 继续沙盒
- **WHEN** 用户在 paused 状态下触发继续
- **THEN** 系统恢复调度，状态回到 running

#### Scenario: 重置沙盒
- **WHEN** 用户触发重置
- **THEN** 系统清空该会话所有历史消息并回到 idle

### Requirement: 沙盒可注入事件
系统 SHALL 允许用户向沙盒注入一条"事件/话题"，作为下一轮 system 提示的附加上下文。

#### Scenario: 注入事件
- **WHEN** 用户提交一条事件文本
- **THEN** 系统在下一轮生成前将该事件拼入 system 提示并保留为 system 角色消息
