import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 首版 schema。dev（mysql）使用 InnoDB + utf8mb4 + 外键级联；
 * prod（sqlite）使用同一逻辑（外键 pragma 需在连接初始化时打开）。
 */
export class Init1700000000000 implements MigrationInterface {
  name = 'Init1700000000000';

  public async up(qr: QueryRunner): Promise<void> {
    const isMysql = qr.connection.options.type === 'mysql';

    if (isMysql) {
      await qr.query(`
        CREATE TABLE \`stories\` (
          \`id\` BIGINT NOT NULL AUTO_INCREMENT,
          \`title\` VARCHAR(200) NOT NULL,
          \`background\` TEXT NOT NULL,
          \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          KEY \`idx_stories_title\` (\`title\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    } else {
      await qr.query(`
        CREATE TABLE "stories" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "title" VARCHAR(200) NOT NULL,
          "background" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await qr.query(`CREATE INDEX "idx_stories_title" ON "stories"("title");`);
    }

    // characters
    if (isMysql) {
      await qr.query(`
        CREATE TABLE \`characters\` (
          \`id\` BIGINT NOT NULL AUTO_INCREMENT,
          \`storyId\` BIGINT NOT NULL,
          \`name\` VARCHAR(100) NOT NULL,
          \`persona\` TEXT NOT NULL,
          \`traits\` JSON NOT NULL,
          \`initialRelation\` TEXT NOT NULL,
          \`avatar\` VARCHAR(500) NULL,
          \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`uk_char_story_name\` (\`storyId\`, \`name\`),
          KEY \`idx_char_story\` (\`storyId\`),
          CONSTRAINT \`fk_char_story\` FOREIGN KEY (\`storyId\`) REFERENCES \`stories\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    } else {
      await qr.query(`
        CREATE TABLE "characters" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "storyId" INTEGER NOT NULL,
          "name" VARCHAR(100) NOT NULL,
          "persona" TEXT NOT NULL,
          "traits" TEXT NOT NULL DEFAULT '[]',
          "initialRelation" TEXT NOT NULL DEFAULT '',
          "avatar" VARCHAR(500) NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE ("storyId", "name"),
          FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE
        );
      `);
      await qr.query(`CREATE INDEX "idx_char_story" ON "characters"("storyId");`);
    }

    // sessions
    if (isMysql) {
      await qr.query(`
        CREATE TABLE \`sessions\` (
          \`id\` BIGINT NOT NULL AUTO_INCREMENT,
          \`storyId\` BIGINT NOT NULL,
          \`charAId\` BIGINT NOT NULL,
          \`charBId\` BIGINT NOT NULL,
          \`mode\` VARCHAR(20) NOT NULL DEFAULT 'sandbox',
          \`state\` VARCHAR(20) NOT NULL DEFAULT 'idle',
          \`maxRounds\` INT NOT NULL DEFAULT 20,
          \`currentRound\` INT NOT NULL DEFAULT 0,
          \`nextSpeaker\` BIGINT NULL,
          \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          KEY \`idx_sess_story\` (\`storyId\`),
          KEY \`idx_sess_next_speaker\` (\`nextSpeaker\`),
          CONSTRAINT \`fk_sess_story\` FOREIGN KEY (\`storyId\`) REFERENCES \`stories\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    } else {
      await qr.query(`
        CREATE TABLE "sessions" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "storyId" INTEGER NOT NULL,
          "charAId" INTEGER NOT NULL,
          "charBId" INTEGER NOT NULL,
          "mode" VARCHAR(20) NOT NULL DEFAULT 'sandbox',
          "state" VARCHAR(20) NOT NULL DEFAULT 'idle',
          "maxRounds" INTEGER NOT NULL DEFAULT 20,
          "currentRound" INTEGER NOT NULL DEFAULT 0,
          "nextSpeaker" INTEGER NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("storyId") REFERENCES "stories"("id") ON DELETE CASCADE
        );
      `);
      await qr.query(`CREATE INDEX "idx_sess_story" ON "sessions"("storyId");`);
      await qr.query(`CREATE INDEX "idx_sess_next_speaker" ON "sessions"("nextSpeaker");`);
    }

    // messages
    if (isMysql) {
      await qr.query(`
        CREATE TABLE \`messages\` (
          \`id\` BIGINT NOT NULL AUTO_INCREMENT,
          \`sessionId\` BIGINT NOT NULL,
          \`role\` VARCHAR(20) NOT NULL,
          \`target\` VARCHAR(10) NULL,
          \`content\` MEDIUMTEXT NOT NULL,
          \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          KEY \`idx_msg_session\` (\`sessionId\`, \`id\`),
          CONSTRAINT \`fk_msg_session\` FOREIGN KEY (\`sessionId\`) REFERENCES \`sessions\` (\`id\`) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
    } else {
      await qr.query(`
        CREATE TABLE "messages" (
          "id" INTEGER PRIMARY KEY AUTOINCREMENT,
          "sessionId" INTEGER NOT NULL,
          "role" VARCHAR(20) NOT NULL,
          "target" VARCHAR(10) NULL,
          "content" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE
        );
      `);
      await qr.query(`CREATE INDEX "idx_msg_session" ON "messages"("sessionId", "id");`);
    }
  }

  public async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS "messages"`);
    await qr.query(`DROP TABLE IF EXISTS "sessions"`);
    await qr.query(`DROP TABLE IF EXISTS "characters"`);
    await qr.query(`DROP TABLE IF EXISTS "stories"`);
  }
}
