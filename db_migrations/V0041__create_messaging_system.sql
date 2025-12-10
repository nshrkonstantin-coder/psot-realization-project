-- Создание таблицы чатов
CREATE TABLE chats (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    company_id INTEGER,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);

-- Создание таблицы участников чатов
CREATE TABLE chat_participants (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    company_id INTEGER NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    CONSTRAINT unique_chat_user UNIQUE(chat_id, user_id)
);

-- Создание таблицы сообщений
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    sender_company_id INTEGER NOT NULL,
    message_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT false,
    is_removed BOOLEAN DEFAULT false
);

-- Создание таблицы межкорпоративных связей
CREATE TABLE intercorp_connections (
    id SERIAL PRIMARY KEY,
    company1_id INTEGER NOT NULL,
    company2_id INTEGER NOT NULL,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    CONSTRAINT unique_company_pair UNIQUE(company1_id, company2_id)
);

-- Индексы для быстрого поиска
CREATE INDEX idx_messages_chat ON messages(chat_id);
CREATE INDEX idx_messages_time ON messages(created_at);
CREATE INDEX idx_participants_user ON chat_participants(user_id);
CREATE INDEX idx_participants_chat ON chat_participants(chat_id);
CREATE INDEX idx_chats_company ON chats(company_id);
