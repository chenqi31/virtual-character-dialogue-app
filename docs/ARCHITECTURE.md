# 架构

## 模块拓扑

```
electron (main)
  └── spawnServer ──> NestJS (port 7001)
                          ├── ConfigModule (全局)
                          ├── TypeOrmModule (动态 forRoot：mysql | sqlite)
                          ├── StorageModule ─> Storage 接口 ─> TypeOrmStorageService
                          ├── StoriesModule      ─ /api/stories
                          ├── CharactersModule   ─ /api/characters
                          ├── SessionsModule     ─ /api/sessions
                          ├── MessagesModule      ─ /api/messages
                          ├── LlmModule           ─ /api/llm/chat (SSE)
                          ├── SandboxModule       ─ /api/sandbox
                          ├── HealthModule        ─ /health
                          ├── ThrottlerModule     ─ 60 req/min/IP
                          └── EventEmitterModule  ─ 沙盒 A.replied / B.replied
        │
        └── BrowserWindow
              └── Vue 3 (Vite)
                    ├── Pinia stores (stories / characters / session)
                    ├── api/http.ts (REST)
                    └── api/sse.ts (fetch + ReadableStream)
```

## 数据流（一次沙盒轮）

1. 用户 POST `/api/sandbox { action: 'start' }`。
2. `SandboxService` 写 `state=running`，emit `A.replied`。
3. `A.replied` 监听器触发 `runOneTurn(sessionId, 'a')`：
   - 读 story / self / peer / history
   - `PromptBuilder` 拼系统提示 + 裁剪历史
   - `LlmClient.stream()` 流式请求
   - 累积到 buffer，落库 `messages(role=char_a)`
   - `incrementRound` → 若达 maxRounds，state=ended
   - emit `B.replied`
4. `B.replied` 监听器再触发 `runOneTurn(sessionId, 'b')`，循环。
5. 任何 LLM 错误 → state=paused，留给用户恢复。

## 双轨 DB

- `TypeOrmModule.forRootAsync` 根据 `DB_TYPE` 注入 `mysql` 或 `better-sqlite3`。
- 业务层只通过 `Storage` 接口编程（Nest 注入 `Storage` 抽象），与驱动解耦。
- prod 不依赖 Docker：Electron 启动时 `spawnServer` 设置 `DB_TYPE=sqlite`、`DB_SQLITE_PATH=<userData>/app.db`。

## LLM 调用（minimax）

- HTTP：`POST {MINIMAX_BASE_URL}/chat/completions`，`Authorization: Bearer ${MINIMAX_API_KEY}`，`stream: true`。
- 解析 SSE：`{ type: 'delta' | 'done' | 'error' }`。
- 中断：`LlmStream.abort()` → `AbortController.abort()` → fetch 抛 AbortError。

## 前端 SSE

- 工具：`api/sse.ts` 暴露 `streamChat(url, body, handlers)`，基于 `fetch + ReadableStream` 手动解析。
- 返回 `StreamHandle.abort()`，UI 在卸载或用户点击停止时调用。
