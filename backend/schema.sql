DROP TABLE IF EXISTS messages;

CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nickname TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at INTEGER NOT NULL,  -- 送信時のUNIXタイムスタンプ（秒）
    expires_at INTEGER NOT NULL   -- 消滅する予定のUNIXタイムスタンプ（秒）
);

-- 検索や削除（Cron）のパフォーマンス向上のため、インデックスを貼っておきます
CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON messages(expires_at);