-- Добавление полей для Telegram-интеграции
ALTER TABLE t_p80499285_psot_realization_pro.users 
ADD COLUMN telegram_chat_id BIGINT,
ADD COLUMN telegram_username VARCHAR(255),
ADD COLUMN telegram_linked_at TIMESTAMP,
ADD COLUMN telegram_link_code VARCHAR(20) UNIQUE;

-- Индекс для быстрого поиска по chat_id
CREATE INDEX idx_users_telegram_chat_id ON t_p80499285_psot_realization_pro.users(telegram_chat_id);

COMMENT ON COLUMN t_p80499285_psot_realization_pro.users.telegram_chat_id IS 'ID чата Telegram для отправки уведомлений';
COMMENT ON COLUMN t_p80499285_psot_realization_pro.users.telegram_username IS 'Username пользователя в Telegram';
COMMENT ON COLUMN t_p80499285_psot_realization_pro.users.telegram_linked_at IS 'Дата и время привязки Telegram';
COMMENT ON COLUMN t_p80499285_psot_realization_pro.users.telegram_link_code IS 'Временный код для привязки Telegram-аккаунта';