# 备份与恢复

## dev 模式（MySQL）

数据位于 Docker named volume `virtual_chat_mysql_data`，由 `docker/docker-compose.yml` 自动创建。

```bash
# 导出
docker exec virtual-chat-mysql sh -c 'exec mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" virtual_chat' > backup-$(date +%Y%m%d).sql

# 恢复
cat backup-20260608.sql | docker exec -i virtual-chat-mysql sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" virtual_chat'
```

## prod 模式（SQLite）

数据位于 `<userData>/app.db`，单文件。

| 平台 | userData 路径 |
|---|---|
| Windows | `%APPDATA%\VirtualCharacterDialogue\app.db` |
| macOS | `~/Library/Application Support/VirtualCharacterDialogue/app.db` |
| Linux | `~/.config/VirtualCharacterDialogue/app.db` |

```bash
# 备份：直接复制
cp "$APPDATA/VirtualCharacterDialogue/app.db" backup-$(date +%Y%m%d).db

# 恢复：替换文件后重启应用
cp backup-20260608.db "$APPDATA/VirtualCharacterDialogue/app.db"
```

## 凭据

API Key 存放于 `<userData>/config.json`，**不进 git**。建议在 CI 之外单独保管；跨机器迁移时记得导出。
