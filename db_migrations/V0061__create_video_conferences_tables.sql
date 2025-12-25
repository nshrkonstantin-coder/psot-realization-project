-- Создание таблицы для видеоконференций
CREATE TABLE IF NOT EXISTS video_conferences (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    creator_id INTEGER NOT NULL,
    creator_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended')),
    ended_at TIMESTAMP,
    duration INTEGER
);

-- Создание таблицы для участников конференций
CREATE TABLE IF NOT EXISTS video_conference_participants (
    conference_id VARCHAR(100) NOT NULL,
    user_id INTEGER NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_favorite BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (conference_id, user_id)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_video_conferences_status ON video_conferences(status);
CREATE INDEX IF NOT EXISTS idx_video_conferences_creator ON video_conferences(creator_id);
CREATE INDEX IF NOT EXISTS idx_video_conference_participants_user ON video_conference_participants(user_id);