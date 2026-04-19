
CREATE TABLE IF NOT EXISTS t_p80499285_psot_realization_pro.sessions (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(128) NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address VARCHAR(64),
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON t_p80499285_psot_realization_pro.sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON t_p80499285_psot_realization_pro.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON t_p80499285_psot_realization_pro.sessions(expires_at);
