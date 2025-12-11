-- Создание таблицы системных уведомлений для администраторов
CREATE TABLE IF NOT EXISTS t_p80499285_psot_realization_pro.system_notifications (
    id SERIAL PRIMARY KEY,
    notification_type VARCHAR(50) NOT NULL, -- 'error', 'warning', 'info', 'success'
    severity VARCHAR(20) NOT NULL DEFAULT 'info', -- 'low', 'medium', 'high', 'critical'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    page_url VARCHAR(500),
    page_name VARCHAR(255),
    user_id INTEGER REFERENCES t_p80499285_psot_realization_pro.users(id),
    user_fio VARCHAR(255),
    user_position VARCHAR(255),
    organization_id INTEGER REFERENCES t_p80499285_psot_realization_pro.organizations(id),
    organization_name VARCHAR(255),
    action_type VARCHAR(100), -- 'login', 'file_upload', 'pab_create', 'error', etc.
    error_details TEXT,
    stack_trace TEXT,
    metadata JSONB, -- Дополнительные данные
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

-- Индексы для быстрого поиска
CREATE INDEX idx_system_notifications_type ON t_p80499285_psot_realization_pro.system_notifications(notification_type);
CREATE INDEX idx_system_notifications_created ON t_p80499285_psot_realization_pro.system_notifications(created_at DESC);
CREATE INDEX idx_system_notifications_user ON t_p80499285_psot_realization_pro.system_notifications(user_id);
CREATE INDEX idx_system_notifications_org ON t_p80499285_psot_realization_pro.system_notifications(organization_id);
CREATE INDEX idx_system_notifications_read ON t_p80499285_psot_realization_pro.system_notifications(is_read);

COMMENT ON TABLE t_p80499285_psot_realization_pro.system_notifications IS 'Системные уведомления для администраторов о всех событиях и ошибках в системе';