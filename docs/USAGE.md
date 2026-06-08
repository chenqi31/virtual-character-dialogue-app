# 使用流程

## 1. 启动 dev

```bash
npm install
cp .env.example .env  # 填入 MINIMAX_API_KEY
npm run dev
```

`npm run dev` 会顺次拉起：
- Docker MySQL（`docker compose up -d mysql`）
- Nest 后端（`http://127.0.0.1:7001`）
- Vite 前端（`http://127.0.0.1:5173`）
- Electron 窗口（自动加载 Vite HMR）

## 2. 创建故事与人物

1. 在「故事列表」页点击「+ 新建故事」，填入标题与背景。
2. 进入故事详情，点击「+ 新建人物」，至少创建两位（人设要有所区分）。
3. 在「启动沙盒」选择角色 A、B，点击「进入沙盒」。

## 3. 沙盒对话

- **开始**：A 先发言，B 自动接话，循环直到达到 `maxRounds`（默认 20）。
- **暂停 / 继续**：随时暂停。
- **重置**：清空消息、回到 idle。
- **注入事件**：在下一轮生成前加入 system 提示（剧情锚点）。
- **用户介入**：在底部选择对 A 还是 B 说话，发送。
- **停止生成**：在生成过程中点击「停止」会中断 SSE，上游 LLM 也会被中止。

## 4. 设置

- 在「设置」页查看/修改 API Key、baseUrl。
- 桌面端会把配置写入 `<userData>/config.json`（dev 下仅写到 localStorage 草稿）。

## 5. 数据位置

| 模式 | 位置 |
|---|---|
| dev | `docker volume virtual_chat_mysql_data`（MySQL 数据） |
| prod | `<userData>/app.db`（SQLite 单文件） |
| 配置 | `<userData>/config.json` |
